import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Trophy, Clock, CheckCircle, XCircle, Home, Star, Zap, Music, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAuthStore, xpForNextLevel, xpForLevel } from '@/stores/authStore';
import { useAudio } from '@/hooks/useAudio';
import { useDeezer, DeezerTrack } from '@/hooks/useDeezer';

const TOTAL_ROUNDS = 5;
const TIME_PER_ROUND = 30;

// Available genres for variety
const GENRES = ['rapfr', 'pop', 'rock', 'hiphop', 'french', 'hits'];

interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Solo() {
  const navigate = useNavigate();
  const { guestName, stats, addXp, incrementGamesPlayed, incrementCorrectAnswers, updateBestScore, updateStreak, resetStreak } = useAuthStore();
  const { getRandomTracks, loading: loadingTracks, error: deezerError } = useDeezer();

  const [gameState, setGameState] = useState<'ready' | 'loading' | 'playing' | 'result' | 'finished'>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_ROUND);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [songs, setSongs] = useState<DeezerTrack[]>([]);
  const [allTracks, setAllTracks] = useState<DeezerTrack[]>([]); // For generating wrong answers
  const [currentSong, setCurrentSong] = useState<DeezerTrack | null>(null);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('rapfr');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartTimeRef = useRef<number>(0);
  const previousLevel = useRef(stats.level);

  const { isPlaying, setVolume } = useAudio(
    gameState === 'playing' ? currentSong?.previewUrl || null : null,
    { autoplay: true }
  );

  useEffect(() => {
    if (!guestName) {
      navigate('/');
    }
  }, [guestName, navigate]);

  useEffect(() => {
    setVolume(isMuted ? 0 : 1);
  }, [isMuted, setVolume]);

  // Generate 4 answer options (1 correct + 3 wrong) - MORE COMPLEX
  const generateAnswerOptions = useCallback((correctSong: DeezerTrack, allSongs: DeezerTrack[]): AnswerOption[] => {
    // Only show title (not artist) to make it harder
    const correctAnswer: AnswerOption = {
      id: correctSong.id,
      text: correctSong.title,
      isCorrect: true,
    };

    // Strategy: Mix wrong answers from SAME artist + different artists
    // This prevents guessing just by recognizing the voice
    const sameArtistSongs = allSongs.filter(
      s => s.id !== correctSong.id && s.artist === correctSong.artist
    );
    const differentArtistSongs = allSongs.filter(
      s => s.id !== correctSong.id && s.artist !== correctSong.artist
    );

    const wrongAnswers: AnswerOption[] = [];

    // Add 1-2 songs from the same artist if available (makes it tricky!)
    const shuffledSameArtist = shuffleArray(sameArtistSongs);
    const sameArtistCount = Math.min(shuffledSameArtist.length, Math.random() > 0.5 ? 2 : 1);
    for (let i = 0; i < sameArtistCount && wrongAnswers.length < 3; i++) {
      wrongAnswers.push({
        id: shuffledSameArtist[i].id,
        text: shuffledSameArtist[i].title,
        isCorrect: false,
      });
    }

    // Fill remaining slots with different artists
    const shuffledDifferent = shuffleArray(differentArtistSongs);
    for (let i = 0; wrongAnswers.length < 3 && i < shuffledDifferent.length; i++) {
      wrongAnswers.push({
        id: shuffledDifferent[i].id,
        text: shuffledDifferent[i].title,
        isCorrect: false,
      });
    }

    // Combine and shuffle all options
    return shuffleArray([correctAnswer, ...wrongAnswers]);
  }, []);

  const startGame = useCallback(async () => {
    setGameState('loading');
    setScore(0);
    setCorrectAnswers(0);
    setXpEarned(0);
    setLeveledUp(false);
    previousLevel.current = stats.level;
    resetStreak();

    // Fetch more tracks from Deezer (for wrong answers pool)
    const tracks = await getRandomTracks(30, selectedGenre);

    if (tracks.length < 4) {
      // If Deezer fails or not enough tracks, show error
      setGameState('ready');
      return;
    }

    // Select songs for the game
    const gameSongs = tracks.slice(0, TOTAL_ROUNDS);
    setSongs(gameSongs);
    setAllTracks(tracks);
    setGameState('playing');
    setCurrentRound(1);

    // Start first round with fetched tracks
    const song = gameSongs[0];
    setCurrentSong(song);
    setAnswerOptions(generateAnswerOptions(song, tracks));
    setSelectedAnswer(null);
    setTimeRemaining(TIME_PER_ROUND);
    setHasAnswered(false);
    setLastResult(null);
    roundStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stats.level, resetStreak, getRandomTracks, selectedGenre, generateAnswerOptions]);

  const startRound = useCallback((roundIndex: number) => {
    const song = songs[roundIndex];
    setCurrentSong(song);
    setAnswerOptions(generateAnswerOptions(song, allTracks));
    setSelectedAnswer(null);
    setTimeRemaining(TIME_PER_ROUND);
    setHasAnswered(false);
    setLastResult(null);
    roundStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [songs, allTracks, generateAnswerOptions]);

  const handleTimeUp = useCallback(() => {
    if (!hasAnswered) {
      setLastResult({ correct: false, points: 0 });
      setHasAnswered(true);
      updateStreak(false);
      showResult();
    }
  }, [hasAnswered, updateStreak]);

  const showResult = useCallback(() => {
    setGameState('result');
    setTimeout(() => {
      if (currentRound < TOTAL_ROUNDS) {
        setCurrentRound((prev) => prev + 1);
        setGameState('playing');
        startRound(currentRound);
      } else {
        finishGame();
      }
    }, 3000);
  }, [currentRound, startRound]);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate XP: 10 per correct answer + bonus for score
    const baseXp = correctAnswers * 10;
    const bonusXp = Math.floor(score / 100);
    const totalXp = baseXp + bonusXp + 20; // +20 for completing game

    setXpEarned(totalXp);
    addXp(totalXp);
    incrementGamesPlayed();
    incrementCorrectAnswers(correctAnswers);
    updateBestScore(score);

    // Check if leveled up
    if (stats.level > previousLevel.current) {
      setLeveledUp(true);
    }

    setGameState('finished');
  }, [correctAnswers, score, addXp, incrementGamesPlayed, incrementCorrectAnswers, updateBestScore, stats.level]);

  const handleSelectAnswer = useCallback((option: AnswerOption) => {
    if (hasAnswered || !currentSong) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(option.id);

    const responseTime = Date.now() - roundStartTimeRef.current;
    const timeBonus = Math.max(0, Math.floor((1 - responseTime / (TIME_PER_ROUND * 1000)) * 500));

    let points = 0;
    const correct = option.isCorrect;

    if (correct) {
      points = 1000 + timeBonus;
      setCorrectAnswers((prev) => prev + 1);
      updateStreak(true);
    } else {
      updateStreak(false);
    }

    setScore((prev) => prev + points);
    setLastResult({ correct, points });
    setHasAnswered(true);
    showResult();
  }, [hasAnswered, currentSong, updateStreak, showResult]);

  // Genre labels in French
  const genreLabels: Record<string, string> = {
    rapfr: 'Rap FR',
    pop: 'Pop',
    rock: 'Rock',
    hiphop: 'Hip-Hop',
    french: 'Francais',
    hits: 'Hits',
  };

  // Loading screen
  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4 animate-pulse">
            <Music className="w-10 h-10 text-white" />
          </div>
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary-400" />
          <p className="text-neutral-400">Chargement des musiques...</p>
          <p className="text-neutral-500 text-sm mt-2">Powered by Deezer</p>
        </motion.div>
      </div>
    );
  }

  // Ready screen
  if (gameState === 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4">
                <Star className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-display font-bold mb-2">Mode Solo</h1>
              <p className="text-neutral-400">
                {TOTAL_ROUNDS} chansons, {TIME_PER_ROUND}s par manche
              </p>
            </div>

            {/* Deezer error message */}
            {deezerError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 text-red-200 text-sm">
                Erreur de chargement. Reessayez.
              </div>
            )}

            {/* Genre selection */}
            <div className="mb-6">
              <p className="text-neutral-400 text-sm mb-3">Choisis un genre</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedGenre === genre
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white'
                        : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                    }`}
                  >
                    {genreLabels[genre]}
                  </button>
                ))}
              </div>
            </div>

            {/* Player stats */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400">Niveau {stats.level}</span>
                <span className="text-primary-400 font-mono">{stats.xp} XP</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                  style={{
                    width: `${((stats.xp - xpForLevel(stats.level)) / (xpForNextLevel(stats.level) - xpForLevel(stats.level))) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {xpForNextLevel(stats.level) - stats.xp} XP pour niveau {stats.level + 1}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-neutral-400">Parties</p>
                <p className="text-xl font-bold">{stats.gamesPlayed}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-neutral-400">Meilleur score</p>
                <p className="text-xl font-bold text-primary-400">{stats.bestScore}</p>
              </div>
            </div>

            <Button onClick={startGame} className="w-full" size="lg" disabled={loadingTracks}>
              {loadingTracks ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Commencer
                </>
              )}
            </Button>

            <Button variant="ghost" onClick={() => navigate('/')} className="w-full mt-4">
              <Home className="w-5 h-5" />
              Retour
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Finished screen
  if (gameState === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-3xl font-display font-bold mb-2">Partie terminee !</h1>

            {leveledUp && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl p-4 mb-4"
              >
                <Star className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold text-lg">Niveau {stats.level} atteint !</p>
              </motion.div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-neutral-400 text-sm">Score</p>
                <p className="text-4xl font-bold text-primary-400">{score}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400 text-sm">Bonnes reponses</p>
                  <p className="text-2xl font-bold">{correctAnswers}/{TOTAL_ROUNDS}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-neutral-400 text-sm">XP gagnes</p>
                  <p className="text-2xl font-bold text-green-400">+{xpEarned}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
                <Home className="w-5 h-5" />
                Accueil
              </Button>
              <Button onClick={startGame} className="flex-1">
                Rejouer
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Result screen (between rounds)
  if (gameState === 'result' && currentSong) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="text-center">
            <div className="mb-4">
              {lastResult?.correct ? (
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-red-500" />
              )}
            </div>
            <h2 className="text-xl font-heading font-semibold mb-4">
              {lastResult?.correct ? 'Bien joue !' : 'Dommage !'}
            </h2>

            {/* Album cover and info */}
            <div className="mb-4">
              {currentSong.albumCover && (
                <motion.img
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={currentSong.albumCover}
                  alt={currentSong.title}
                  className="w-32 h-32 mx-auto rounded-xl shadow-lg mb-4"
                />
              )}
              <p className="text-2xl font-bold text-primary-400">{currentSong.title}</p>
              <p className="text-lg text-neutral-400">{currentSong.artist}</p>
            </div>
            {lastResult?.correct && (
              <p className="text-green-400 font-bold text-xl">+{lastResult.points} pts</p>
            )}
            <p className="text-neutral-500 mt-4">Prochaine manche...</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-neutral-500 text-sm">Manche</p>
          <p className="font-display font-bold text-2xl">{currentRound}/{TOTAL_ROUNDS}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-neutral-500 text-sm">Score</p>
            <p className="font-mono font-bold text-2xl text-primary-400">{score}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Audio visualizer */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full animate-pulse-glow"></div>
            <div className="flex items-end gap-1 h-12">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-white rounded-full"
                  animate={{ height: isPlaying ? [12, 32, 20, 28, 16][i % 5] : 8 }}
                  transition={{ duration: 0.3, repeat: Infinity, repeatType: 'reverse', delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Timer */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-neutral-400" />
            <span className={`font-mono text-4xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-white'}`}>
              {timeRemaining}s
            </span>
          </div>
          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
              style={{ width: `${(timeRemaining / TIME_PER_ROUND) * 100}%` }}
            />
          </div>
        </div>

        {/* Answer options */}
        <div className="w-full max-w-lg px-4">
          {hasAnswered ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {lastResult?.correct ? (
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-2xl font-bold">+{lastResult.points} pts !</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-500">
                  <XCircle className="w-8 h-8" />
                  <span className="text-xl">Mauvaise reponse</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-3"
            >
              {answerOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={hasAnswered}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                    selectedAnswer === option.id
                      ? option.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : hasAnswered && option.isCorrect
                      ? 'bg-green-500/50 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <span className="text-primary-400 font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option.text}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

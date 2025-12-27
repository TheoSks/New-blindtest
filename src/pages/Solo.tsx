import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Send, Trophy, Clock, CheckCircle, XCircle, Home, Star, Zap } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore, xpForNextLevel, xpForLevel } from '@/stores/authStore';
import { useAudio } from '@/hooks/useAudio';

// Music library
const MUSIC_LIBRARY = [
  { id: '1', title: 'Shape of You', artist: 'Ed Sheeran', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Blinding Lights', artist: 'The Weeknd', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Dance Monkey', artist: 'Tones and I', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', title: 'Someone Like You', artist: 'Adele', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: '5', title: 'Uptown Funk', artist: 'Bruno Mars', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: '6', title: 'Hello', artist: 'Adele', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: '7', title: 'Thinking Out Loud', artist: 'Ed Sheeran', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: '8', title: 'Havana', artist: 'Camila Cabello', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: '9', title: 'Despacito', artist: 'Luis Fonsi', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: '10', title: 'Old Town Road', artist: 'Lil Nas X', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
];

function normalizeString(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

const TOTAL_ROUNDS = 5;
const TIME_PER_ROUND = 30;

export default function Solo() {
  const navigate = useNavigate();
  const { guestName, stats, addXp, incrementGamesPlayed, incrementCorrectAnswers, updateBestScore, updateStreak, resetStreak } = useAuthStore();

  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result' | 'finished'>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_ROUND);
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [songs] = useState(() => [...MUSIC_LIBRARY].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS));
  const [currentSong, setCurrentSong] = useState<typeof MUSIC_LIBRARY[0] | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);

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

  const startGame = useCallback(() => {
    setGameState('playing');
    setCurrentRound(1);
    setScore(0);
    setCorrectAnswers(0);
    setXpEarned(0);
    setLeveledUp(false);
    previousLevel.current = stats.level;
    resetStreak();
    startRound(0);
  }, [stats.level, resetStreak]);

  const startRound = useCallback((roundIndex: number) => {
    const song = songs[roundIndex];
    setCurrentSong(song);
    setTimeRemaining(TIME_PER_ROUND);
    setAnswer('');
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
  }, [songs]);

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

  const handleSubmitAnswer = useCallback(() => {
    if (!answer.trim() || hasAnswered || !currentSong) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const responseTime = Date.now() - roundStartTimeRef.current;
    const normalizedAnswer = normalizeString(answer);
    const normalizedTitle = normalizeString(currentSong.title);
    const normalizedArtist = normalizeString(currentSong.artist);

    const foundTitle = normalizedAnswer.includes(normalizedTitle) || normalizedTitle.includes(normalizedAnswer);
    const foundArtist = normalizedAnswer.includes(normalizedArtist) || normalizedArtist.includes(normalizedAnswer);

    let points = 0;
    let correct = false;

    const timeBonus = Math.max(0, Math.floor((1 - responseTime / (TIME_PER_ROUND * 1000)) * 500));

    if (foundTitle && foundArtist) {
      points = 1000 + timeBonus;
      correct = true;
    } else if (foundTitle || foundArtist) {
      points = 500 + Math.floor(timeBonus / 2);
      correct = true;
    }

    if (correct) {
      setCorrectAnswers((prev) => prev + 1);
      updateStreak(true);
    } else {
      updateStreak(false);
    }

    setScore((prev) => prev + points);
    setLastResult({ correct, points });
    setHasAnswered(true);
    showResult();
  }, [answer, hasAnswered, currentSong, updateStreak, showResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmitAnswer();
  };

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

            <Button onClick={startGame} className="w-full" size="lg">
              <Zap className="w-5 h-5" />
              Commencer
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
            <div className="mb-4">
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

        {/* Answer input */}
        <AnimatePresence mode="wait">
          {hasAnswered ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              {lastResult?.correct ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-2xl font-bold">+{lastResult.points} pts !</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="w-8 h-8" />
                  <span className="text-xl">Mauvaise reponse</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="flex gap-2">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Titre et/ou Artiste..."
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={handleSubmitAnswer} disabled={!answer.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-center text-neutral-500 text-sm mt-2">Appuie sur Entree pour valider</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

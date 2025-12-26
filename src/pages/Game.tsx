import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Send, Trophy, Clock, CheckCircle, XCircle, Home } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';
import { useAbly } from '@/hooks/useAbly';
import { useAudio } from '@/hooks/useAudio';

// Music library for demo
const MUSIC_LIBRARY = [
  { id: '1', title: 'Shape of You', artist: 'Ed Sheeran', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Blinding Lights', artist: 'The Weeknd', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Dance Monkey', artist: 'Tones and I', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', title: 'Someone Like You', artist: 'Adele', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: '5', title: 'Uptown Funk', artist: 'Bruno Mars', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

function normalizeString(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { publish, subscribe, isConnected } = useAbly();
  const {
    currentRound, totalRounds, timeRemaining, setTimeRemaining,
    hasAnswered, myScore, currentAudioUrl, lastAnswer,
    roundResult, finalLeaderboard, startRound, submitAnswer,
    endRound, endGame, resetGame, startGame,
  } = useGameStore();

  const [answer, setAnswer] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [songs] = useState(() => [...MUSIC_LIBRARY].sort(() => Math.random() - 0.5).slice(0, 5));
  const [currentSong, setCurrentSong] = useState<typeof MUSIC_LIBRARY[0] | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartTimeRef = useRef<number>(0);

  const { isPlaying, setVolume } = useAudio(currentAudioUrl, { autoplay: true });
  const channelName = `room:${code}`;

  // Initialize game
  useEffect(() => {
    if (!isConnected) return;

    startGame(songs.length);
    nextRound(1);

    const unsubscribe = subscribe(channelName, 'game', (message) => {
      const data = message.data as { type: string; [key: string]: unknown };
      if (data.type === 'answer') {
        // Handle other players' answers
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const nextRound = useCallback((round: number) => {
    if (round > songs.length) {
      endGame(leaderboard);
      return;
    }

    const song = songs[round - 1];
    setCurrentSong(song);
    startRound(round, song.previewUrl, 30);
    setAnswer('');
    setShowResult(false);
    roundStartTimeRef.current = Date.now();

    // Start timer
    let time = 30;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      time--;
      setTimeRemaining(time);
      if (time <= 0) {
        clearInterval(timerRef.current!);
        handleRoundEnd();
      }
    }, 1000);
  }, [songs, startRound, setTimeRemaining, endGame, leaderboard]);

  const handleRoundEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (currentSong) {
      endRound({
        correctAnswer: { title: currentSong.title, artist: currentSong.artist },
        leaderboard,
      });
      setShowResult(true);

      // Next round after 5 seconds
      setTimeout(() => {
        nextRound(currentRound + 1);
      }, 5000);
    }
  }, [currentSong, currentRound, endRound, leaderboard, nextRound]);

  const handleSubmitAnswer = useCallback(() => {
    if (!answer.trim() || hasAnswered || !currentSong) return;

    const responseTime = Date.now() - roundStartTimeRef.current;
    const normalizedAnswer = normalizeString(answer);
    const normalizedTitle = normalizeString(currentSong.title);
    const normalizedArtist = normalizeString(currentSong.artist);

    const foundTitle = normalizedAnswer.includes(normalizedTitle) || normalizedTitle.includes(normalizedAnswer);
    const foundArtist = normalizedAnswer.includes(normalizedArtist) || normalizedArtist.includes(normalizedAnswer);

    let points = 0;
    let result: 'title' | 'artist' | 'both' | 'wrong' = 'wrong';

    const timeBonus = Math.max(0, Math.floor((1 - responseTime / 30000) * 500));

    if (foundTitle && foundArtist) {
      points = 1000 + timeBonus;
      result = 'both';
    } else if (foundTitle) {
      points = 500 + Math.floor(timeBonus / 2);
      result = 'title';
    } else if (foundArtist) {
      points = 500 + Math.floor(timeBonus / 2);
      result = 'artist';
    }

    const newScore = myScore + points;
    submitAnswer({ isCorrect: result !== 'wrong', result, points, totalScore: newScore });

    // Update leaderboard
    setLeaderboard((prev) => {
      const updated = [...prev];
      const myEntry = updated.find((e) => e.name === 'Toi');
      if (myEntry) {
        myEntry.score = newScore;
      } else {
        updated.push({ name: 'Toi', score: newScore });
      }
      return updated.sort((a, b) => b.score - a.score);
    });

    // Publish answer to channel
    publish(channelName, 'game', { type: 'answer', points, result });
  }, [answer, hasAnswered, currentSong, myScore, submitAnswer, publish, channelName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmitAnswer();
  };

  useEffect(() => {
    setVolume(isMuted ? 0 : 1);
  }, [isMuted, setVolume]);

  const handlePlayAgain = () => {
    resetGame();
    navigate(`/room/${code}?host=true`);
  };

  const handleGoHome = () => {
    resetGame();
    navigate('/');
  };

  // Final results
  if (finalLeaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
          <Card className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-3xl font-display font-bold mb-6">Partie terminee !</h1>

            <div className="space-y-2 mb-8">
              {(leaderboard.length > 0 ? leaderboard : [{ name: 'Toi', score: myScore }]).map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span>{player.name}</span>
                  </div>
                  <span className="font-mono text-primary-400">{player.score} pts</span>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={handleGoHome} className="flex-1">
                <Home className="w-5 h-5" />
                Accueil
              </Button>
              <Button onClick={handlePlayAgain} className="flex-1">
                Rejouer
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Round result
  if (showResult && roundResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg w-full">
          <Card className="text-center">
            <h2 className="text-xl font-heading font-semibold mb-4">Reponse</h2>
            <div className="mb-6">
              <p className="text-2xl font-bold text-primary-400">{roundResult.correctAnswer.title}</p>
              <p className="text-lg text-neutral-400">{roundResult.correctAnswer.artist}</p>
            </div>
            <p className="text-neutral-500">Prochaine manche...</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-neutral-500 text-sm">Manche</p>
          <p className="font-display font-bold text-2xl">{currentRound}/{totalRounds}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-neutral-500 text-sm">Score</p>
            <p className="font-mono font-bold text-2xl text-primary-400">{myScore}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8">
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
              initial={{ width: '100%' }}
              animate={{ width: `${(timeRemaining / 30) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {hasAnswered ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
              {lastAnswer?.isCorrect ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-2xl font-bold">+{lastAnswer.points} pts !</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="w-8 h-8" />
                  <span className="text-xl">Mauvaise reponse</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
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

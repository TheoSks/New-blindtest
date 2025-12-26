import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Send,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Home,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useAudio } from '@/hooks/useAudio';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { emit } = useSocket();
  const {
    currentRound,
    totalRounds,
    timeRemaining,
    setTimeRemaining,
    hasAnswered,
    myScore,
    currentAudioUrl,
    lastAnswer,
    roundResult,
    finalLeaderboard,
    startRound,
    submitAnswer,
    endRound,
    endGame,
    resetGame,
  } = useGameStore();

  const [answer, setAnswer] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { isPlaying, play, pause, setVolume } = useAudio(currentAudioUrl, {
    autoplay: true,
  });

  // Handle round start
  useSocketEvent(
    'game:round-start',
    (data: { round: number; audioUrl: string; timePerRound: number }) => {
      startRound(data.round, data.audioUrl, data.timePerRound);
      setAnswer('');
      setShowResult(false);
    }
  );

  // Handle answer result
  useSocketEvent('game:answer-result', (data: any) => {
    submitAnswer(data);
  });

  // Handle round end
  useSocketEvent('game:round-end', (data: any) => {
    endRound(data);
    setShowResult(true);
  });

  // Handle game end
  useSocketEvent('game:end', (data: { leaderboard: any[] }) => {
    endGame(data.leaderboard);
  });

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && !hasAnswered && !showResult) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, hasAnswered, showResult, setTimeRemaining]);

  // Toggle mute
  useEffect(() => {
    setVolume(isMuted ? 0 : 1);
  }, [isMuted, setVolume]);

  const handleSubmitAnswer = useCallback(() => {
    if (!answer.trim() || hasAnswered) return;

    emit('game:answer', {
      answer: answer.trim(),
      timestamp: Date.now(),
    });
  }, [answer, hasAnswered, emit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitAnswer();
    }
  };

  const handlePlayAgain = () => {
    resetGame();
    navigate(`/room/${code}`);
  };

  const handleGoHome = () => {
    resetGame();
    navigate('/');
  };

  // Final results screen
  if (finalLeaderboard) {
    const winner = finalLeaderboard[0];
    const myRank =
      finalLeaderboard.findIndex((p) => p.score === myScore) + 1;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-3xl font-display font-bold mb-2">
              Partie terminee !
            </h1>
            <p className="text-neutral-400 mb-8">
              {winner.name} remporte la victoire !
            </p>

            {/* Podium */}
            <div className="flex items-end justify-center gap-4 mb-8">
              {finalLeaderboard.slice(0, 3).map((player, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`flex flex-col items-center ${
                    index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-2 ${
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                        ? 'bg-neutral-400'
                        : 'bg-amber-700'
                    }`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-primary-400 font-mono">{player.score} pts</p>
                  <div
                    className={`w-20 rounded-t-lg mt-2 ${
                      index === 0
                        ? 'h-24 bg-yellow-500/30'
                        : index === 1
                        ? 'h-16 bg-neutral-400/30'
                        : 'h-12 bg-amber-700/30'
                    }`}
                  >
                    <span className="block text-center pt-2 font-bold">
                      {index + 1}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Full leaderboard */}
            <div className="space-y-2 mb-8">
              {finalLeaderboard.map((player, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.score === myScore
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-neutral-400">
                      #{index + 1}
                    </span>
                    <span>{player.name}</span>
                  </div>
                  <span className="font-mono">{player.score} pts</span>
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

  // Round result screen
  if (showResult && roundResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="text-center">
            <h2 className="text-xl font-heading font-semibold mb-4">
              Reponse
            </h2>
            <div className="mb-6">
              <p className="text-2xl font-bold text-primary-400">
                {roundResult.correctAnswer.title}
              </p>
              <p className="text-lg text-neutral-400">
                {roundResult.correctAnswer.artist}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {roundResult.leaderboard.slice(0, 5).map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span>{player.name}</span>
                  </div>
                  <span className="font-mono text-primary-400">
                    {player.score} pts
                  </span>
                </div>
              ))}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-neutral-500 text-sm">Manche</p>
            <p className="font-display font-bold text-2xl">
              {currentRound}/{totalRounds}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-neutral-500 text-sm">Score</p>
            <p className="font-mono font-bold text-2xl text-primary-400">
              {myScore}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
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
                  animate={{
                    height: isPlaying ? [12, 32, 20, 28, 16][i % 5] : 8,
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Timer */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-neutral-400" />
            <span
              className={`font-mono text-4xl font-bold ${
                timeRemaining <= 5 ? 'text-red-500' : 'text-white'
              }`}
            >
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
              {lastAnswer?.isCorrect ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-8 h-8" />
                  <span className="text-2xl font-bold">
                    +{lastAnswer.points} pts !
                  </span>
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
              <p className="text-center text-neutral-500 text-sm mt-2">
                Appuie sur Entree pour valider
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

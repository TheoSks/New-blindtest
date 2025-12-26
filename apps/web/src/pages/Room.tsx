import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Users,
  Settings,
  Crown,
  Play,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { guestName, isAuthenticated, user } = useAuthStore();
  const { setRoom, room } = useGameStore();
  const { emit } = useSocket();
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isJoining, setIsJoining] = useState(true);

  const playerName = isAuthenticated ? user?.username : guestName;

  useEffect(() => {
    if (!playerName || !code) {
      navigate('/');
      return;
    }

    // Join room
    emit('room:join', { code, playerName });
  }, [code, playerName, emit, navigate]);

  useSocketEvent('room:joined', (data: { room: any; players: Player[] }) => {
    setRoom(data.room);
    setPlayers(data.players);
    setIsHost(data.players.find((p) => p.name === playerName)?.isHost || false);
    setIsJoining(false);
  });

  useSocketEvent('room:player-joined', (data: { player: Player }) => {
    setPlayers((prev) => [...prev, data.player]);
  });

  useSocketEvent('room:player-left', (data: { playerId: string }) => {
    setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
  });

  useSocketEvent('game:starting', () => {
    navigate(`/game/${code}`);
  });

  useSocketEvent('error', (data: { message: string }) => {
    console.error('Room error:', data.message);
    navigate('/lobby');
  });

  const copyCode = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareRoom = async () => {
    const url = `${window.location.origin}/room/${code}`;
    if (navigator.share) {
      await navigator.share({
        title: 'BlindTest Party',
        text: `Rejoins ma partie de BlindTest ! Code: ${code}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startGame = () => {
    emit('game:start');
  };

  const leaveRoom = () => {
    emit('room:leave');
    navigate('/lobby');
  };

  if (isJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Connexion a la room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={leaveRoom}>
            <ArrowLeft className="w-5 h-5" />
            Quitter
          </Button>
          <Button variant="ghost" onClick={() => {}}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Room Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-neutral-400 mb-2">Code de la room</p>
          <div className="inline-flex items-center gap-4 bg-dark-tertiary rounded-2xl px-6 py-4">
            <span className="text-4xl font-mono font-bold tracking-widest text-primary-400">
              {code}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyCode}
                title="Copier le code"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={shareRoom}
                title="Partager"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Players */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                Joueurs
              </h2>
              <span className="text-neutral-400">{players.length}/8</span>
            </div>

            <div className="space-y-2">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{player.name}</span>
                    {player.name === playerName && (
                      <span className="text-xs text-neutral-500">(toi)</span>
                    )}
                  </div>
                  {player.isHost && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Crown className="w-4 h-4" />
                      <span className="text-xs">Host</span>
                    </div>
                  )}
                </motion.div>
              ))}

              {players.length < 8 && (
                <div className="p-3 rounded-xl border-2 border-dashed border-white/10 text-center text-neutral-500">
                  En attente de joueurs...
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Start Button (Host only) */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={startGame}
              className="w-full"
              size="xl"
              disabled={players.length < 1}
            >
              <Play className="w-6 h-6" />
              Lancer la partie
            </Button>
            {players.length < 1 && (
              <p className="text-center text-neutral-500 text-sm mt-2">
                Il faut au moins 1 joueur pour commencer
              </p>
            )}
          </motion.div>
        )}

        {!isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Card className="inline-block">
              <p className="text-neutral-400">
                En attente que l'hote lance la partie...
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Users, Crown, Play, ArrowLeft, Share2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useAbly } from '@/hooks/useAbly';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guestName, isAuthenticated, user } = useAuthStore();
  const { clientId, publish, subscribe, enterPresence, leavePresence, subscribePresence, getPresence, isConnected } = useAbly();

  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(searchParams.get('host') === 'true');
  const [isJoining, setIsJoining] = useState(true);

  const playerName = isAuthenticated ? user?.username : guestName;
  const channelName = `room:${code}`;

  useEffect(() => {
    if (!playerName || !code) {
      navigate('/');
      return;
    }
  }, [playerName, code, navigate]);

  useEffect(() => {
    if (!isConnected || !code) return;

    // Enter presence
    enterPresence(channelName, {
      name: playerName,
      isHost,
    });

    // Get initial presence
    getPresence(channelName).then((members) => {
      const playersList = members.map((m) => ({
        id: m.clientId,
        name: (m.data as { name: string })?.name || m.clientId,
        isHost: (m.data as { isHost: boolean })?.isHost || false,
      }));
      setPlayers(playersList);
      setIsJoining(false);
    });

    // Subscribe to presence changes
    const unsubscribePresence = subscribePresence(channelName, (member) => {
      if (member.action === 'enter' || member.action === 'present') {
        setPlayers((prev) => {
          const exists = prev.find((p) => p.id === member.clientId);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: member.clientId,
              name: (member.data as { name: string })?.name || member.clientId,
              isHost: (member.data as { isHost: boolean })?.isHost || false,
            },
          ];
        });
      } else if (member.action === 'leave') {
        setPlayers((prev) => prev.filter((p) => p.id !== member.clientId));
      }
    });

    // Subscribe to game events
    const unsubscribeEvents = subscribe(channelName, 'game', (message) => {
      const data = message.data as { type: string };
      if (data.type === 'start') {
        navigate(`/game/${code}`);
      }
    });

    return () => {
      leavePresence(channelName);
      unsubscribePresence();
      unsubscribeEvents();
    };
  }, [isConnected, code, channelName, playerName, isHost, enterPresence, leavePresence, subscribePresence, getPresence, subscribe, navigate]);

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

  const startGame = useCallback(() => {
    publish(channelName, 'game', { type: 'start' });
    navigate(`/game/${code}`);
  }, [publish, channelName, code, navigate]);

  const leaveRoom = () => {
    leavePresence(channelName);
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
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={leaveRoom}>
            <ArrowLeft className="w-5 h-5" />
            Quitter
          </Button>
        </div>

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
              <Button variant="ghost" size="sm" onClick={copyCode} title="Copier">
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={shareRoom} title="Partager">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>

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
                    {player.id === clientId && (
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

        {isHost ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button onClick={startGame} className="w-full" size="xl" disabled={players.length < 1}>
              <Play className="w-6 h-6" />
              Lancer la partie
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Card className="inline-block">
              <p className="text-neutral-400">En attente que l'hote lance la partie...</p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

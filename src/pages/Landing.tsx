import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Users, Trophy, Zap, Star, User } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore, xpForNextLevel, xpForLevel } from '@/stores/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const { setGuestName, guestName, stats, isGuest } = useAuthStore();
  const [playerName, setPlayerName] = useState(guestName || '');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handlePlay = (destination: string) => {
    if (!playerName.trim()) {
      setError('Entre ton pseudo pour jouer');
      return;
    }
    if (playerName.length < 2 || playerName.length > 20) {
      setError('Le pseudo doit faire entre 2 et 20 caracteres');
      return;
    }
    setGuestName(playerName.trim());
    navigate(destination);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Entre ton pseudo pour jouer');
      return;
    }
    if (!roomCode.trim()) {
      setError('Entre le code de la room');
      return;
    }
    setGuestName(playerName.trim());
    navigate(`/room/${roomCode.toUpperCase()}`);
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instantane',
      description: 'Joue en 3 secondes sans inscription',
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: 'Progression',
      description: 'Gagne de l\'XP et monte en niveau',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Classement',
      description: 'Compare ton score avec tes amis',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-bold gradient-text">
                BlindTest Party
              </h1>
            </div>
            <p className="text-xl text-neutral-400 max-w-xl mx-auto">
              Le blindtest multijoueur instantane. Devine les chansons, defie tes amis !
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="max-w-md mx-auto">
              <div className="space-y-4">
                {/* Show stats if returning player */}
                {isGuest && stats.gamesPlayed > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 mb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{guestName}</p>
                        <p className="text-sm text-neutral-400">Niveau {stats.level}</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                        style={{
                          width: `${((stats.xp - xpForLevel(stats.level)) / (xpForNextLevel(stats.level) - xpForLevel(stats.level))) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{stats.xp} XP</p>
                  </div>
                )}

                <Input
                  placeholder="Ton pseudo"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setError('');
                  }}
                  maxLength={20}
                />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                {/* Mode Solo - Primary action */}
                <Button onClick={() => handlePlay('/solo')} className="w-full" size="lg">
                  <Star className="w-5 h-5" />
                  Mode Solo
                </Button>

                {/* Multiplayer */}
                <Button onClick={() => handlePlay('/lobby')} variant="secondary" className="w-full">
                  <Users className="w-5 h-5" />
                  Multijoueur
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-dark-secondary text-neutral-500">ou rejoindre</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Code de la room"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    maxLength={8}
                    className="uppercase font-mono"
                  />
                  <Button variant="secondary" onClick={handleJoinRoom}>
                    Rejoindre
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12"
          >
            {features.map((feature, index) => (
              <Card key={index} variant="hover" className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-400 text-sm">{feature.description}</p>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>

      <footer className="py-6 text-center text-neutral-500 text-sm">
        <p>BlindTest Party - Deploye sur Vercel</p>
      </footer>
    </div>
  );
}

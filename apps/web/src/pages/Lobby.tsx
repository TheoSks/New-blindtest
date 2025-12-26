import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Users,
  Globe,
  Lock,
  ArrowRight,
  RefreshCw,
  Home,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';

interface PublicRoom {
  code: string;
  host: string;
  players: number;
  maxPlayers: number;
  theme: string;
}

export default function Lobby() {
  const navigate = useNavigate();
  const { guestName, isAuthenticated, user } = useAuthStore();
  const { emit, on, off } = useSocket();
  const [isCreating, setIsCreating] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const playerName = isAuthenticated ? user?.username : guestName;

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    // Load public rooms
    loadPublicRooms();
  }, [playerName, navigate]);

  useEffect(() => {
    const handleRoomCreated = (data: { code: string }) => {
      navigate(`/room/${data.code}`);
    };

    const handleError = (data: { message: string }) => {
      console.error('Socket error:', data.message);
      setIsCreating(false);
    };

    on('room:created', handleRoomCreated);
    on('error', handleError);

    return () => {
      off('room:created', handleRoomCreated);
      off('error', handleError);
    };
  }, [on, off, navigate]);

  const loadPublicRooms = () => {
    setIsLoadingRooms(true);
    // Simulated public rooms - in production, this would fetch from API
    setTimeout(() => {
      setPublicRooms([
        {
          code: 'MUSIC1',
          host: 'DJ_Master',
          players: 4,
          maxPlayers: 8,
          theme: 'Pop 2000s',
        },
        {
          code: 'ROCK42',
          host: 'RockFan',
          players: 2,
          maxPlayers: 8,
          theme: 'Rock Classics',
        },
      ]);
      setIsLoadingRooms(false);
    }, 500);
  };

  const handleCreateRoom = (isPublic: boolean) => {
    setIsCreating(true);
    emit('room:create', {
      settings: {
        isPublic,
        rounds: 15,
        timePerRound: 30,
        answerMode: 'both',
      },
      playerName,
    });
  };

  const handleJoinRoom = (code: string) => {
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <Home className="w-5 h-5" />
            Accueil
          </Button>
          <div className="text-right">
            <p className="text-neutral-400 text-sm">Connecte en tant que</p>
            <p className="font-semibold">{playerName}</p>
          </div>
        </div>

        {/* Create Room Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-heading font-bold mb-4">
            Creer une partie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card
              variant="hover"
              className="cursor-pointer"
              onClick={() => handleCreateRoom(true)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-500/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-secondary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Partie publique</h3>
                  <p className="text-sm text-neutral-400">
                    Visible par tous les joueurs
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
            </Card>

            <Card
              variant="hover"
              className="cursor-pointer"
              onClick={() => handleCreateRoom(false)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Partie privee</h3>
                  <p className="text-sm text-neutral-400">
                    Partage le code avec tes amis
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Public Rooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-heading font-bold">
              Parties publiques
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPublicRooms}
              disabled={isLoadingRooms}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`}
              />
              Actualiser
            </Button>
          </div>

          {isLoadingRooms ? (
            <div className="text-center py-12 text-neutral-500">
              Chargement des parties...
            </div>
          ) : publicRooms.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <p className="text-neutral-400">
                Aucune partie publique en cours
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Sois le premier a en creer une !
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {publicRooms.map((room) => (
                <Card
                  key={room.code}
                  variant="hover"
                  className="cursor-pointer"
                  onClick={() => handleJoinRoom(room.code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary-400">
                          {room.code}
                        </span>
                        <span className="text-neutral-500">•</span>
                        <span className="text-neutral-300">{room.theme}</span>
                      </div>
                      <p className="text-sm text-neutral-500">
                        Host: {room.host}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Users className="w-4 h-4" />
                        <span>
                          {room.players}/{room.maxPlayers}
                        </span>
                      </div>
                      <Button size="sm">Rejoindre</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

const { generateRoomCode } = require('../../utils/helpers');
const { musicLibrary } = require('../../utils/musicLibrary');

function handleRoomEvents(io, socket, rooms, playerSockets) {
  // Create room
  socket.on('room:create', ({ settings, playerName }) => {
    const roomCode = generateRoomCode();

    const room = {
      code: roomCode,
      hostId: socket.id,
      status: 'waiting',
      settings: {
        rounds: settings.rounds || 15,
        timePerRound: settings.timePerRound || 30,
        answerMode: settings.answerMode || 'both',
        isPublic: settings.isPublic ?? true,
        ...settings,
      },
      players: [
        {
          id: socket.id,
          name: playerName,
          score: 0,
          isHost: true,
          isGuest: true,
        },
      ],
      currentRound: 0,
      totalRounds: settings.rounds || 15,
      songs: shuffleArray([...musicLibrary]).slice(0, settings.rounds || 15),
      currentSong: null,
      roundStartTime: null,
      answers: new Map(),
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;
    playerSockets.set(socket.id, socket);

    socket.emit('room:created', { code: roomCode, room });
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // Join room
  socket.on('room:join', ({ code, playerName }) => {
    const roomCode = code.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room introuvable' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'La partie a deja commence' });
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error', { message: 'La room est pleine' });
      return;
    }

    // Check if player name is already taken
    if (room.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      socket.emit('error', { message: 'Ce pseudo est deja pris' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      isHost: false,
      isGuest: true,
    };

    room.players.push(player);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;
    playerSockets.set(socket.id, socket);

    // Send room info to joining player
    socket.emit('room:joined', {
      room: {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        settings: room.settings,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
      },
      players: room.players,
    });

    // Notify other players
    socket.to(roomCode).emit('room:player-joined', { player });

    console.log(`${playerName} joined room: ${roomCode}`);
  });

  // Leave room
  socket.on('room:leave', () => {
    const { roomCode } = socket.data;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);
    socket.leave(roomCode);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    } else {
      // Transfer host if needed
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }

      io.to(roomCode).emit('room:player-left', {
        playerId: socket.id,
        players: room.players,
      });
    }

    socket.data.roomCode = null;
    socket.data.playerName = null;
  });

  // Update room settings
  socket.on('room:update-settings', ({ settings }) => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Seul l\'hote peut modifier les parametres' });
      return;
    }

    room.settings = { ...room.settings, ...settings };

    io.to(roomCode).emit('room:updated', {
      room: {
        code: room.code,
        hostId: room.hostId,
        status: room.status,
        settings: room.settings,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
      },
    });
  });

  // Kick player
  socket.on('room:kick', ({ playerId }) => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Seul l\'hote peut expulser des joueurs' });
      return;
    }

    const playerSocket = playerSockets.get(playerId);
    if (playerSocket) {
      playerSocket.emit('room:kicked');
      playerSocket.leave(roomCode);
      playerSocket.data.roomCode = null;
    }

    room.players = room.players.filter((p) => p.id !== playerId);

    io.to(roomCode).emit('room:player-left', {
      playerId,
      players: room.players,
    });
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = { handleRoomEvents };

const { handleRoomEvents } = require('./handlers/roomHandler');
const { handleGameEvents } = require('./handlers/gameHandler');

// In-memory storage (use Redis in production)
const rooms = new Map();
const playerSockets = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Store socket reference
    socket.data = {
      roomCode: null,
      playerName: null,
    };

    // Room events
    handleRoomEvents(io, socket, rooms, playerSockets);

    // Game events
    handleGameEvents(io, socket, rooms);

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);

      const { roomCode, playerName } = socket.data;
      if (roomCode && rooms.has(roomCode)) {
        const room = rooms.get(roomCode);
        room.players = room.players.filter((p) => p.id !== socket.id);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          // Transfer host if needed
          if (room.hostId === socket.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
          }

          io.to(roomCode).emit('room:player-left', {
            playerId: socket.id,
            players: room.players,
          });
        }
      }

      playerSockets.delete(socket.id);
    });
  });
}

module.exports = { setupSocketHandlers, rooms };

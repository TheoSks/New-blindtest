const express = require('express');
const router = express.Router();
const { rooms } = require('../socket');

// Get public rooms
router.get('/public', (req, res) => {
  const publicRooms = [];

  for (const [code, room] of rooms.entries()) {
    if (room.settings.isPublic && room.status === 'waiting') {
      publicRooms.push({
        code,
        host: room.players.find((p) => p.isHost)?.name || 'Unknown',
        players: room.players.length,
        maxPlayers: 8,
        theme: 'Mixed',
      });
    }
  }

  res.json({
    success: true,
    rooms: publicRooms,
  });
});

// Get room info
router.get('/:code', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Room not found',
    });
  }

  res.json({
    success: true,
    room: {
      code: room.code,
      status: room.status,
      players: room.players.length,
      maxPlayers: 8,
      isPublic: room.settings.isPublic,
    },
  });
});

module.exports = router;

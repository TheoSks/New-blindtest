function handleGameEvents(io, socket, rooms) {
  // Start game
  socket.on('game:start', () => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room introuvable' });
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Seul l\'hote peut lancer la partie' });
      return;
    }

    if (room.players.length < 1) {
      socket.emit('error', { message: 'Il faut au moins 1 joueur' });
      return;
    }

    room.status = 'starting';

    // Reset scores
    room.players.forEach((p) => (p.score = 0));

    // Countdown before start
    io.to(roomCode).emit('game:starting', { countdown: 3 });

    setTimeout(() => {
      room.status = 'playing';
      room.currentRound = 0;
      startNextRound(io, roomCode, rooms);
    }, 3000);
  });

  // Submit answer
  socket.on('game:answer', ({ answer, timestamp }) => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room || room.status !== 'playing') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    // Check if already answered
    if (room.answers.has(socket.id)) return;

    const responseTime = timestamp - room.roundStartTime;
    const currentSong = room.currentSong;

    // Check answer
    const normalizedAnswer = normalizeString(answer);
    const normalizedTitle = normalizeString(currentSong.title);
    const normalizedArtist = normalizeString(currentSong.artist);

    const foundTitle = normalizedAnswer.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedAnswer);
    const foundArtist = normalizedAnswer.includes(normalizedArtist) ||
      normalizedArtist.includes(normalizedAnswer);

    let points = 0;
    let result = 'wrong';

    if (foundTitle && foundArtist) {
      points = calculatePoints(responseTime, room.settings.timePerRound * 1000, 'both');
      result = 'both';
    } else if (foundTitle) {
      points = calculatePoints(responseTime, room.settings.timePerRound * 1000, 'title');
      result = 'title';
    } else if (foundArtist) {
      points = calculatePoints(responseTime, room.settings.timePerRound * 1000, 'artist');
      result = 'artist';
    }

    player.score += points;
    room.answers.set(socket.id, { answer, points, result, responseTime });

    // Send result to player
    socket.emit('game:answer-result', {
      isCorrect: result !== 'wrong',
      result,
      points,
      totalScore: player.score,
      responseTime,
    });

    // Notify others if correct
    if (result !== 'wrong') {
      socket.to(roomCode).emit('game:player-found', {
        playerId: socket.id,
        time: responseTime / 1000,
      });
    }

    // Check if all players answered
    if (room.answers.size === room.players.length) {
      endRound(io, roomCode, rooms);
    }
  });

  // Skip round
  socket.on('game:skip', () => {
    const { roomCode } = socket.data;
    const room = rooms.get(roomCode);

    if (!room || room.hostId !== socket.id) return;

    endRound(io, roomCode, rooms);
  });
}

function startNextRound(io, roomCode, rooms) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.currentRound++;
  room.answers.clear();

  if (room.currentRound > room.songs.length) {
    endGame(io, roomCode, rooms);
    return;
  }

  room.currentSong = room.songs[room.currentRound - 1];
  room.roundStartTime = Date.now();
  room.status = 'playing';

  io.to(roomCode).emit('game:round-start', {
    round: room.currentRound,
    totalRounds: room.totalRounds,
    audioUrl: room.currentSong.previewUrl,
    category: room.currentSong.genre?.[0] || 'Mixed',
    timePerRound: room.settings.timePerRound,
  });

  // Auto-end round after time expires
  room.roundTimer = setTimeout(() => {
    if (room.status === 'playing' && room.currentRound === room.songs.indexOf(room.currentSong) + 1) {
      endRound(io, roomCode, rooms);
    }
  }, room.settings.timePerRound * 1000);
}

function endRound(io, roomCode, rooms) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear timeout
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
  }

  room.status = 'round_end';

  const leaderboard = room.players
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  io.to(roomCode).emit('game:round-end', {
    correctAnswer: {
      title: room.currentSong.title,
      artist: room.currentSong.artist,
    },
    leaderboard,
  });

  // Start next round after delay
  setTimeout(() => {
    startNextRound(io, roomCode, rooms);
  }, 5000);
}

function endGame(io, roomCode, rooms) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = 'finished';

  const leaderboard = room.players
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  io.to(roomCode).emit('game:end', { leaderboard });

  // Reset room for replay
  room.currentRound = 0;
  room.answers.clear();
  room.currentSong = null;
}

function calculatePoints(responseTime, maxTime, result) {
  const basePoints = result === 'both' ? 1000 : 500;
  const timeRatio = Math.max(0, 1 - responseTime / maxTime);
  const timeBonus = Math.floor(timeRatio * 500);

  return basePoints + (result === 'both' ? timeBonus : Math.floor(timeBonus / 2));
}

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

module.exports = { handleGameEvents };

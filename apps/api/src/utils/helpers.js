const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROOM_CODE_LENGTH = 6;

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(
      Math.floor(Math.random() * ROOM_CODE_CHARS.length)
    );
  }
  return code;
}

function calculateXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getLevelFromXp(xp) {
  return Math.floor(Math.log(xp / 100 + 1) / Math.log(1.5)) + 1;
}

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

module.exports = {
  generateRoomCode,
  calculateXpForLevel,
  getLevelFromXp,
  normalizeString,
};

// backend/cache.js
const Redis = require('ioredis');

let client;
if (process.env.NODE_ENV === 'test') {
  // In-test in-memory rate window stub
  const rateWindows = new Map();
  client = {
    zremrangebyscore: async (key, min, max) => {
      const arr = rateWindows.get(key) || [];
      rateWindows.set(key, arr.filter(ts => ts > max));
    },
    zcard: async key => {
      return (rateWindows.get(key) || []).length;
    },
    zadd: async (key, score, member) => {
      const arr = rateWindows.get(key) || [];
      arr.push(score);
      rateWindows.set(key, arr);
    },
    pexpire: async () => {
      // no-op
    },
    quit: async () => {
      // no-op
    }
  };
} else {
  client = new Redis(process.env.REDIS_URL);
}

module.exports = client;

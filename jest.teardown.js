// jest.teardown.js
const knex = require('./backend/db');
const redis = require('./backend/cache');

module.exports = async () => {
  await knex.destroy();
  await redis.quit();
};

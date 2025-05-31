// backend/jest.teardown.js

/**
 * This file runs after all Jest tests finish.
 * It can be used to clean up database connections, Redis, etc.
 */

const knex = require('./db');  // <-- was ./backend/db, now simply ./db

module.exports = async () => {
  // Close Knex connection
  await knex.destroy();
};

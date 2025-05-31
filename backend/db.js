// backend/db.js
// └── This file exports a configured Knex instance for your database

const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);

module.exports = knex;

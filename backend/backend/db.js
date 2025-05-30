// backend/db.js
const knexConfig = require('../knexfile').development;
const Knex = require('knex');
const knex = Knex(knexConfig);

module.exports = knex;

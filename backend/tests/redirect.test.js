// backend/tests/redirect.test.js

const request = require('supertest');
const app = require('../index');
const knex = require('../db');

describe('GET /r/:key static redirect', () => {
  const KEY = 'statickey';
  beforeAll(async () => {
    await knex('DynamicQR').insert({
      id: KEY,
      url: 'https://example.com',
      hits: 0,
      created: knex.fn.now(),
    });
  });

  afterAll(async () => {
    await knex('DynamicQR').where({ id: KEY }).del();
    await knex.destroy();
  });

  it('redirects to the stored URL', async () => {
    await request(app)
      .get(`/r/${KEY}`)
      .expect(302)
      .expect('Location', 'https://example.com');
  });
});

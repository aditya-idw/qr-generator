// backend/tests/apiKeyAuth.test.js

const request = require('supertest');
const app = require('../index');
const knex = require('../db');

describe('API-Key Authentication', () => {
  const USER_ID = 'testuser';
  const API_KEY = 'abcdef1234567890';

  beforeAll(async () => {
    // Ensure user exists; stringify roles for JSONB
    await knex('Users').insert({
      userId: USER_ID,
      email: 'api@test.com',
      password: 'hashed',
      roles: JSON.stringify(['user']),
      created: knex.fn.now(),
    });
    // Insert a valid API key
    await knex('ApiKeys').insert({
      userId: USER_ID,
      key: API_KEY,
      created: knex.fn.now(),
      revoked: false,
    });
  });

  afterAll(async () => {
    await knex('ApiKeys').where({ key: API_KEY }).del();
    await knex('Users').where({ userId: USER_ID }).del();
    await knex.destroy();
  });

  it('allows access with a valid X-API-Key', async () => {
    await request(app)
      .post('/generateQr/auth')
      .set('X-API-Key', API_KEY)
      .send({ payloadType: 'url', payloadData: 'https://example.com', format: 'svg' })
      .expect(200)
      .expect('Content-Type', /svg/);
  });

  it('denies access with a missing or invalid key', async () => {
    await request(app)
      .post('/generateQr/auth')
      .send({ payloadType: 'url', payloadData: 'https://example.com', format: 'svg' })
      .expect(401);

    await request(app)
      .post('/generateQr/auth')
      .set('X-API-Key', 'badkey')
      .send({ payloadType: 'url', payloadData: 'https://example.com', format: 'svg' })
      .expect(401);
  });
});

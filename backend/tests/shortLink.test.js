// backend/tests/shortLink.test.js
require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../index');
const knex = require('../db');

describe('POST /short-link', () => {
  const USER_ID = 'shortuser';
  const EMAIL = 'short@test.com';
  const PLAIN_PASSWORD = 'password123';
  let token;

  beforeAll(async () => {
    // 1) Insert a test user directly into the Users table
    const hashed = await bcrypt.hash(PLAIN_PASSWORD, 10);
    await knex('Users').insert({
      userId: USER_ID,
      email: EMAIL,
      password: hashed,
      roles: JSON.stringify(['user']),
      created: knex.fn.now(),
    });

    // 2) Generate a JWT for that user (must match your JWT_SECRET in .env)
    token = jwt.sign(
      { userId: USER_ID, roles: ['user'] },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    // Clean up any DynamicQR rows created by these tests
    await knex('DynamicQR').where({ id: 'customkey' }).del();
    await knex('DynamicQR').where({ id: 'duplicate' }).del();

    // Remove the test user
    await knex('Users').where({ userId: USER_ID }).del();

    // Close the Knex connection
    await knex.destroy();
  });

  it('creates a short link with a random 8-character key when no customKey is provided', async () => {
    const res = await request(app)
      .post('/short-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com' })
      .expect(201);

    // The response must include an 8-character key
    const generatedKey = res.body.key;
    expect(typeof generatedKey).toBe('string');
    expect(generatedKey).toHaveLength(8);

    // Clean up that dynamic QR entry
    await knex('DynamicQR').where({ id: generatedKey }).del();
  });

  it('creates a short link with the provided customKey', async () => {
    const res = await request(app)
      .post('/short-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', customKey: 'customkey' })
      .expect(201);

    // The API should echo back exactly that customKey
    expect(res.body.key).toBe('customkey');
  });

  it('returns 409 Conflict if customKey already exists', async () => {
    // Insert a DynamicQR row with id = "duplicate" ahead of time
    await knex('DynamicQR').insert({
      id: 'duplicate',
      url: 'https://initial.com',
      hits: 0,
      created: knex.fn.now(),
    });

    // Now try to create another short-link with the same customKey
    const res = await request(app)
      .post('/short-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://other.com', customKey: 'duplicate' })
      .expect(409);

    expect(res.body.error).toMatch(/already in use/);
  });

  it('returns 400 Bad Request when url is missing', async () => {
    await request(app)
      .post('/short-link')
      .set('Authorization', `Bearer ${token}`)
      .send({ customKey: 'nokey' })
      .expect(400);
  });
});

// backend/tests/redirectAdvanced.test.js

const request = require('supertest');
const app = require('../index');
const knex = require('../db');
const Redis = require('ioredis');

describe('Advanced redirect features', () => {
  const KEY = 'advkey';
  const PASSWORD = 'secret';
  let redis;

  beforeAll(async () => {
    // Set up a Redis client (in test mode)
    redis = new Redis({ host: '127.0.0.1', port: 6379, db: 1 });
    // Clean any existing rate-limit key
    await redis.del(`rate:${KEY}:127.0.0.1`);
  });

  beforeEach(async () => {
    // Insert a record requiring password and rate-limiting
    await knex('DynamicQR').insert({
      id: KEY,
      url: 'https://example.com',
      hits: 0,
      created: knex.fn.now(),
      passwordProtected: true,
      password: PASSWORD,
      rateLimit: JSON.stringify({ count: 2, perMilliseconds: 1000 }), // 2 requests per second
    });
  });

  afterEach(async () => {
    await knex('DynamicQR').where({ id: KEY }).del();
    await redis.del(`rate:${KEY}:127.0.0.1`);
  });

  afterAll(async () => {
    await knex.destroy();
    await redis.quit();
  });

  it('enforces rate limiting (429 after limit)', async () => {
    // First two requests should succeed
    for (let i = 0; i < 2; i++) {
      await request(app)
        .get(`/r/${KEY}`)
        .query({ pw: PASSWORD })
        .expect(302);
    }
    // Third within the same second should be blocked
    await request(app)
      .get(`/r/${KEY}`)
      .query({ pw: PASSWORD })
      .expect(429)
      .expect(res => {
        expect(res.body.error).toMatch(/Rate limit exceeded/);
      });
  });

  it('requires correct password (401 on bad or missing)', async () => {
    // No password → Unauthorized
    await request(app)
      .get(`/r/${KEY}`)
      .expect(401);

    // Wrong password → Unauthorized
    await request(app)
      .get(`/r/${KEY}`)
      .query({ pw: 'wrongpass' })
      .expect(401);

    // Correct password but rate-limit resets after 1 second
    await request(app)
      .get(`/r/${KEY}`)
      .query({ pw: PASSWORD })
      .expect(302);

    // Wait 1 second, then reset
    await new Promise((r) => setTimeout(r, 1000));
    await request(app)
      .get(`/r/${KEY}`)
      .query({ pw: PASSWORD })
      .expect(302);
  });

  it('fires analytics webhook asynchronously', async () => {
    // Point the webhook URL to a nonexistent host, errors should be caught internally
    await knex('DynamicQR')
      .where({ id: KEY })
      .update({ webhookUrl: 'http://hooks.test/event' });

    // This should still redirect successfully (webhook errors do not affect redirect)
    await request(app)
      .get(`/r/${KEY}`)
      .query({ pw: PASSWORD })
      .expect(302);

    // Allow a moment for the async webhook attempt
    await new Promise((r) => setTimeout(r, 100));
  });
});

// backend/tests/api.test.js

const request = require('supertest');
const app = require('../index');                  // points to backend/index.js
const knex = require('../db');

describe('GET /generateQr returns SVG', () => {
  afterAll(async () => {
    await knex.destroy();
  });

  it('returns SVG when payloadType=url', async () => {
    const resp = await request(app)
      .get('/generateQr')
      .query({
        payloadType: 'url',
        payloadData: 'https://example.com',
        format: 'svg',
      })
      .expect(200)
      .expect('Content-Type', /svg/);

    expect(resp.text).toMatch(/^<svg/);
  });
});

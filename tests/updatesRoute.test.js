const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const config = require('../config');

function buildApp() {
  const app = express();
  app.use((req, res, next) => { req.session = {}; next(); });
  const router = require('../routes/admin')({}, {});
  app.use(router);
  return app;
}

describe('GET /admin/updates/latest', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../routes/admin')];
    config.githubRepo = 'owner/repo';
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('returns release info', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        tag_name: 'v1.0.0',
        html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        body: 'notes',
      }),
    });

    const app = buildApp();
    const res = await request(app).get('/admin/updates/latest');
    expect(res.status).to.equal(200);
    expect(res.body.tag_name).to.equal('v1.0.0');
    expect(res.body.html_url).to.be.a('string');
  });

  it('handles errors', async () => {
    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const app = buildApp();
    const res = await request(app).get('/admin/updates/latest');
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('error');
  });
});

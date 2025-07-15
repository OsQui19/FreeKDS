const express = require('express');
const request = require('supertest');
const { expect } = require('chai');

function buildApp(db = { promise: () => ({ query: async () => [] }) }) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => { req.session = {}; next(); });
  const router = require('../routes/admin')(db, {});
  app.use(router);
  return app;
}

describe('GET /admin/backups/status', () => {
  it('returns backup status', async () => {
    const app = buildApp();
    const res = await request(app).get('/admin/backups/status');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('running');
    expect(res.body).to.have.property('queued');
  });
});

const request = require('supertest');
const { expect } = require('chai');
const createApp = require('../server/app');

process.env.NODE_ENV = 'test';

function buildApp(db = { promise: () => ({ query: async () => [] }), query: () => {} }) {
  return createApp(db, {});
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

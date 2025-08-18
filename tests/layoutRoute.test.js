const request = require('supertest');
const { expect } = require('chai');
const createApp = require('../server/app');

process.env.NODE_ENV = 'test';

function buildApp(db) {
  const io = { emit() {}, to() { return { emit() {} }; } };
  return createApp(db, io);
}

describe('Layout API', () => {
  it('returns layout by name', async () => {
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          expect(sql).to.match(/SELECT definition FROM layouts/);
          expect(params[0]).to.equal('default');
          return [[{ definition: 'layout-json' }], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .get('/api/layout')
      .set('x-test-user', '1');
    expect(res.status).to.equal(200);
    expect(res.body.layout).to.equal('layout-json');
  });

  it('saves layout', async () => {
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          expect(sql).to.match(/INSERT INTO layouts/);
          expect(params).to.deep.equal(['default', 'new-layout']);
          return [[], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-user', '1')
      .send({ layout: 'new-layout' });
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });
});

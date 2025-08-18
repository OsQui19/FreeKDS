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
      .set('x-test-role', 'admin');
    expect(res.status).to.equal(200);
    expect(res.body.layout).to.equal('layout-json');
  });

  it('saves layout', async () => {
    const layout = JSON.stringify({ screens: [] });
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          expect(sql).to.match(/INSERT INTO layouts/);
          expect(params).to.deep.equal(['default', layout]);
          return [[], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-role', 'admin')
      .send({ layout });
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it('rejects invalid JSON layout', async () => {
    const db = {
      promise: () => ({
        query: async () => {
          throw new Error('should not be called');
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-role', 'admin')
      .send({ layout: 'not-json' });
    expect(res.status).to.equal(400);
    expect(res.body.errors).to.exist;
  });

  it('rejects layout that fails schema validation', async () => {
    const db = {
      promise: () => ({
        query: async () => {
          throw new Error('should not be called');
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-role', 'admin')
      .send({ layout: '{}' });
    expect(res.status).to.equal(400);
    expect(res.body.errors).to.exist;
  });
});

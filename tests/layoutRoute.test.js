const request = require('supertest');
const { expect } = require('chai');
const createApp = require('../server/app');

process.env.NODE_ENV = 'test';

function buildApp(db) {
  const io = { emit() {}, to() { return { emit() {} }; } };
  return createApp(db, io);
}

describe('Layout API', () => {
  it('returns restaurant layout', async () => {
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          expect(params[0]).to.equal('layout_restaurant');
          return [[{ setting_value: 'rest-layout' }], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .get('/api/layout?scope=restaurant')
      .set('x-test-role', 'FOH');
    expect(res.status).to.equal(200);
    expect(res.body.layout).to.equal('rest-layout');
  });

  it('forbids non-management from saving restaurant layout', async () => {
    const db = { promise: () => ({ query: async () => [[], []] }) };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-role', 'FOH')
      .send({ layout: 'x', scope: 'restaurant' });
    expect(res.status).to.equal(403);
  });

  it('allows management to save restaurant layout', async () => {
    let saved = {};
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          saved.key = params[0];
          saved.val = params[1];
          return [[], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .post('/api/layout')
      .set('x-test-role', 'management')
      .send({ layout: 'new-layout', scope: 'restaurant' });
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(saved).to.deep.equal({ key: 'layout_restaurant', val: 'new-layout' });
  });

  it('falls back to restaurant layout when user layout missing', async () => {
    const db = {
      promise: () => ({
        query: async (sql, params) => {
          if (params[0] === 'layout_user_5') return [[], []];
          return [[{ setting_value: 'rest-layout' }], []];
        },
      }),
    };
    const app = buildApp(db);
    const res = await request(app)
      .get('/api/layout?userId=5')
      .set('x-test-role', 'management');
    expect(res.status).to.equal(200);
    expect(res.body.layout).to.equal('rest-layout');
  });
});

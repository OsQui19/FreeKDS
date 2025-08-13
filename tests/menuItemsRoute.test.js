const request = require('supertest');
const { expect } = require('chai');
const accessControl = require('../controllers/accessControl');
const createApp = require('../src/app');

process.env.NODE_ENV = 'test';

function buildApp(db) {
  const io = {
    emit() {},
    to() {
      return { emit() {} };
    },
  };
  return createApp(db, io);
}

describe('PUT /api/menu-items/:id', () => {
  let db;
  beforeEach(async () => {
    db = {
      query: (sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        if (cb) cb(null, []);
      },
      promise: () => ({
        query: async () => [[], []],
      }),
    };
    await accessControl.savePermissions(db, {
      management: accessControl.ALL_MODULES,
      FOH: ['order'],
    });
  });

  it('allows FOH role to mark an item unavailable', async () => {
    const app = buildApp(db);
    const res = await request(app)
      .put('/api/menu-items/1')
      .set('x-test-role', 'FOH')
      .send({ is_available: false });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
  });
});

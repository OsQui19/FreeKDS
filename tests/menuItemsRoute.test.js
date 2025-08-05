const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const accessControl = require('../controllers/accessControl');

function buildApp(role, db) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { user: { role } };
    next();
  });
  const router = require('../routes/api')(db, {
    emit() {},
    to() {
      return { emit() {} };
    },
  });
  app.use(router);
  return app;
}

describe('PUT /api/menu-items/:id', () => {
  let db;
  beforeEach(() => {
    db = {
      query: (sql, params, cb) => {
        if (typeof params === 'function') cb = params;
        if (cb) cb(null, []);
      },
      promise: () => ({
        query: async () => [[], []],
      }),
    };
    accessControl.savePermissions(db, {
      management: accessControl.ALL_MODULES,
      FOH: ['order'],
    });
  });

  it('allows FOH role to mark an item unavailable', async () => {
    const app = buildApp('FOH', db);
    const res = await request(app)
      .put('/api/menu-items/1')
      .send({ is_available: false });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
  });
});

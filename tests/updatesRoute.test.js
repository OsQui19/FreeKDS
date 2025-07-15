const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const config = require('../config');

function buildApp(db = { promise: () => ({ query: async () => [] }) }, user) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    req.session = {};
    if (user) req.session.user = user;
    next();
  });
  const router = require('../routes/admin')(db, {});
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

describe('POST /admin/updates/apply', () => {
  let childProc;
  let originalExec;
  beforeEach(() => {
    delete require.cache[require.resolve('../routes/admin')];
    childProc = require('child_process');
    config.githubRepo = '';
    delete global.fetch;
    originalExec = childProc.execSync;
  });

  afterEach(() => {
    childProc.execSync = originalExec;
  });

  it('requires management role', async () => {
    childProc.execSync = () => '';
    const app = buildApp(undefined, { role: 'FOH', id: 1 });
    const res = await request(app).post('/admin/updates/apply');
    expect(res.status).to.equal(403);
  });

  it('applies update when repo clean', async () => {
    childProc.execSync = (cmd) => {
      if (cmd.startsWith('git status')) return '';
      return '';
    };
    const app = buildApp(undefined, { role: 'management', id: 1 });
    const res = await request(app).post('/admin/updates/apply');
    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
  });

  it('fails when repo dirty', async () => {
    childProc.execSync = (cmd) => {
      if (cmd.startsWith('git status')) return 'M file';
      return '';
    };
    const app = buildApp(undefined, { role: 'management', id: 1 });
    const res = await request(app).post('/admin/updates/apply');
    expect(res.status).to.equal(400);
  });
});

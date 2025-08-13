const request = require('supertest');
const { expect } = require('chai');
const config = require('../config');
const createApp = require('../src/app');

process.env.NODE_ENV = 'test';

function buildApp(db = { promise: () => ({ query: async () => [] }), query: () => {} }) {
  return createApp(db, {});
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

describe.skip('POST /admin/updates/apply', () => {
  let childProc;
  let originalExec;
  beforeEach(() => {
    delete require.cache[require.resolve('../routes/admin')];
    childProc = require('child_process');
    config.githubRepo = '';
    delete global.fetch;
    originalExec = childProc.exec;
  });

  afterEach(() => {
    childProc.exec = originalExec;
  });

  it('requires management role', async () => {
    childProc.exec = (cmd, opts, cb) => cb(null, '', '');
    const app = buildApp();
    const res = await request(app)
      .post('/admin/updates/apply')
      .set('x-test-role', 'FOH');
    expect(res.status).to.equal(403);
  });

  it('applies update when repo clean', async () => {
    childProc.exec = (cmd, opts, cb) => {
      if (cmd.startsWith('git status')) return cb(null, '', '');
      return cb(null, '', '');
    };
    const app = buildApp();
    const res = await request(app)
      .post('/admin/updates/apply')
      .set('x-test-role', 'management');
    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
  });

  it('fails when repo dirty', async () => {
    childProc.exec = (cmd, opts, cb) => {
      if (cmd.startsWith('git status')) return cb(null, 'M file', '');
      return cb(null, '', '');
    };
    const app = buildApp();
    const res = await request(app)
      .post('/admin/updates/apply')
      .set('x-test-role', 'management');
    expect(res.status).to.equal(400);
  });
});

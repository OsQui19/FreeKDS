const request = require('supertest');
const { expect } = require('chai');
const fs = require('fs');

const createApp = require('../server/app');

process.env.NODE_ENV = 'test';

function buildApp() {
  const db = { promise: () => ({}) };
  const io = { emit() {}, to() { return { emit() {} }; } };
  return createApp(db, io);
}

describe('Tokens API', () => {
  const baseTokens = require('../tokens/base.json');

  it('returns base tokens when base file is unreadable', async () => {
    const original = fs.promises.readFile;
    fs.promises.readFile = async () => { throw new Error('fail'); };

    const app = buildApp();
    const res = await request(app).get('/api/tokens');

    fs.promises.readFile = original;

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal(baseTokens);
  });

  it('returns base tokens when station file is missing', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/tokens?stationId=999');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal(baseTokens);
  });
});

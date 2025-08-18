const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const initSSE = require('../../server/transport/sse');

process.env.NODE_ENV = 'test';

describe('sse transport auth', () => {
  it('rejects invalid token', async () => {
    const app = express();
    const sse = initSSE(app);
    const res = await request(app)
      .get('/sse?stationId=1')
      .set('Origin', 'http://localhost:3000');
    expect(res.status).to.equal(401);
    expect(sse.clientCount()).to.equal(0);
  });

  it('rejects disallowed origin', async () => {
    const app = express();
    const sse = initSSE(app);
    const res = await request(app)
      .get('/sse?stationId=1&token=devtoken')
      .set('Origin', 'http://evil.com');
    expect(res.status).to.equal(401);
    expect(sse.clientCount()).to.equal(0);
  });
});

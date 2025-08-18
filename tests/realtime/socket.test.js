const http = require('http');
const express = require('express');
const ioClient = require('socket.io-client');
const { expect } = require('chai');
const initSocket = require('../../server/transport/socket');

process.env.NODE_ENV = 'test';

describe('socket transport auth', () => {
  let server;
  let address;
  beforeEach((done) => {
    const app = express();
    server = http.createServer(app);
    initSocket(server, {}, {});
    server.listen(() => {
      address = server.address().port;
      done();
    });
  });
  afterEach((done) => {
    server.close(done);
  });

  it('rejects invalid token', (done) => {
    const client = ioClient(`http://localhost:${address}`, {
      autoConnect: false,
      extraHeaders: { Origin: 'http://localhost:3000' },
      query: { stationId: '1', token: 'bad' },
    });
    client.on('connect', () => done(new Error('should not connect')));
    client.on('connect_error', (err) => {
      expect(err).to.exist;
      client.close();
      done();
    });
    client.connect();
  });

  it('rejects disallowed origin', (done) => {
    const client = ioClient(`http://localhost:${address}`, {
      autoConnect: false,
      extraHeaders: { Origin: 'http://evil.com' },
      query: { stationId: '1', token: 'devtoken' },
    });
    client.on('connect', () => done(new Error('should not connect')));
    client.on('connect_error', (err) => {
      expect(err).to.exist;
      client.close();
      done();
    });
    client.connect();
  });
});

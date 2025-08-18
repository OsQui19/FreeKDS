const clients = new Map();
const HEARTBEAT_MS = 30000;
const ALLOWED_ORIGINS = ['http://localhost:3000'];
const VALID_TOKEN = process.env.REALTIME_TOKEN || 'devtoken';

function initSSE(app) {
  app.get('/sse', (req, res) => {
    const stationId = parseInt(req.query.stationId, 10);
    const type = (req.query.type || '').toLowerCase();
    const origin = req.get('Origin');
    const token = req.query.token;
    if (token !== VALID_TOKEN || !ALLOWED_ORIGINS.includes(origin)) {
      res.status(401).end();
      return;
    }
    if (isNaN(stationId)) {
      res.status(400).end();
      return;
    }
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders && res.flushHeaders();
    clients.set(stationId, { res, type });
    req.on('close', () => {
      clients.delete(stationId);
    });
  });

  function send(res, event, data) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Failed to write to client; ignore
    }
  }

  setInterval(() => {
    for (const { res } of clients.values()) {
      send(res, 'ping', Date.now());
    }
  }, HEARTBEAT_MS);

  return {
    emitToStation(id, event, data) {
      const client = clients.get(Number(id));
      if (client) send(client.res, event, data);
    },
    emitToExpo(event, data) {
      for (const { res, type } of clients.values()) {
        if (type === 'expo') send(res, event, data);
      }
    },
    emitAll(event, data) {
      for (const { res } of clients.values()) {
        send(res, event, data);
      }
    },
    clientCount() {
      return clients.size;
    },
  };
}

module.exports = initSSE;

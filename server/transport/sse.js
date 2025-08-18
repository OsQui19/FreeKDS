const clients = new Map();

function initSSE(app) {
  app.get('/sse', (req, res) => {
    const stationId = parseInt(req.query.stationId, 10);
    const type = (req.query.type || '').toLowerCase();
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

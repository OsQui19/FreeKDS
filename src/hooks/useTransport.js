import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Manage realtime transports with offline queuing, reconnection backoff and
 * stale indicators. Attempts the preferred transport first and falls back after
 * repeated failures.
 *
 * @param {Object} options
 * @param {string} options.type - preferred transport (`ws` or `sse`)
 * @param {string} [options.fallback] - fallback transport
 * @param {number} options.stationId - station identifier
 * @returns {{connection:any,connected:boolean,stale:boolean,on:Function,off:Function,send:Function}}
 */
export default function useTransport({ type, fallback = 'sse', stationId }) {
  const [transport, setTransport] = useState(type);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(true);

  const connRef = useRef(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const backoffRef = useRef(1000);
  const attemptsRef = useRef(0);

  const flushQueue = () => {
    if (transport === 'ws' && connRef.current) {
      queueRef.current.forEach(([evt, data]) => connRef.current.emit(evt, data));
    }
    queueRef.current = [];
  };

  const send = (evt, data) => {
    if (transport === 'ws' && connected && connRef.current) {
      connRef.current.emit(evt, data);
    } else {
      queueRef.current.push([evt, data]);
    }
  };

  useEffect(() => {
    let active = true;

    function scheduleReconnect() {
      attemptsRef.current += 1;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      if (attemptsRef.current >= 3 && fallback && fallback !== transport) {
        setTransport(fallback);
        attemptsRef.current = 0;
        backoffRef.current = 1000;
        return;
      }
      timerRef.current = setTimeout(start, delay);
    }

    function start() {
      if (!active) return;
      if (transport === 'ws') {
        const socket = io('/', { query: { stationId } });
        connRef.current = socket;

        socket.on('connect', () => {
          if (!active) return;
          setConnected(true);
          setStale(false);
          attemptsRef.current = 0;
          backoffRef.current = 1000;
          flushQueue();
        });

        const handleDisconnect = () => {
          if (!active) return;
          setConnected(false);
          setStale(true);
          socket.close();
          scheduleReconnect();
        };

        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleDisconnect);
      } else {
        const es = new EventSource(`/sse?stationId=${stationId}`);
        connRef.current = es;

        es.onopen = () => {
          if (!active) return;
          setConnected(true);
          setStale(false);
          attemptsRef.current = 0;
          backoffRef.current = 1000;
        };

        es.onerror = () => {
          if (!active) return;
          setConnected(false);
          setStale(true);
          es.close();
          scheduleReconnect();
        };
      }
    }

    start();

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      const conn = connRef.current;
      if (conn) {
        if (transport === 'ws') {
          conn.off?.('disconnect');
          conn.off?.('connect_error');
          conn.close?.();
        } else {
          conn.close();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, stationId, fallback]);

  const on = (evt, handler) => {
    const conn = connRef.current;
    if (!conn) return;
    if (transport === 'ws') conn.on(evt, handler);
    else conn.addEventListener(evt, handler);
  };

  const off = (evt, handler) => {
    const conn = connRef.current;
    if (!conn) return;
    if (transport === 'ws') conn.off(evt, handler);
    else conn.removeEventListener(evt, handler);
  };

  return { connection: connRef.current, connected, stale, on, off, send };
}


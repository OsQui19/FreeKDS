import React, { useEffect, useRef, useState } from 'react';
import OrderList from '../Orders/components/OrderList.jsx';
import useTransport from '@/hooks/useTransport.js';

/**
 * KDS application component that renders incoming orders.
 *
 * @param {object} props
 * @param {string} [props.stationType]
 */
export default function KdsApp({ stationType, stationId, transport = 'ws', fallback }) {
  const [orders, setOrders] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [heldIds, setHeldIds] = useState(new Set());
  const queueRef = useRef([]);
  const { connection, connected, stale, on, off, send } = useTransport({
    type: transport,
    fallback,
    stationId,
  });
  const audioCtxRef = useRef(null);
  const beep = (freq = 880, duration = 120) => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      setTimeout(() => { try { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02); o.stop(ctx.currentTime + 0.03); } catch {} }, duration);
    } catch {}
  };

  useEffect(() => {
    if (connected && queueRef.current.length) {
      queueRef.current.forEach((evt) => {
        if (evt.type === 'add') {
          setOrders((prev) => [...prev, evt.order]);
        } else if (evt.type === 'complete') {
          setOrders((prev) => prev.filter((o) => o.orderId !== evt.orderId));
        }
      });
      queueRef.current = [];
    }
  }, [connected]);

  useEffect(() => {
    if (!connection) return;

    const handleAdd = (order) => {
      if (connected) setOrders((prev) => [...prev, order]);
      else queueRef.current.push({ type: 'add', order });
      // gentle beep on new order
      beep(880, 120);
    };
    const handleComplete = ({ orderId }) => {
      if (connected) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      } else {
        queueRef.current.push({ type: 'complete', orderId });
      }
    };

    on('orderAdded', handleAdd);
    on('orderCompleted', handleComplete);
    on('orderUrgent', ({ orderId }) => {
      setUrgentIds((prev) => new Set([...prev, orderId]));
      beep(1320, 180);
    });
    on('orderHeld', ({ orderId }) => {
      setHeldIds((prev) => new Set([...prev, orderId]));
    });
    on('orderReleased', ({ orderId }) => {
      setHeldIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
      setUrgentIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    });

    return () => {
      off('orderAdded', handleAdd);
      off('orderCompleted', handleComplete);
      off('orderUrgent', () => {});
      off('orderHeld', () => {});
      off('orderReleased', () => {});
    };
  }, [connection, connected, on, off]);

  return (
    <>
      {stale && <div className="stale-indicator">Offline</div>}
      <OrderList
        orders={orders}
        stationType={stationType}
        onBump={(orderId) => send('bumpOrder', { orderId })}
        onUrgent={(orderId) => send('markUrgent', { orderId })}
        urgentIds={urgentIds}
      />
      {stationType !== 'expo' && (
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => {
            const last = orders[0]; if (last) send('holdOrder', { orderId: last.orderId });
          }}>Hold Oldest</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => {
            const held = Array.from(heldIds)[0]; if (held) send('releaseOrder', { orderId: held });
          }}>Release Held</button>
        </div>
      )}
    </>
  );
}

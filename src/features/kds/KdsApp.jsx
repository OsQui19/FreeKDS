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
  const queueRef = useRef([]);
  const { connection, connected, stale, on, off } = useTransport({
    type: transport,
    fallback,
    stationId,
  });

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

    return () => {
      off('orderAdded', handleAdd);
      off('orderCompleted', handleComplete);
    };
  }, [connection, connected, on, off]);

  return (
    <>
      {stale && <div className="stale-indicator">Offline</div>}
      <OrderList orders={orders} stationType={stationType} />
    </>
  );
}


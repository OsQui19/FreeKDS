<<<<<<< ours
import React, { useEffect, useRef, useState } from 'react';
import OrderList from '../Orders/components/OrderList.jsx';
import useTransport from '@/hooks/useTransport.js';
=======
import React, { useEffect, useState } from 'react';
import { TicketGrid } from '../../../packages/renderers/index.js';
import useSocket from '@/hooks/useSocket.js';
>>>>>>> theirs

/**
 * KDS application component that renders incoming orders.
 *
 * @param {object} props
 * @param {string} [props.stationType]
 */
export default function KdsApp({ stationType, stationId, transport = 'ws' }) {
  const [orders, setOrders] = useState([]);
  const [stale, setStale] = useState(false);
  const queueRef = useRef([]);
  const { connection, connected, on, off } = useTransport({
    type: transport,
    stationId,
  });

  useEffect(() => {
    setStale(!connected);
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

<<<<<<< ours
  return (
    <>
      {stale && <div className="stale-indicator">Offline</div>}
      <OrderList orders={orders} stationType={stationType} />
    </>
  );
=======
  return <TicketGrid tickets={orders} stationType={stationType} />;
>>>>>>> theirs
}

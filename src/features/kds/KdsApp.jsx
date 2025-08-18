import React, { useEffect, useState } from 'react';
import OrderList from '../Orders/components/OrderList.jsx';
import useSocket from '@/hooks/useSocket.js';

/**
 * KDS application component that renders incoming orders.
 *
 * @param {object} props
 * @param {string} [props.stationType]
 */
export default function KdsApp({ stationType }) {
  const [orders, setOrders] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleAdd = (order) => setOrders((prev) => [...prev, order]);
    const handleComplete = ({ orderId }) =>
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));

    socket.on('orderAdded', handleAdd);
    socket.on('orderCompleted', handleComplete);

    return () => {
      socket.off('orderAdded', handleAdd);
      socket.off('orderCompleted', handleComplete);
    };
  }, [socket]);

  return <OrderList orders={orders} stationType={stationType} />;

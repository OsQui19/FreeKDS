import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * React hook to manage a Socket.IO connection.
 *
 * @param {object} [options] - Options passed to socket.io-client.
 * @returns {{ socket: import('socket.io-client').Socket|null, connected: boolean }}
 */
export default function useSocket(options = {}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(options.url || undefined, options);
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { socket: socketRef.current, connected };
}

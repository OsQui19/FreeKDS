import useSocket from './useSocket.js';
import useEventSource from './useEventSource.js';

/**
 * Hook selecting between WebSocket and SSE transports.
 *
 * @param {Object} options
 * @param {string} options.type - 'ws' or 'sse'
 * @param {number} options.stationId - station identifier
 * @returns {{ connection: any, connected: boolean }}
 */
export default function useTransport({ type, stationId }) {
  if (type === 'sse') {
    const { source, connected } = useEventSource(`/sse?stationId=${stationId}`);
    return {
      connection: source,
      connected,
      on: source ? source.addEventListener.bind(source) : () => {},
      off: source ? source.removeEventListener.bind(source) : () => {},
    };
  }
  const { socket, connected } = useSocket({ query: { stationId } });
  return {
    connection: socket,
    connected,
    on: socket ? socket.on.bind(socket) : () => {},
    off: socket ? socket.off.bind(socket) : () => {},
  };
}

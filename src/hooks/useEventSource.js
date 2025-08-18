import { useEffect, useRef, useState } from 'react';
import { emit } from '@/plugins/lifecycle.js';

/**
 * React hook to manage an EventSource connection.
 *
 * @param {string} url - SSE endpoint URL.
 * @returns {{ source: EventSource|null, connected: boolean }}
 */
export default function useEventSource(url) {
  const sourceRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(url);
    sourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (evt) => emit('onTicketReceived', evt.data);

    return () => {
      es.close();
    };
  }, [url]);

  return { source: sourceRef.current, connected };
}

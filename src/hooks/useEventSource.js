import { useEffect, useRef, useState } from 'react';

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

    return () => {
      es.close();
    };
  }, [url]);

  return { source: sourceRef.current, connected };
}

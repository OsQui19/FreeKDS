# Realtime Transport

FreeKDS uses a small abstraction layer to communicate with the server in
real time. WebSockets are preferred, but the client can fall back to
Server‑Sent Events (SSE) when necessary.

## Transports
- **WebSocket (`ws`)** – bidirectional and used by default.
- **Server‑Sent Events (`sse`)** – unidirectional fallback when WebSockets
  are unavailable.

## Heartbeat
- Heartbeats run every 30 seconds.
- WebSocket clients send a `ping` and expect a `pong` reply.
- SSE clients receive a server `ping` event.
- Missing two consecutive heartbeats marks the connection as stale and
  triggers a reconnect attempt.

## Reconnection Backoff
Connections retry with exponential backoff starting at **1 s** and doubling
up to **30 s**. After three failed attempts the client falls back to the
alternate transport (WebSocket ↔︎ SSE). Successful connections reset the
backoff timer.

## Authentication
Clients authenticate by providing a `stationId` query parameter when
connecting. The server validates the station and assigns it to the
appropriate rooms.

## Stale‑Data Indicators
The UI exposes a `stale` flag from the transport hook. When `true`, the UI
should show an indicator that data may be outdated.

## Offline Queue Replay
Messages sent while offline are queued and replayed once the connection is
restored. Messages are discarded on page reload to avoid re‑sending stale
actions.

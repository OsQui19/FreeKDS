# TicketGrid

## Accepted schema fields
- `tickets` (TicketCard[], required)
- `stationType` (string, optional)
- `density` (`'comfortable'|'compact'`, optional, default `'comfortable'`)
- `layout` (`'grid'|'list'`, optional, default `'grid'`)
- `onBump` (function, optional)

## Consumed tokens
- `space.md` – gap between tickets
- `color.background` – grid background

## Accessibility notes
- Preserves DOM order for keyboard navigation
- Optional Expo header provides context for screen readers

## Performance budgets
- DOM nodes: container + 1 per ticket
- Render time per 100 tickets: <80ms

## Supported modes
- Layout: grid or list
- Density: comfortable or compact
- Virtualization: not supported
- Grouping: not supported

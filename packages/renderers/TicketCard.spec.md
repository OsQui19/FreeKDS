# TicketCard

## Accepted schema fields
- `orderId` (number|string, required)
- `orderNumber` (number|string, required)
- `orderType` (string, optional)
- `createdTs` (number, required)
- `allergy` (boolean, optional)
- `specialInstructions` (string, optional)
- `stationType` (string, optional)
- `items` (array of items, required)
  - `itemId` (number|string, required)
  - `name` (string, required)
  - `quantity` (number, required)
  - `stationId` (number|string, optional)
  - `modifiers` (string[], optional)
  - `specialInstructions` (string, optional)
  - `allergy` (boolean, optional)

## Consumed tokens
- `color.surface` – card background
- `radius.card` – border radius
- `space.sm` – padding

## Accessibility notes
- Logical tab order ends on bump action button
- High contrast labels for readability

## Performance budgets
- DOM nodes: ~15 + 5 per item
- Render time per 100 tickets: <500ms

## Supported modes
- Density: comfortable, compact
- Layout: n/a
- Virtualization: not supported
- Grouping: not supported

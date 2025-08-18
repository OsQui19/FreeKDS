# ModifierList

## Accepted schema fields
- `modifiers` (string[], required) – names to display

## Consumed tokens
- `space.xs` – spacing between modifiers

## Accessibility notes
- Uses `<ul>`/`<li>` semantics for screen reader announcement
- Items are not focusable

## Performance budgets
- DOM nodes: 2 + 1 per modifier
- Render time per 100 tickets: <100ms

## Supported modes
- Density: comfortable, compact
- Layout: n/a
- Virtualization: not supported
- Grouping: n/a

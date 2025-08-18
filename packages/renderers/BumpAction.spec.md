# BumpAction

## Accepted schema fields
- `label` (string, optional) – text shown on the button

## Consumed tokens
- `space.sm` – padding
- `color.accent` – background color
- `radius.card` – border radius

## Accessibility notes
- Rendered as a `<button>` with the provided label for an accessible name
- Fully keyboard focusable

## Performance budgets
- DOM nodes: 1
- Render time per 100 tickets: <50ms

## Supported modes
- Density: comfortable, compact
- Layout: n/a
- Virtualization: not supported
- Grouping: n/a

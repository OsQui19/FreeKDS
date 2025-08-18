# ExpoHeader

## Accepted schema fields
- `title` (string, required) – heading text

## Consumed tokens
- `color.surface` – background color
- `color.text` – text color
- `space.md` – padding

## Accessibility notes
- Rendered as `<h1>` for proper document structure
- Non-focusable but contributes to screen reader landmarks

## Performance budgets
- DOM nodes: 1
- Render time per 100 tickets: <20ms

## Supported modes
- Density: comfortable, compact
- Layout: n/a
- Virtualization: not supported
- Grouping: n/a

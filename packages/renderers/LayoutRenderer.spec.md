# LayoutRenderer

## Accepted schema fields
- `layout` object per `layout.schema@1.0.0.json`
  - `screens[]` – list of screens
    - `blocks[]` – hierarchical blocks
      - `type` (string, required)
      - `props` (object, optional)
      - `style` (object mapping CSS properties to token references)

## Consumed tokens
- Style values for blocks must reference design tokens only

## Accessibility notes
- Renders blocks in declared order to preserve reading sequence
- Delegates focus management to child components

## Performance budgets
- DOM nodes: depends on layout (target <200 nodes)
- Render time per 100 tickets: <200ms

## Supported modes
- Layout blocks: Grid, Stack, Tabs, TicketList, Filters, Header, Footer
- Density: driven by child components
- Virtualization: not supported
- Grouping: via nested blocks

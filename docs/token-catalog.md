# Token Catalog

This document previews the design tokens used by FreeKDS.

Tokens are resolved in the following order:

1. Base tokens (`tokens/base.json`)
2. Station overrides (`tokens/stations/{id}.json`)
3. Screen overrides (`tokens/screens/{id}.json`)

Later entries override earlier ones, so a screen override wins over a station override which wins over a base token (base → station → screen).

## Visual preview

The example below shows how a base accent color is overridden at the station level
and how a screen can override the background color.

<div style="display:flex;gap:2rem;align-items:flex-end">
  <div style="text-align:center">
    <div style="width:3rem;height:3rem;background:#0d6efd;border:1px solid #ccc"></div>
    <div><code>color.accent → --color-accent</code></div>
  </div>
  <div style="text-align:center">
    <div style="width:3rem;height:3rem;background:#198754;border:1px solid #ccc"></div>
    <div><code>color.accent (station) → --color-accent</code></div>
  </div>
  <div style="text-align:center">
    <div style="width:3rem;height:3rem;background:#e9ecef;border:1px solid #ccc"></div>
    <div><code>color.background (screen) → --color-background</code></div>
  </div>
</div>

Each token entry now uses `type`, `value`, and `description` fields to document its purpose.

## Renderer usage

| Token | Components |
| --- | --- |
| `color.background` | TicketGrid |
| `color.surface` | TicketCard, ExpoHeader |
| `color.accent` | BumpAction |
| `color.text` | ExpoHeader |
| `radius.card` | TicketCard, BumpAction |
| `space.xs` | ModifierList |
| `space.sm` | TicketCard, BumpAction |
| `space.md` | TicketGrid, ExpoHeader |
| `state.timer.info` | TicketCard |
| `state.timer.warn` | TicketCard |
| `state.timer.critical` | TicketCard |
| `state.held` | TicketCard |
| `state.late` | TicketCard |
| `state.expedite` | TicketCard |

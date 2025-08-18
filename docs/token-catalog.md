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

Each token entry now uses `type` and `value` fields with an optional `description`
to document its purpose.

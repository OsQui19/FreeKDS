# Token Catalog

Visual reference for FreeKDS design tokens. Values come from [`tokens/base.json`](../tokens/base.json) and may be overridden per station or screen.

## Colors

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1rem;text-align:center">
  <div>
    <div style="width:3rem;height:3rem;background:#ffffff;border:1px solid #ccc;margin:auto"></div>
    <code>color.background</code>
    <p>Default app background</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#f8f9fa;border:1px solid #ccc;margin:auto"></div>
    <code>color.surface</code>
    <p>Card and surface background</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#212529;border:1px solid #ccc;margin:auto"></div>
    <code>color.text</code>
    <p>Primary text color</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#0d6efd;border:1px solid #ccc;margin:auto"></div>
    <code>color.accent</code>
    <p>Primary brand color</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#dc3545;border:1px solid #ccc;margin:auto"></div>
    <code>color.critical</code>
    <p>Destructive actions and errors</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#ffc107;border:1px solid #ccc;margin:auto"></div>
    <code>color.warning</code>
    <p>Warnings and cautions</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#0dcaf0;border:1px solid #ccc;margin:auto"></div>
    <code>color.info</code>
    <p>Informational messages</p>
  </div>
</div>

## Radius

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1rem;text-align:center">
  <div>
    <div style="width:3rem;height:3rem;background:#e9ecef;border-radius:0.5rem;border:1px solid #ccc;margin:auto"></div>
    <code>radius.card</code>
    <p>Card corner radius</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#e9ecef;border-radius:0.25rem;border:1px solid #ccc;margin:auto"></div>
    <code>radius.button</code>
    <p>Button corner radius</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#e9ecef;border-radius:0.25rem;border:1px solid #ccc;margin:auto"></div>
    <code>radius.field</code>
    <p>Input field corner radius</p>
  </div>
</div>

## Spacing

<table>
<thead><tr><th>Token</th><th>Sample</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>space.xs</code></td><td><div style="width:3rem;height:0.25rem;background:#0d6efd;margin:auto"></div></td><td>Extra small spacing</td></tr>
<tr><td><code>space.sm</code></td><td><div style="width:3rem;height:0.5rem;background:#0d6efd;margin:auto"></div></td><td>Small spacing</td></tr>
<tr><td><code>space.md</code></td><td><div style="width:3rem;height:1rem;background:#0d6efd;margin:auto"></div></td><td>Medium spacing</td></tr>
<tr><td><code>space.lg</code></td><td><div style="width:3rem;height:2rem;background:#0d6efd;margin:auto"></div></td><td>Large spacing</td></tr>
<tr><td><code>space.xl</code></td><td><div style="width:3rem;height:4rem;background:#0d6efd;margin:auto"></div></td><td>Extra large spacing</td></tr>
</tbody>
</table>

## Typography

<table>
<thead><tr><th>Token</th><th>Sample</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>font.size.sm</code></td><td><span style="font-size:0.875rem">Aa</span></td><td>Small font size</td></tr>
<tr><td><code>font.size.md</code></td><td><span style="font-size:1rem">Aa</span></td><td>Medium font size</td></tr>
<tr><td><code>font.size.lg</code></td><td><span style="font-size:1.25rem">Aa</span></td><td>Large font size</td></tr>
<tr><td><code>font.size.xl</code></td><td><span style="font-size:1.5rem">Aa</span></td><td>Extra large font size</td></tr>
<tr><td><code>font.weight.regular</code></td><td><span style="font-weight:400">Aa</span></td><td>Regular font weight</td></tr>
<tr><td><code>font.weight.medium</code></td><td><span style="font-weight:500">Aa</span></td><td>Medium font weight</td></tr>
<tr><td><code>font.weight.bold</code></td><td><span style="font-weight:700">Aa</span></td><td>Bold font weight</td></tr>
</tbody>
</table>

## Shadows & Elevation

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1rem;text-align:center">
  <div>
    <div style="width:3rem;height:3rem;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);margin:auto"></div>
    <code>shadow.sm</code>
    <p>Subtle elevation</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#fff;box-shadow:0 4px 6px rgba(0,0,0,0.1);margin:auto"></div>
    <code>shadow.md</code>
    <p>Card elevation</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#fff;box-shadow:0 10px 15px rgba(0,0,0,0.15);margin:auto"></div>
    <code>shadow.lg</code>
    <p>Modal elevation</p>
  </div>
</div>

## State

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1rem;text-align:center">
  <div>
    <div style="width:3rem;height:3rem;background:#0dcaf0;border:1px solid #ccc;margin:auto"></div>
    <code>state.info</code>
    <p>Timers within target</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#ffc107;border:1px solid #ccc;margin:auto"></div>
    <code>state.warn</code>
    <p>Timers approaching limit</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#dc3545;border:1px solid #ccc;margin:auto"></div>
    <code>state.critical</code>
    <p>Timers over limit</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#6c757d;border:1px solid #ccc;margin:auto"></div>
    <code>state.held</code>
    <p>Held tickets</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#fd7e14;border:1px solid #ccc;margin:auto"></div>
    <code>state.late</code>
    <p>Late tickets</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;background:#198754;border:1px solid #ccc;margin:auto"></div>
    <code>state.expedite</code>
    <p>Expedited tickets</p>
  </div>
</div>

## Density

| Token | Value | Description |
| --- | --- | --- |
| `density.comfortable` | `1` | Base spacing scale |
| `density.compact` | `0.875` | Reduced spacing |
| `density.cozy` | `1.125` | Increased spacing |

## Focus

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:1rem;text-align:center">
  <div>
    <div style="width:3rem;height:3rem;border:2px solid #0d6efd;margin:auto"></div>
    <code>focus.color</code>
    <p>Focus outline color</p>
  </div>
  <div>
    <div style="width:3rem;height:3rem;box-shadow:0 0 0 0.25rem rgba(13,110,253,0.25);margin:auto"></div>
    <code>focus.ring</code>
    <p>Focus ring</p>
  </div>
</div>

## Renderer usage

| Token | Components |
| --- | --- |
| `color.background` | TicketGrid |
| `color.surface` | TicketCard, ExpoHeader |
| `color.accent` | BumpAction |
| `color.text` | ExpoHeader |
| `radius.card` | TicketCard, BumpAction |
| `space.sm` | TicketCard, BumpAction |
| `space.md` | TicketGrid, ExpoHeader |
| `state.info` | TicketCard |
| `state.warn` | TicketCard |
| `state.critical` | TicketCard |
| `state.held` | TicketCard |
| `state.late` | TicketCard |
| `state.expedite` | TicketCard |
| `focus.ring` | BumpAction |


# Feature Flags

Feature flags in FreeKDS are powered by the
[OpenFeature](https://openfeature.dev) SDK with a simple JSON based
provider. Flags are stored in `config/flags.json` and organised by
namespace:

- `ui.*`
- `transport.*`
- `perf.*`

Each flag can be overridden at multiple levels. Resolution happens in the
following order:

1. Global defaults (`global`)
2. Tenant overrides (`tenant/{id}`)
3. Station overrides (`station/{id}`)
4. Screen overrides (`screen/{id}`)

Later levels override earlier ones (tenant → station → screen). The JSON
provider reports the level a flag was resolved from, allowing the Admin UI
to show the provenance of each value. Station‑level changes are polled once
per second, so flipping a flag is reflected in the UI within a single
refresh cycle.

```json
{
  "global": {
    "ui": { "sampleFeature": false },
    "transport": {},
    "perf": { "enableMetrics": false }
  },
  "tenant": {},
  "station": {
    "1": {
      "transport": { "type": "ws", "fallback": "sse" }
    }
  },
  "screen": {}
}
```

Use the `useFeatureFlag` hook to read flag values and provenance:

```js
const { value, source } = useFeatureFlag('transport.type', 'ws', {
  station: '1',
});
```

The Admin panel at **Feature Flags** lists all flags along with the level
that supplied their current value.

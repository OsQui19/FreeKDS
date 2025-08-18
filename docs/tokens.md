# Design Tokens

FreeKDS defines its theme using [Design Token Community Group](https://design-tokens.github.io/community-group/format/) (DTCG) files. Each token entry uses the shape:

```
{ "type": "…", "value": …, "description": "" }
```

## Override order

Tokens are layered so that later sources override earlier ones:

1. **Base theme** – `tokens/base.json`
2. **Station override** – `tokens/stations/{id}.json`
3. **Screen override** – `tokens/screens/{id}.json`

The final value for any token is resolved base → station → screen.

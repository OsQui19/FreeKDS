# Token Catalog

This document previews the design tokens used by FreeKDS.

Tokens are resolved in the following order:

1. Base tokens (`tokens/base.json`)
2. Station overrides (`tokens/stations/{id}.json`)
3. Screen overrides (`tokens/screens/{id}.json`)

Later entries override earlier ones (base → station → screen).

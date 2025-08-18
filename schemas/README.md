# JSON Schemas

This directory contains JSON schemas for FreeKDS core entities. Schemas follow the [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema) specification. Files are versioned using a semantic component appended after `@` in the filename (for example, `order.schema@1.0.0.json`).

## Versioning policy

- **Patch (`1.0.0` → `1.0.1`)**: Backwards-compatible fixes that do not change validation semantics.
- **Minor (`1.0.0` → `1.1.0`)**: Backwards-compatible extensions such as adding optional properties or relaxing constraints.
- **Major (`1.0.0` → `2.0.0`)**: Backwards-incompatible changes including removed or renamed properties or stricter validation rules.

When a new version is added, update `schema-index.json` with the canonical `$id` and file path.

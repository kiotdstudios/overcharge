# Level JSON Schema — see `docs/LEVEL_SCHEMA.md`

Per Chief decision (2026-09-04), the **canonical** level schema document is:

**→ [`docs/LEVEL_SCHEMA.md`](../docs/LEVEL_SCHEMA.md) (owned by Aki, runtime-validated by Orcha)**

This file (`editor/SCHEMA.md`) is retained only as a pointer so anyone browsing the `editor/` folder finds their way to the canonical document. **Do not add schema content here** — it will become out-of-sync with the source of truth.

## Orcha's runtime answers to Aki's 8 open questions

See **[`docs/SCHEMA_ANSWERS_FROM_ORCHA.md`](../docs/SCHEMA_ANSWERS_FROM_ORCHA.md)** — runtime-verified answers to the 8 provisional items in `docs/LEVEL_SCHEMA.md`. Aki uses these to update the canonical schema.

## Changing the schema

1. Aki proposes changes in `docs/LEVEL_SCHEMA.md`.
2. Orcha verifies the runtime supports (or can support) the change.
3. Coordinated commit that updates both `docs/LEVEL_SCHEMA.md` AND the runtime loader in one push.
4. Never silently rename fields. Additive-only in v1; breaking changes require explicit `schemaVersion` bump.

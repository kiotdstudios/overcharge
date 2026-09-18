# AKI STATUS — 2026-09-18

## Delivery: A9 — Chest in Builder (ORDER AKI 10)

**Branch:** agent/aki-editor
**HEAD:** 362e5ba (level3 cleanup + prior status)

---

### A9 — Chest in Builder — COMPLETE

All work was in place from c20decd. ORDER AKI 10 received 2026-09-18, verified clean against spec.

**What is implemented:**
- `+ Chest` spawn button in SPAWN OBJECTS panel (`editor.html` — id `spawn-chest`)
- `spawn-chest` → `kind='chest'` binding in `editor/main.js` button table
- `_doSpawn` chest case: grid-snapped X, content-bottom grounded Y (`_groundAt` with `CHEST_H=104`), schema `{id, x, y, cost:2, reward:10}`
- Inspector fields: `id`, `x`, `y`, `cost` (min 0), `reward` (min 0), badge CHEST color `#e8aa33`
- `ASSET_MANIFEST.json`: one palette entry `id=chest`, `spawnsKind=chest`, path=`assets/objects/chest/closed.png` (128×128), `_runtime_state_sprites[]` holds all 10 state frames — none placeable
- `renderer.js` `_drawChests`: draws `closed.png` at `(ch.x-12, ch.y-12)` so content box `(ch.x, ch.y, 104, 104)` aligns; faint content-box outline; schematic fallback with ID+cost label
- `CHEST_BOT_PAD=12` uniform per GEOMETRY.md — content anchored from bottom, top variance of frame_008 (11px vs 12px) noted and ignored per GEOMETRY.md
- `frame_000` IS used (hash-verified different from `closed.png`, per GEOMETRY.md — second convention break after generator)

**Verification:**
- `chest_builder.mjs` 45/45 — covers manifest entry, state frames NOT placeable, boundingRect 104×104, spawn defaults cost:2/reward:10, grid alignment, schema shape
- Parity 386/0 · fence_switch ✓ · energy_authority ✓ · crate_timed ✓ · test_electricity ✓ · drone_patrol 17/0
- Boot smoke port 8422: `editor.html` 200, `assets/objects/chest/closed.png` 200 (5724 bytes)

---

### Blocked
- **A10** (vertical expansion): waiting on Orcha runtime accepting variable height

### Ready
- Nothing unblocked in Aki's lane until A10 runtime lands from Orcha.

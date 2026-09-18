# AKI STATUS — 2026-09-18

## Delivery: A9 — Chest in Builder

**Branch:** agent/aki-editor
**Head prior to this commit:** 5d36f60 (merge of live line including chest assets)

---

### A9 — Chest spawn button + palette entry

**Unblocked by:** KIRO_ORDER_AKI_10 + ORCHA_CHEST_V1_SEMANTICS (schema ratified 2026-09-18, merged via 1f49435)

#### Changes
- `editor.html`: `+ Chest` button added to SPAWN OBJECTS panel (after `+ Crate`)
- `editor/main.js`:
  - `_doSpawn` — `'chest'` branch: `_snapGrid(x)`, `_groundAt(x, y, 104)`, defaults `cost:2 reward:10`, pushes to `L.chests[]`
  - kindMap entry `'chest':'chest'`
  - Button wiring `['spawn-chest','chest']`
  - Inspector case: id, x, y, cost, reward fields (color `#e8aa33`)
  - `_gameDiff` tracks `['chests','chest']`
- `editor/selection.js`: chest added to `state.selection`, `SET_KINDS`, `selectedRefs`, `clearSelection`, `selectByKind`, `toggleByKind`, `isRefSelected`, `boundingRect` (104×104 content box), `objectAt`, `objectsInRect`
- `editor/renderer.js`: chest color `#e8aa33`, `_drawChests(ctx, L.chests)` call + selection outline, `_drawChests` function (draws closed.png at art offset -12,-12 from content origin; schematic fallback)
- `assets/ASSET_MANIFEST.json`: `chest` palette entry (`spawnsKind:'chest'`, path `closed.png`, 128×128 canvas). State frames (`open_empty`, `opening/frame_000..008`) in `_runtime_state_sprites[]` only — NOT in `assets[]`

#### Geometry contract (GEOMETRY.md)
- Canvas 128×128 · content 104×104 · botPad=12 all sides (uniform)
- `x,y` in JSON = top-left of content box. Art drawn at `(x-12, y-12)` world coords.
- `frame_000` is a REAL frame in this pack (hash-verified different from `closed.png`)

#### Tests
- `_dev/chest_builder.mjs` (new): 45 pass / 0 fail
  - Manifest: chest in assets[], state frames NOT in assets[], state frames in _runtime_state_sprites[]
  - boundingRect: 104×104 content box
  - Spawn defaults: cost:2, reward:10, grid-aligned x, no w/h in schema
- All prior suites green: parity_regression 386/0, fence_switch 74/0, energy_authority 88/0, crate_timed 87/0, test_electricity 37/0, drone_patrol 17/0
- Boot smoke: BOOT_SMOKE_OK (port 8451)

---

### Block status
- **A10** (vertical expansion): still blocked — Orcha runtime must accept variable level height first

# AKI STATUS — 2026-09-17

## Delivery: A12 / A13 / A14 + purge cleanup

**Branch:** agent/aki-editor  
**HEAD:** 44a48c8 (prior to this commit)  

---

### A12 — Drone patrol follows placement
- `editor/actions.js`: `placeDrone` now translates `patrolLeft`/`patrolRight` by the same delta applied to `x`, keeping the patrol range locked to the drone's final position.
- Test suite: `_dev/drone_patrol.mjs` — 17 pass / 0 fail (covers undo/redo).

### A13 — Drone in asset bank
- `assets/ASSET_MANIFEST.json`: drone entries added (idle + shooting, 9 frames each).
- Thumbnail visible in editor asset browser under category `enemy`.

### A14 — Missing-art label for broken deco refs
- `editor/renderer.js`: decorations whose `src` fails to load now render a visible missing-art label instead of a silent blank box.

### A11 bugfix (self-caught)
- Player spawn was inserting into the wrong array. Fixed during A13 work.
- `state.js` `filteredManifestItems`: `player`-category and `spawnsKind` assets now exempt from Purple City quick-filter (they're meta-objects, not tileset art).

### Level 3 cleanup (this commit)
- Removed 6 broken decoration entries referencing `assets/tilesets/purple_city/platforms/platform_long_a.png` (archived 2026-09-12 purge, file does not exist).
- Decorated array now empty — no missing-art labels will appear in Level 3.

---

### Suite floor
- **Parity:** 386/0  
- **Boot smoke:** clean (port 8421)  
- **Working tree:** clean after this commit

### Blocked
- **A9** (chest in Builder): waiting on O7 ratification by Chief  
- **A10** (vertical expansion): waiting on O8 + Orcha runtime

### Ready
- Nothing unblocked in Aki's lane until O7/O8 land.

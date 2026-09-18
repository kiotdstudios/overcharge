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

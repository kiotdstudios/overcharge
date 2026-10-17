# AKI — ORDER: TOOLS PANEL LAYOUT REWORK

**From:** Kiro (Technical Chief) · **Authority:** Chief directive + mockup, 2026-09-12
**Branch:** work on `agent/aki-editor`. Kiro QA-gates the merge to `agent/orcha-gameplay`.

## Chief's words

> "layout wise i want the tools ui to look like this; dont add any new tools
> other than the level section and test section"

Chief supplied a mockup of the editor's left tools panel. This order translates
it into buildable spec. **This is a LAYOUT reorganization of existing controls.
Zero new editing functionality.** The only NEW UI is the LEVEL section and the
TEST section — and both are repackagings of controls that already exist.

## Target layout (top to bottom)

Numbered, collapsible sections with yellow number badges and section headers,
dark navy panel, yellow accent for the active tool (match the mockup's visual
language: `#0d1420`-ish panel, yellow `#ffd400`-ish badges/accents, rounded
bordered buttons).

### Header
- Wrench icon · **PLATFORM MAP EDITOR** · subtitle `BUILD / EDIT / PLAYTEST`
- **HIDE** button on the right = the existing `#btn-inspector-hide` behavior
  (panel collapse/restore via `#inspector-show-tab`).

### 1 — LEVEL  *(new section, existing controls repackaged)*
- Prev `◀` / Next `▶` buttons: step through the levels currently in
  `#level-select` (same guarded switch — unsaved-changes warning must still fire).
- Center readout: `LEVEL <n>` + name, save state (`SAVED`/`UNSAVED`), and the
  level checksum — all values the status strip already computes today.
- Right: **SNAPSHOTS** chip showing the snapshot count for this level; clicking
  it opens the existing history dialog (`#btn-history`).
- Keep `#level-select` itself (the dropdown) available — either as the center
  readout's click-to-open or kept in the section; Aki's choice, document it.

### 2 — TOOLS  *(existing tools ONLY — restyled, not extended)*
Mockup shows: Select, Paint, Rect, Ellipse, Fill, Eraser, Pan.
**Map to what exists; do NOT build Ellipse or Fill:**

| Mockup | Existing control | Note |
|---|---|---|
| Select | `pointer` (1) + `select` (2) | keep BOTH existing buttons |
| Paint | `place` (3) | relabel allowed, e.g. "Place" or "Paint" |
| Rect | `rect` (6) | as-is |
| Ellipse | — | **OMIT — does not exist, do not add** |
| Fill | — | **OMIT — does not exist, do not add** |
| Eraser | `erase` (4) | as-is |
| Pan | `pan` (5) | as-is |

Below the tool row, same line as mockup: `Grid` / `Guards` / `Magnetic Snap`
checkboxes (`#grid-toggle`, `#guards-toggle`, `#magnetic-toggle`) + the `Snap`
dropdown (`#snap-select`). All existing keyboard shortcuts (1–6, G) unchanged.

### 3 — ARRANGE  *(existing controls)*
Row 1: `#btn-layer-front`, `#btn-layer-forward`, `#btn-layer-backward`,
`#btn-layer-back`. Row 2: `#btn-rotate`, `#zoom-out`, `#zoom-reset`, `#zoom-in`.
Shortcuts (Shift+]/[, ], [, R, -, 0, +) unchanged.

### 4 — EDIT  *(existing controls)*
`#btn-undo`, `#btn-redo`. Redo renders disabled-style when the redo stack is
empty (mockup shows the greyed state). Ctrl+Z / Ctrl+Y unchanged.

### 5 — LEVEL ACTIONS  *(existing controls)*
- Row 1: `#btn-new` NEW · `#btn-duplicate` DUPLICATE · `#btn-upload` UPLOAD · `#btn-generate` GEN
- Row 2: `#btn-snapshot` SNAP · `#btn-history` HIST · `#btn-order-up` ORDER ↑ · `#btn-order-down` ORDER ↓
- Danger row (keep the warn/orange styling): `#btn-revert-local` REVERT TO GIT · `#btn-delete-level` DELETE LEVEL
- Backup row: `#btn-export-backups` EXPORT BACKUPS · `#btn-import-backups` IMPORT BACKUP

### 6 — TEST  *(new section, existing controls repackaged)*
- Status block (the mockup's yellow text): whether the game currently plays a
  LOCAL UNSAVED TEST level vs committed JSON, + editor checksum. This is the
  existing TEST LIVE / parity-strip state (`overcharge.testLevel`, the
  `parityStatus` messaging) surfaced here.
- **PLAY TEST** button = existing `#btn-test` (TEST LIVE). Keep `#btn-play`
  (PLAY, committed/dev mode) here too — mockup's QA row already had both;
  label them so the LOCAL vs COMMITTED distinction Chief relies on stays loud.

### SPAWN OBJECTS *(existing, collapsed by default)*
The existing spawn row (`#spawn-drain`, `#spawn-patrol`, `#spawn-drone`,
`#spawn-source`, `#spawn-switch`, `#spawn-gate`, `#spawn-checkpoint`,
`#spawn-platform`) moves into a collapsed section at the bottom, exactly as the
mockup shows. NOTE: drain/patrol spawners reference deleted drain-enemy art
(2026-09-12 asset purge) — leave the buttons functional, do not touch art.

### Left icon rail (TOOLS / TILES / ENTITIES / LEVELS / SETTINGS)
Build the rail **as navigation for content that already exists**: TOOLS = this
panel; TILES/ENTITIES = the existing palette/spawn groupings; LEVELS = section 1
focus; SETTINGS = only if an existing settings surface exists — otherwise OMIT
the icon. No new settings screen under this order.

## Constraints (non-negotiable)

1. **No new tools, no new editing behavior.** No Ellipse, no Fill, nothing else.
2. **Every existing element ID listed above keeps working** — `main.js` wires
   by ID; renames/removals of IDs are how buttons silently die. If restructuring
   requires touching `editor/main.js` wiring, keep changes mechanical and note them.
3. SAVE / FOLDER / save-status strip (Order 005 surfaces) stay visible and
   unchanged in behavior — checksum + verified-save flash must remain readable.
4. Keyboard shortcuts unchanged.
5. Do not touch `editor/persistence.js`, `editor/localstore.js`, or level JSON.
6. Editor must still boot headless-clean: Kiro's gate runs parity (75),
   electricity (37), energy (72), boot smoke, plus a click-audit of every
   relocated button.

## Handoff format

ORDER TOOLS_UI_LAYOUT: COMPLETE / BLOCKED · files changed · which mockup items
were mapped vs omitted (with reason) · tests run with counts · AKI_STATUS.md
updated · full SHA · pushed to `agent/aki-editor` · then HOLD for Kiro's QA gate.

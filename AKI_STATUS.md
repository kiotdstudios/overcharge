# AKI STATUS — OVERCHARGE
_Updated: 2026-09-12 ET_

## Branch: agent/aki-editor
**Worktree:** `C:/Users/diepowel/Documents/GitHub/overcharge-aki`
**HEAD: 83a7a0d**

---

## ORDER TOOLS_UI_LAYOUT — COMPLETE / HOLD FOR KIRO QA GATE

| Deliverable | Status |
|-------------|--------|
| New inspector panel: icon rail + 6 numbered sections | DONE |
| §1 LEVEL: prev/next nav, readout (lss-name/state/snaps), snapshots chip | DONE |
| §2 TOOLS: all existing tool buttons | DONE |
| §3 ARRANGE: layer + zoom | DONE |
| §4 EDIT: undo/redo | DONE |
| §5 LEVEL ACTIONS: new/dupe/upload/gen/snap/hist/order/revert/delete/backup | DONE |
| §6 TEST: parity-status + PLAY + TEST LIVE | DONE |
| SPAWN OBJECTS (collapsed) | DONE |
| SELECTED OBJECT (hidden) | DONE |
| DEV QA (collapsed) | DONE |
| Toolbar cleanup: removed LEVEL label, level-select, btn-play, btn-test | DONE |
| data-sec collapser fix (all 8 sections mapped to correct tp-body IDs) | DONE |
| main.js: btn-level-prev/next wired (guarded step through levelSelect) | DONE |
| main.js: level-nav-readout click (inline level selector) | DONE |
| main.js: btn-snaps-chip delegates to btn-history | DONE |
| main.js: icon rail scroll + active state | DONE |
| main.js: snaps-chip-count synced in refreshStatusStrip() | DONE |
| Parity regression | 75/75 PASSED |

### Commits
| SHA | What |
|-----|------|
| ecd4e21 | Merge orcha-gameplay into aki-editor (84+33=117 assets) |
| 83a7a0d | layout: TOOLS_UI_LAYOUT complete — new inspector panel, icon rail, §1-6, toolbar cleanup |

### Rollback
| SHA | Label |
|-----|-------|
| 5192356 | Pre-TOOLS_UI_LAYOUT baseline |
| ecd4e21 | Post-merge (pre-layout) |
| 83a7a0d | HEAD — TOOLS_UI_LAYOUT complete |

---

## Order #1 — COMPLETE (Chief-verified)

| # | Priority | Status |
|---|----------|--------|
| P1 | Save/Play pipeline | CHIEF VERIFIED |
| P2 | Dev level switcher [ / ] | CHIEF VERIFIED |
| P3 | Placement anchoring (snap to terrain) | CHIEF VERIFIED |
| P4 | Gate purple line fix | CHIEF VERIFIED |
| P5 | Jump-over-gate fix | CHIEF VERIFIED |
| P6 | Editor UI Tools Panel | CHIEF VERIFIED |

---

## Order #3 — Code complete / Partial Chief visual QA

Base commit: b653616 (snapshot safety, status strip, DEV QA, build label)

| SHA | What |
|-----|------|
| 5862d47 | Object visibility, source coord fix, level delete, selection bounds fix |
| 2e9554b | Gate sprite: draw gate_closed.png (64x128) matching game anchor |
| 05af658 | Generator floor fix: 1px transparent row, draw at y+h-62 |
| 58575d6 | Image load race fix, gate type tints, switch glow-rect, checkpoint render |

| Fix | Code | Chief Visual |
|-----|------|--------------|
| Objects visible on canvas | CODE VERIFIED | REQUIRED |
| Source/generator sprite placed correctly | CODE VERIFIED | REQUIRED |
| Generator no 2px float | CODE VERIFIED | REQUIRED |
| Gate renders gate_closed.png 64x128 bottom-aligned | CODE VERIFIED | REQUIRED |
| EXIT/BARRIER/GATE tints + labels | CODE VERIFIED | REQUIRED |
| Switch: orange glow-rect + SW glyph | CODE VERIFIED | REQUIRED |
| Checkpoint: green 22x22 box + CP glyph | CODE VERIFIED | REQUIRED |
| Level delete button works | CODE VERIFIED | REQUIRED |
| Image load race fix | CODE VERIFIED | LOGIC ONLY |

---

## Known Open Issues (unassigned)

| Issue | Priority |
|-------|----------|
| Enemy sprites not loaded in editor (red hitbox box) | P2 |
| [ ] level switching needs PLAYING state first | P3 |
| buildinfo.js stale SHA | P3 |
| No placement UI for switch/checkpoint/enemy | P2 |
| FireWatcher CMD=["py",...] wrong Python (FIRESQUAD) | P2 |

---

## NOT STARTED (HOLDING)

- Switch authoring tools
- Moving platform authoring tools
- Enemy sprite loading in editor
- Kiro parity defect fixes (wait for Chief/TD assignment)

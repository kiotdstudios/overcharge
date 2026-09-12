# AKI STATUS — OVERCHARGE
_Updated: 2026-09-06 ET_

## Branch: agent/orcha-gameplay
**Worktree:** `C:/Users/diepowel/Documents/OVERCHARGE-orcha`
**HEAD: 58575d64e41df219f5bc7dadf7b6fb78ae87ad8b**

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

### Commits after b653616

| SHA | What |
|-----|------|
| 5862d47 | Object visibility, source coord fix, level delete, selection bounds fix |
| 2e9554b | Gate sprite: draw gate_closed.png (64x128) matching game anchor |
| 05af658 | Generator floor fix: 1px transparent row, draw at y+h-62 |
| 58575d6 | Image load race fix, gate type tints, switch glow-rect, checkpoint render |

### QA Matrix

| Fix | Code | Chief Visual |
|-----|------|--------------|
| Objects visible on canvas (not 14x14 hitbox boxes) | CODE VERIFIED | REQUIRED |
| Source/generator sprite placed correctly | CODE VERIFIED | REQUIRED |
| Generator no 2px float | CODE VERIFIED | REQUIRED |
| Gate renders gate_closed.png 64x128 bottom-aligned | CODE VERIFIED | REQUIRED |
| EXIT: magenta tint + EXIT label | CODE VERIFIED | REQUIRED |
| BARRIER: orange tint + BARRIER label | CODE VERIFIED | REQUIRED |
| GATE: cyan tint + GATE label | CODE VERIFIED | REQUIRED |
| Switch: orange glow-rect + SW glyph (no sprite; procedural) | CODE VERIFIED | REQUIRED |
| Checkpoint: green 22x22 box + CP glyph (no sprite; procedural) | CODE VERIFIED | REQUIRED |
| Level delete button works | CODE VERIFIED | REQUIRED |
| Image load race fix | CODE VERIFIED | LOGIC ONLY |
| Save -> Play pipeline | CODE VERIFIED | CHIEF VERIFIED (Order #1) |
| No purple strip at rest | CODE VERIFIED | CHIEF VERIFIED (Order #3 test pass) |
| Gate blocks jump | CODE VERIFIED | CHIEF VERIFIED (Order #3 test pass) |

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

## Rollback Points

| SHA | Label |
|-----|-------|
| b653616 | Order #3 base |
| 5862d47 | Object visibility + level delete |
| 2e9554b | Gate sprite |
| 05af658 | Generator floor fix |
| 58575d6 | HEAD |

---

## NOT STARTED (HOLDING)

- Switch authoring tools
- Moving platform authoring tools
- Enemy sprite loading in editor
- Kiro parity defect fixes (wait for Chief/TD assignment)

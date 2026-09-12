# ORCHA — ORDER: PLACEMENT GUARDS, then GROUNDED HAZARD

**From:** Kiro (Technical Chief) · **Date:** 2026-09-12
**Branch:** `agent/orcha-dev` — **sync from `agent/orcha-gameplay` first**, it has moved
(checkpoint art, 5 field-report fixes, Aki's crate art + editor support).
Kiro QA-gates the merge. Do P1 before P2.

---

## P1 — PLACEMENT GUARDS (do this first, it is small and it closes a live defect)

**Why:** Chief reported today that *"objects seem to be hovering on top of the
ground; objects need to snap to the grid and be placed on round tiles."* He was
right. Root causes were found and fixed:

- the Builder's **checkpoint spawn never snapped at all** (`Math.round(wx/wy)` —
  no grid snap, no ground snap), and drone spawn skipped snapping too
- `level1.json` had already been authored with `CP1` at `y=168` where the ground
  surface is `224` — **floating 56px** — plus an off-grid generator

Both are fixed and pushed (`4f220d2`). **But nothing prevents it recurring.** The
Builder can still be dragged, and hand-edited JSON can reintroduce it silently.
This is the same situation as the required-less gate: fixed once, then guarded so
it can never ship again.

### Required guards in `_dev/parity_regression.mjs`

For every authored level (**and the descriptive `N_NAME.json` twins** — you
already widened that scan, keep it):

1. **Grid alignment on X.** `x % 32 === 0` for sources, gates, switches,
   checkpoints, crates, platforms.
2. **Grounded on Y**, using the same first-solid-tile-below contract the runtime
   and `_groundAt` use:
   - sources: `y + 28 === surfaceY`
   - gates: `y + h === surfaceY`
   - switches: `y + 22 === surfaceY`
   - checkpoints: `y === surfaceY` (its `y` IS the standing-ground line)
   - crates: `y + h === surfaceY`
3. **Deliberate exemptions — do NOT flag these:**
   - `enemies` of `type: 'drone'` — a hovering enemy is *supposed* to float
   - `platforms` — moving platforms legitimately sit in mid-air
   - Any object whose column has **no solid tile at all** (over a pit) — report it
     as a distinct, clearer failure ("placed over a bottomless column") rather
     than a confusing grounding mismatch.
4. **Y is allowed to be off-grid when grounding requires it.** A 28px-tall source
   resting on a surface at 224 must be at `y=196`, which is not a multiple of 32.
   Grounding wins over grid-alignment on the Y axis — do not assert `y % 32`.

Do not "fix" any level data under this order; if a guard fires on existing
content, report it and stop. Chief's authored levels are his.

---

## P2 — GROUNDED HAZARD (GDD Level 6, art-free by design)

**Only after P1 is merged.**

GDD §7 lists a *Grounded Enemy*: "creates an area where electrical abilities are
weakened or disabled", and §11 Level 6 is built on it. It is the last GDD engine
gap. §12's MVP also asks for a second enemy type.

**Build it as an ENVIRONMENTAL ZONE, not a character.** Chief purged the
drain-enemy art, so a new enemy would be blocked on an art decision. A grounded
*zone* needs **no character art** and unblocks Level 6 immediately.

### v1 semantics — propose before implementing (same as CRATE_TIMED)

Write `docs/ORCHA_GROUNDED_ZONE_V1_SEMANTICS.md` with numbered decisions and HOLD
for ratification. Points you must decide and justify:

- **Schema:** likely `groundedZones: [{ id, x, y, w, h }]`. Absent/empty = zero
  behavioural change to every existing level.
- **Effect while the player is inside:** does absorb fail, discharge fail, or
  both? Recommend: **both are refused** — that is what "electrical abilities
  disabled" means, and it must be a refusal with an honest reason, not a silent
  no-op (D4 doctrine from the crate ruling).
- **Does it DRAIN stored charge, or merely block using it?** Recommend blocking
  only for v1 — draining is a second, harsher mechanic and the GDD says
  "weakened or disabled", not "emptied".
- **HUD:** the player must be told *why* their ability just stopped working.
  Reuse the existing prompt channel; state the wording.
- **Visual:** must be readable without new art (tint/hatch/scanline over the zone
  is acceptable). Powered things inside it should read as suppressed.
- **Snapshot:** does the zone hold any mutable state? If not, say so explicitly.
- **Conservation:** blocking must not create or destroy energy. Conservation
  invariant (§7) stays green.

### Constraints

- All energy interaction through the Order 004 authority. No second code path.
- No new art dependencies. No character enemy.
- Tests: zone blocks absorb, blocks discharge, refuses honestly with a reason,
  player keeps existing charge, leaving the zone restores normal ability,
  conservation unaffected, schema round-trips. All suites 0 failed.
- Hand-author a test level (a `99_` file kept OUT of `levels.json`, as you did
  for the crate testbed) and boot it headlessly.

---

## Handoff

`ORDER PLACEMENT_GUARDS: COMPLETE / BLOCKED` then, separately,
`GROUNDED_ZONE SEMANTICS: AWAITING RATIFICATION`. Tests with counts,
ORCHA_STATUS.md updated, full SHA, pushed to `agent/orcha-dev`, then HOLD.

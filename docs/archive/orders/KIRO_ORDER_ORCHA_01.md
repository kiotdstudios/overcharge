# KIRO ORDER — ORCHA 01

> **Chief will say: "read ORCHA 01 from Kiro."**
> This file is self-contained. You do not need any other order doc to start.

**From:** Kiro (Technical Director) · **Date:** 2026-09-12
**Branch:** `agent/orcha-dev` — **sync from `agent/orcha-gameplay` first.**
Kiro QA-gates the merge. Do O1 before O2.

---

## Status: your fence work is MERGED and LIVE

`FENCE_SHORT_CIRCUIT` passed QA at **451/0** and is on the live line. Verified
independently: `frame_000` absent from both animation arrays (so the rest-pose bug
is impossible by construction, not by convention), shipped levels carry no `style`
field, testbed excluded from the manifest, and your F7 ruling honoured end to end.

Your mutation testing is now cited as the project standard — including that you
caught a **false green** where the shell mangled a template literal and the suite
"passed" a mutation that never applied. Checking the file instead of trusting the
exit code is the behaviour I want repeated.

**Chief has confirmed the mechanic reads correctly to him:**

> "wall switch needs to be overcharged to open electric fence blocking player from
> x path; the logic is the same"

So **no runtime changes are requested.** "Overcharged" is Chief's word for charging
it to completion, which is what you built. Nothing to redo.

---

## O1 — PLACEMENT GUARDS (do this first; it is small)

**Why it still matters even though the bug is fixed.** Chief reported objects
hovering off the ground. The *causes* are all repaired now — spawn snapping, drag
snapping (`SNAP_GAMEPLAY_DEFAULT` 16 → 32 plus a re-anchor pass), a `tileIsSolid`
misuse that reported "solid" on the first row scanned for any object past column 10,
and every committed level re-grounded. **Nothing prevents recurrence.** Hand-edited
JSON or a future tool change reintroduces it silently. Same pattern as the
required-less gate: fixed once, then guarded forever.

### Required in `_dev/parity_regression.mjs`

For every authored level **and the descriptive `N_NAME.json` twins** (keep your
widened scan — that hole predated this order and is most of why parity jumped):

1. **Grid alignment on X**: `x % 32 === 0` for sources, gates, switches,
   checkpoints, crates, platforms.
2. **Grounded on Y**, using the same first-solid-tile-below contract the runtime and
   `_groundAt` use:
   - sources `y + 28 === surfaceY` · gates `y + h === surfaceY`
   - switches `y + 22 === surfaceY` · checkpoints `y === surfaceY` (its `y` IS the
     standing-ground line) · crates `y + h === surfaceY`
3. **Deliberate exemptions — do NOT flag:**
   - enemies of `type:'drone'` — a hovering enemy is supposed to float
   - `platforms` — moving platforms legitimately sit in mid-air
   - any object over a column with **no solid tile at all** → report as its own
     clearer failure ("placed over a bottomless column"), not a grounding mismatch
   - skip `*_prev_backup.json` (Builder safety copy, gitignored)
4. **Do NOT assert `y % 32`.** A 28px-tall source resting on a surface at 224 must
   sit at `y=196`. Grounding wins over grid-alignment on the Y axis.
5. **Do NOT add a "margin must be positive" assertion.** Levels 1 and 2 are
   deliberately margin 0 and are solvable because they have no enemies and no waste
   path. Positive margin is only required where an enemy can knock charge loose.

### Expected results (I ran this audit — do not be surprised)

Chief's content is **clean**; do not touch it:
```text
level1 / 1_NEON_RISE   energy 8 vs exit 8 (margin 0)   grounded + on grid
level2                 energy 10, spend 2+8 = 10       grounded + on grid
level3 / 3_LEVEL_3     energy 15 vs exit 8             grounded + on grid
```

**Your own crate testbed WILL fail**, and it is yours to fix:
```text
99_CRATE_TIMED_TESTBED.json
  source GEN_A   floating 36px
  source GEN_B   floating 36px
  checkpoint CP1 floating 64px
```
Ground those three. **Do not exempt your own testbed to make the suite pass** — that
defeats the guard.

**Note:** a spawn-reachability guard already exists (I added it after Chief got
trapped by a closed gate sealing a horizontal region — `blocksHorizontal` ignores Y
by design). Do not duplicate it; extend around it.

---

## O2 — GROUNDED HAZARD (GDD Level 6) — after O1 merges

Last GDD engine gap. GDD §7 lists a *Grounded Enemy*: "creates an area where
electrical abilities are weakened or disabled"; §11 Level 6 is built on it.

**Build it as an ENVIRONMENTAL ZONE, not a character.** Chief purged the drain-enemy
art, so a new enemy would stall on an art decision. A zone needs **no character
art** and unblocks Level 6 immediately.

**Propose semantics in `docs/ORCHA_GROUNDED_ZONE_V1_SEMANTICS.md` and HOLD for
ratification before implementing** — that process caught a guaranteed runtime crash
on paper in CRATE_TIMED, and caught my own three factual errors in the fence order.

Points you must decide and justify:
- **Schema:** likely `groundedZones: [{ id, x, y, w, h }]`. Absent/empty = **zero**
  behavioural change to every existing level.
- **Effect inside:** does absorb fail, discharge fail, or both? My recommendation:
  **both refused, honestly, with a stated reason** — that is what "abilities
  disabled" means, and a silent no-op violates D4 doctrine.
- **Drain or merely block?** Recommend **block only** for v1 — the GDD says
  "weakened or disabled", not "emptied".
- **HUD:** the player must be told *why* their ability stopped working.
- **Visual:** readable with **no new art** (tint / hatch / scanline is fine).
- **Snapshot:** does the zone hold mutable state? If not, say so explicitly.
- **Conservation:** blocking must not create or destroy energy; §7 invariant stays
  green.

**Constraints:** all energy through the Order 004 authority · no new art · no
character enemy · tests for blocks-absorb, blocks-discharge, honest refusal, charge
preserved, leaving restores ability, conservation, schema round-trip · hand-author a
`99_` testbed kept **out** of `levels.json` and boot it headlessly.

---

## Gate criteria

parity (177/0 baseline) · fence_switch 62/0 · energy 88/0 · crate_timed 87/0 ·
electricity 37/0 · boot smoke · testbed headless boot. All suites 0 failed. Push to
`agent/orcha-dev` and HOLD.

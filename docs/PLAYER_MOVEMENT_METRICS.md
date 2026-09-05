# OVERCHARGE — PLAYER MOVEMENT METRICS (baseline)

**Purpose.** Authoritative measurement of the current controller. All future
level-design decisions ("can the player reach this?") cite from this table.
**No player-movement values were changed to produce these measurements.**

**Measured on:** commit at time of instrumentation (`be602ee` line +
`_metrics.mjs` harness). Fixed timestep dt = 1/60s (16.67ms). Runtime uses
`requestAnimationFrame` with `dt` clamped to 0.05s; at typical 60Hz these
match.

---

## 1. SOURCE CONSTANTS AND FUNCTIONS

Read directly from source:

| Constant | Value | File |
|---|---|---|
| `TILE` | 32 px | `src_scroll/constants.js:4` |
| `W`, `H` | 800, 450 | `src_scroll/constants.js:2-3` |
| `ROWS`, `COLS` | 14, 25 | `src_scroll/constants.js:5-6` |
| `GRAVITY` | 900 px/s2 | `src_scroll/constants.js:9` |
| `PLAYER_SPEED` | 75 px/s | `src_scroll/constants.js:10` |
| `JUMP_FORCE` | -430 px/s | `src_scroll/constants.js:11` |
| `PLAYER_W` | 20 px | `src_scroll/constants.js:12` |
| `PLAYER_H` | 30 px | `src_scroll/constants.js:13` |
| `RUN_MULTIPLIER` | 1.7 | `src_scroll/constants.js:56` |
| Terminal vy clamp | 700 px/s | `src_scroll/player.js:138` (`this.vy = Math.min(this.vy, 700)`) |
| `COYOTE_TIME` | 0.1 s | `src_scroll/player.js:17` |
| `JUMP_BUFFER` | 0.1 s | `src_scroll/player.js:18` |
| Floor-press cap | vy=60 while grounded | `src_scroll/player.js:146` |
| Drop-through window | 0.25 s | `src_scroll/player.js:151` |
| Ground friction | vx ×= 0.75 per frame | `src_scroll/player.js:122` |
| Stunned friction | vx ×= 0.8 per frame | `src_scroll/player.js:105` |

**Update order per frame** (from `Player.update`, `src_scroll/player.js:76-99`):
1. `_updateContext(level)` — near-source/device/enemy detection
2. `_handleMovement(dt)` — reads input, sets `vx`, applies jump impulse if buffered
3. `_applyPhysics(dt, level)` — `vy += GRAVITY*dt`, terminal clamp, floor-press cap, drop-through window, X collision resolve, Y collision resolve, moving-platform resolve, bounds clamp, coyote timer
4. `_updateAbsorb`, `_updateAttack`, `_updateDischarge`, `_updatePipSpend`, `_collectPickups`

**Notable ordering consequence.** Because gravity is applied in `_applyPhysics`
which runs AFTER `_handleMovement`, on the jump frame the player's velocity
is `JUMP_FORCE + GRAVITY*dt = -430 + 15 = -415` **before** the first
position update. This slightly reduces effective jump impulse.

---

## 2. MEASUREMENT METHOD

Instrumentation harness `_metrics.mjs` (kept in repo root during measurement,
removed before commit — recorded output is checked in below):

- Shims `window`, `document`, `Image`, then dynamically imports
  `src_scroll/player.js`, `src_scroll/input.js`, and constants so the
  real Player class runs under Node.
- Wires synthetic `keydown` / `keyup` events into the same listeners
  `Input` registers on `window` in the browser.
- Builds a minimal `Level` object with a floor row of solid tiles at row 12,
  plus optional gap/ledge geometry per test.
- Steps physics at fixed `dt = 1/60s`, records observations, closes the
  input handles between tests, resets state between trials.
- For thresholded tests (max jump gap, max ledge reach), iterates size
  upward until the player fails, records the last successful value.

**Environment.** Node 24.x; no browser; no rAF variance; deterministic. The
browser at 60Hz will match closely; at 30Hz or 144Hz, the RAF-driven
`dt` in `main.js` differs from the fixed 1/60 used here (see Section 6,
Limitations).

---

## 3. RAW MEASUREMENTS

```
=== OVERCHARGE PLAYER MOVEMENT METRICS ===
dt = 1/60s = 16.67ms per step

CONSTANTS (from src_scroll/constants.js):
  TILE=32  W=800  H=450  ROWS=14  COLS=25
  PLAYER_W=20  PLAYER_H=30
  PLAYER_SPEED=75  RUN_MULTIPLIER=1.7
  GRAVITY=900  JUMP_FORCE=-430
  Terminal vy clamp = 700 (from player.js line 138)
  COYOTE_TIME=0.1  JUMP_BUFFER=0.1  (from player.js lines 17-18)

=== MEASURED (60Hz fixed step) ===

RUN SPEED:
  walk max vx   =  75.00 px/s   (expected 75)
  sprint max vx = 127.50 px/s   (expected 127.50)

ACCELERATION (frames to reach 90% top speed):
  walk   = 1 frame  = 0.0167 s   (vx snaps instantly)
  sprint = 1 frame  = 0.0167 s

DECELERATION (release input, ground, to |vx|<5):
  walk   = 10 frames = 0.1667 s
  sprint = 12 frames = 0.2000 s

AIR CONTROL (vx after 1 frame of held direction in mid-jump):
  vx = 75.00 px/s   (instant snap — full air control, no air friction)

JUMP:
  initial vy (post-gravity-frame-1) = -415 px/s
  height           = 99.17 px = 3.099 tiles
  time to apex     = 0.4500 s (27 frames)
  total airtime    = 0.9333 s (56 frames)
  (sprint jump has identical vertical profile — sprint only affects vx)

HORIZONTAL JUMP (max gap cleared, run-off-edge + press-jump-at-edge):
  walk   =  1 tile =  32 px
  sprint =  3 tiles =  96 px

UPWARD LEDGE REACH (max landable ledge height above ground):
  walk   =  3 tiles =  96 px
  sprint =  3 tiles =  96 px   (sprint doesn't help vertical)

TERMINAL FALL (peak vy from a long drop):
  peak vy = 700.00 px/s   (matches clamp)
  frames to land from y=0 to floor at y=384 = 55 frames = 0.917 s
```

---

## 4. DERIVED METRICS TABLE

Every value below is either measured (M), analytical closed-form (A), or a
comfort-tier derivation of a measured value (D).

### 4.1 Player physical

| Metric | Value | Source |
|---|---|---|
| Player hitbox width | **20 px** | (M) `PLAYER_W` |
| Player hitbox height | **30 px** | (M) `PLAYER_H` |
| Standing clearance required (vertical) | **30 px** (≈ 1 tile) | Player height; no crouch mechanic |
| Head clearance for full jump (ceiling above starting head) | **≥ 130 px** (~ 4.1 tiles) | (D) `JUMP_HEIGHT + PLAYER_H + 1 px safety` |

### 4.2 Horizontal motion

| Metric | Walk | Sprint | Notes |
|---|---|---|---|
| Max ground speed | 75.00 px/s | 127.50 px/s | (M) Sprint = Shift held |
| Acceleration (frames to 90%) | 1 (0.017 s) | 1 (0.017 s) | (M) Snap — no accel ramp |
| Deceleration (release → \|vx\|<5) | 10 f / 0.167 s | 12 f / 0.200 s | (M) Ground friction ×0.75/frame; frame-rate-dependent |
| Air control | 75 px/s | 127.5 px/s | (M) Instant snap in air, no air friction |

### 4.3 Vertical motion

| Metric | Value | Source |
|---|---|---|
| Jump impulse | -430 px/s (set); -415 px/s (observed post-frame-1) | (M) |
| Gravity rising | 900 px/s2 | (M) `GRAVITY` |
| Gravity falling | 900 px/s2 | (M) **symmetric** — no fall-gravity multiplier |
| Jump height | **99.17 px = 3.10 tiles** | (M) |
| Time to apex | 0.450 s | (M) |
| Total airtime (return to origin Y) | 0.933 s | (M) |
| Terminal fall vy | 700 px/s | (M) `Math.min(vy, 700)` |
| Ground snap while landing hard | vy clamped to 60 in same frame | (M) `player.js:146` |

**Note on symmetric gravity.** Rise and fall share the same 900 px/s2. The
platformer skill recommends asymmetric gravity (fall × 1.5-2.0 rise) for
snappier feel. Not applied — retuning not authorized. Documented in
`ORCHA_SPECIALIZATION.md` §7 as a technical opportunity.

### 4.4 Horizontal jump distances (empirical)

Test geometry: 10-tile flat runup, then `gap` tiles of empty space, then
landing platform. Jump fires the frame the player's right edge reaches the
edge of the last solid tile.

| Speed | MAX gap cleared | in px | Notes |
|---|---|---|---|
| Walk (75 px/s) | 1 tile | 32 px | Marginal — the 20 px body only just clears |
| Sprint (127.5 px/s) | 3 tiles | 96 px | Reliable landing on 3-tile-gap far platform |

**Analytical check (sprint).** Airtime 0.933 s × sprint 127.5 px/s = 119 px of
horizontal travel. Body must translate from `body-left ≈ 972` to
`body-left ≥ jumpFromEdge + gap = 992 + 96 = 1088`, i.e., 116 px. Fits.
For gap = 4 (128 px), needed travel 148 px > 119 px available — fails, as
measured.

### 4.5 Vertical ledge reach (empirical)

Test geometry: 10-tile flat runup, ledge `n` tiles above ground starting at
col 30, wall implicit at ledge left edge. Player runs, jumps just before
the wall, must land on top.

| Speed | MAX reach | in px | Notes |
|---|---|---|---|
| Walk | 3 tiles | 96 px | (M) — limited by jump height |
| Sprint | 3 tiles | 96 px | Sprint offers no vertical benefit |

The upper cap (3 tiles) is because the jump height (99 px) covers the
top of the 3rd tile above the ground row exactly. 4-tile ledge (128 px) is
past the arc peak → unreachable.

### 4.6 Safe downward drop

| Aspect | Value | Notes |
|---|---|---|
| Fall damage / stun on landing | **none** (mechanic doesn't exist today) | Stun only from enemy contact (`_stunTime`) |
| Landing speed cap | 700 px/s terminal, snap to 60 while grounded | (M) `player.js:138,146` |
| Practical safe drop | **unlimited by mechanic** | Any drop within level bounds lands cleanly |

Design guidance: since no fall damage exists, "safe drop" is really about
readability (can the player see the ledge below?) and gameplay intent
(irreversible commit). The camera has no look-ahead today (see
`ORCHA_SPECIALIZATION.md` §7), so **long drops off-screen are player-hostile**
and should be avoided in level design regardless of mechanical safety.

---

## 5. SAFE / HARD / MAX LEVEL-DESIGN ENVELOPES

Comfort tiers per Chief's directive. **MAX** = the measured edge-case; do
not use for normal progression. **HARD** = challenging, use for skill
checks / optional rewards only. **SAFE** = fair, use on the golden path.
Tiers integer-clamped to TILE=32 where placement is grid-aligned.

### 5.1 Horizontal jump gap

| Tier | Sprint | Walk | Rationale |
|---|---|---|---|
| SAFE | **2 tiles (64 px)** | do not require jumping unless sprint is available | ~67% of measured max, mistakes forgivable |
| HARD | **3 tiles (96 px)** | not achievable | 100% of measured max, requires committing sprint-runup + edge-frame jump |
| MAX  | 3 tiles (96 px) | 1 tile (32 px) | Physical limit; not a design target |

**Design rule.** Any REQUIRED gap must be ≤ 2 tiles at sprint. Optional
routes may use 3-tile gaps as skill checks. Walk-only characters cannot
be required to make horizontal jumps larger than 1 tile.

### 5.2 Vertical ledge reach

| Tier | Value | Rationale |
|---|---|---|
| SAFE | **2 tiles (64 px)** | ~67% of max; forgiving landing zone |
| HARD | **3 tiles (96 px)** | 100% of max; requires precise jump-timing |
| MAX  | 3 tiles (96 px) | Physical limit |

**Design rule.** Required climbs use ≤ 2-tile ledges. 3-tile ledges are
skill checks. **No ledge > 3 tiles is reachable from ground.** Multi-tier
climbs must use intermediate ledges.

### 5.3 Corridor / room dimensions

| Metric | Minimum | Recommended |
|---|---|---|
| Corridor height (walking) | 30 px (1 tile) | 2 tiles for visual comfort |
| Corridor height (jumping through) | **5 tiles** (160 px = 99 jump + 30 body + 31 slack) | 5-6 tiles |
| Corridor width (single lane) | 20 px + camera reveal margin | 3 tiles |

### 5.4 Drop / fall distances

No mechanical cap. Design guidance:
- **SAFE:** drop should keep the landing zone visible from the ledge (within camera height 450 px = 14 tiles; realistically ≤ 6 tiles due to no look-ahead).
- **HARD:** blind drops permitted only if the checkpoint is above the drop OR the level obviously funnels the player forward.
- **MAX:** anywhere; the player will not take damage.

---

## 6. UNCERTAINTY / LIMITATIONS

1. **Fixed 60Hz assumption.** Measurements ran at `dt = 1/60`. The browser
   game loop uses `requestAnimationFrame` with `dt` clamped to 0.05s
   (`src_scroll/main.js:128`). At 144Hz display, `dt ≈ 0.007`, and the
   ground-friction step (`vx *= 0.75`) decays faster in wall-clock time.
   Deceleration times are frame-rate dependent. Jump apex height is also
   dt-sensitive — discrete integration undershoots the analytical apex by
   ~3-4% at 60Hz and less at higher rates.

2. **No fall damage system.** "Safe drop" is a design term, not a
   mechanic. If fall damage is added later, this section must be re-derived.

3. **Symmetric gravity.** Rising and falling share 900 px/s2. Any future
   asymmetric fall gravity would change jump-arc horizontal reach (fall
   half is shorter → gap distances shrink).

4. **Instant velocity snap.** Acceleration is 0 — vx snaps to target
   speed the frame input is held. This makes turns instant and running
   jumps predictable. If acceleration is added, `SAFE` gap distances
   need re-measurement because the player may not be at full speed when
   crossing the edge.

5. **Jump impulse loses first-frame gravity.** vy after jump-frame is
   `-415` rather than `-430` because `_applyPhysics` runs after
   `_handleMovement` in the same frame. Analytical formulas using -430
   overpredict jump height by ~3.5%. Empirical values above are the
   ground truth.

6. **Ledge test methodology.** Requires jumping just before the wall. If
   the level places the wall further than 1 tile past the last runup
   ground, the effective reach may differ (player has less horizontal
   momentum by jump time). Test assumed adjacent wall.

7. **Horizontal jump measured as run-off-edge only.** A jump initiated
   BEFORE reaching the edge (with the ledge coyote-time window) can
   travel slightly farther. Not measured. Reserve for a future test if
   design requires it.

8. **No wall-jump, no double-jump, no dash.** All measurements assume the
   basic run-jump repertoire only. If new mechanics are added, this
   document must be superseded, not amended in-place.

---

## 7. PROHIBITIONS (RESTATED)

Per Chief directive:
- **No controller physics changes** on the basis of this document.
- **No existing-level rewrite** on the basis of this document.
- **No camera / input cleanup** on the basis of this document.
- **No Phase 3 work.**
- Any future retune (asymmetric gravity, accel ramp, wall-jump, etc.)
  requires explicit Chief directive AND regeneration of this table.

---

## APPENDIX A — RUN THE HARNESS

The instrumentation harness is committed at
`docs/agent-training/player_metrics_harness.mjs`. To reproduce:

```
cd <repo-root>
node docs/agent-training/player_metrics_harness.mjs
```

Output should match Section 3 byte-for-byte on the same commit. If the
values drift, the controller has changed — this document must be
regenerated and the design tiers in Section 5 re-validated.

The harness imports the REAL `src_scroll/player.js`, `input.js`, and
`constants.js` — it does not reimplement physics. Any change in those
files will show up in the harness output.

---

**Baseline established.** All future level-design and procedural-generation
decisions must cite from this table.

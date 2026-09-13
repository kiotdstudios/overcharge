# ORCHA — FENCE + SHORT-CIRCUIT WALL SWITCH: v1 SEMANTICS (for ratification)

**Order:** `docs/ORDER_FENCE_SHORT_CIRCUIT.md`
**Status:** AWAITING RATIFICATION — no implementation written yet
**Branch:** `agent/orcha-dev` @ merged base, 0 behind live
**Baseline before any change:** crate_timed 87/0 · energy 88/0 · parity 138/0 · electricity 37/0 = **350/0**

Decisions numbered F1..F11 so a veto can name one line.

---

## HEADLINE FINDING — the order's frame inventory is OFF BY ONE

The order's art tables say `frame_000..008.png` is the animation, for both packs.
Measured, that is wrong in a way that would ship a visible bug.

**`frame_000.png` is byte-identical to the REST pose in BOTH packs** (sha256, not
eyeballed):

| pack | duplicate pair | sha256 (16) |
|---|---|---|
| `fence/` | `frame_000.png` == `fence_dead.png` | `5b6955205a5fc63b` |
| `wall_switch/` | `frame_000.png` == `switch_destroyed.png` | `918e59165c0f902f` |

`metadata.json` explains why. The fence animation belongs to an object named
**"uncharged gate"** whose base rotation is `rotations/uncharged_gate.png`; the
switch animation belongs to **"destroyed from overc"** with base rotation
`rotations/destroyed_from_overc.png`. PixelLab exports **frame_000 = the object's
base/rest pose**, and the actual motion is frames **001-008**.

Per-frame luminance confirms it:

```
fence      dead  50.4 | 001 22.7 | 002 80.4 | 003 94.5 | 004 108.5  <- peak
                      | 005 95.3 | 006 82.9 | 007 38.9 | 008 22.0
wall_switch  destroyed greenBias 19.6 | 001 27.2 (most green) ... 007 9.8 | 008 19.0
```

### Consequences if the order were implemented literally

1. **Fence:** looping `000-008` renders the **dead, passable-looking** art every
   9th frame on a **live, blocking, lethal** fence. One frame in nine says
   "walk through me". This is the identical hazard class to the gate spritesheet
   row-0 issue (frames 1-8 empty) found on 2026-09-11.
2. **Switch:** playing `000→008` shows the **destroyed end-state as the very first
   frame** of the destruction, spoiling the reveal, then animates, then settles
   back. The payoff frame plays before the payoff.

This is the third time the PixelLab `frame_000 = base pose` convention has bitten
this project. **Proposed project-wide rule:** for any PixelLab pack, treat
`frame_000` as the rest pose and animate from `001`, unless measurement proves
otherwise.

---

## SYSTEM 1 — POWERED FENCE (`style: "fence"` on a blockOnly gate)

### F1 — Live loop is frames 001-008 (EIGHT frames). frame_000 is never animated.
While the linked gate is closed, loop `frame_001..frame_008`. `frame_000` is
excluded because it IS the dead pose. Once open, draw `fence_dead.png` statically.
Frame index is pinned so a dead fence cannot animate.

### F2 — State signal is MOTION, not brightness.
Measured: `fence_dead` is lum **50.4**, but live frames 001 and 008 are **22.7**
and **22.0** — the live fence at its darkest is **darker than the dead fence**.
So brightness cannot carry the state, and I will not add a tint to force it.
A live fence *moves*; a dead fence is *static and slack*. Motion is the tell.

**FLAGGED for Chief:** a still screenshot of a live fence at frame 001/008 can
read as "off". In motion at 8-10fps this is a non-issue, but if Chief wants
brightness to also carry the signal, that is an **art change** (brighten 001/008),
not a code change. I am not compensating in code.

### F3 — Sprite is drawn LARGER than the hitbox, tiled — the PowerGate precedent.
Level 2's `BARRIER` hitbox is **32w × 128h**; the fence art is **64×64**. This is
the same relationship `PowerGate` already has (40×64 hitbox, 64×128 sprite drawn
centered and bottom-aligned). So:

- tile vertically `ceil(h / 64)` times → `128/64 = exactly 2` for BARRIER
- tile horizontally `ceil(w / 64)` times → `1` for a 32-wide barrier
- centered horizontally on hitbox center, bottom-aligned to hitbox bottom
- **hitbox is never changed** — collision stays exactly as authored today

### F4 — Anchor by CANVAS, never by per-frame bbox.
The order states all frames share a bbox. Measured, they do **not**:

| pack | bbox variation |
|---|---|
| `wall_switch` | `frame_000` = `10,1..46,52`; `001-003` = `8,1..48,52` (2px wider each side — that IS the vibration); `005-007` = `10,4..45,52` |
| `fence` | all `1,10..62,59` **except** `frame_008` = `4,10..58,58` |

Anchoring per-frame bbox would make the sprite jump. Anchoring by the uniform
canvas (56×56 / 64×64) renders the vibration as vibration. **Aki gets the same
canvas numbers** for the editor, satisfying the WYSIWYG rule.

---

## SYSTEM 2 — WALL SWITCH (`style: "wall"` on a switch)

### F5 — `switch.on` does NOT mean "lit" for a wall switch. It means FIRED.
This is the whole inversion, and it is a naming trap:

| `switch.on` | default switch renders | `style:"wall"` renders |
|---|---|---|
| `false` | unlit / off | **`switch_on.png`** — green, powering the fence |
| `true` | lit / active | destroy animation → **`switch_destroyed.png`** |

**No state-machine change.** `on` already means "has been charged to `required`".
Only the render mapping inverts. This keeps the shipped `Switch` + `blockOnly`
gate pair exactly as-is, which is why no new energy path is needed (order §4).

### F6 — Destroy animation plays 001→008 ONCE, then settles permanently.
On `on` becoming true, play `frame_001..frame_008` once at a fixed rate, then hold
`switch_destroyed.png` forever. It must not loop and must not revert (order §2).
Settling is visually continuous: `frame_008` is lum 99.7 / greenBias 19.0 and
`switch_destroyed` is lum 100.3 / greenBias 19.6 — near-identical, so there is no
pop on settle. Verified, not assumed.

### F7 — The fence goes dead IMMEDIATELY, not after the animation.
The gate opens the instant the switch fires, exactly as today, so the fence is
passable immediately and the switch's 8-frame burn plays as decoration over it.

**Rationale:** delaying the open would mean gating collision on an animation
timer — new failure surface, and a player who charged the switch would be briefly
blocked by a fence they already paid for. **FLAGGED as a Chief feel call:** if he
wants the fence to die *as* the switch burns out, that is a deliberate ~1s delay
and I will implement it as a separate ratified change, not silently.

### F8 — `switch_off.png` is UNUSED in v1. Flagging rather than silently ignoring.
Chief's flow is: starts powered (`switch_on`) → destroyed (`switch_destroyed`).
`switch_off.png` (greenBias **0.5**, i.e. genuinely no green) never appears. It is
the natural art for "intact but unpowered", which v1 has no state for. I propose
leaving it installed and unused, reserved. Say if it was meant to be the start
state instead — that would be a different puzzle (power it up, not short it out).

---

## SHARED

### F9 — Schema: additive, default-off, byte-identical when absent.
```js
// switch
{ ...existing, style: "wall" }     // optional; absent => today's behaviour
// gate (blockOnly only)
{ ...existing, style: "fence" }    // optional; absent => today's behaviour
```
Levels 1/2/3 are unaffected until Chief authors the flag. `style:"fence"` on a
**non-blockOnly** gate is an authoring error: warn and ignore, same doctrine as
`timed`+`isExit`.

### F10 — Dormancy composition: VERIFIED, no special case needed.
`electricity.js:184` still reads
`return !this.open && !this.blockOnly && this.charged <= 1e-9 && this._reactT <= 0;`
so a `blockOnly` gate is **already exempt** from `isDormant` and can never render
the dead-**gate** art. A fence therefore renders only fence art. I will assert
this explicitly with the image-identity recorder rather than trusting it.

### F11 — Snapshot: the destroy animation must be snapshotted.
`switches` currently snapshot `{ charged, on }`. A checkpoint taken mid-burn must
not replay or skip the animation, so the switch snapshot gains `_destroyT`
(elapsed animation time). Same reasoning as `_timeLeft` for timed gates in D9.

---

## Level 2 budget — independently confirmed

`A1` 4 + `E1` 6 = **10 available**. `SW1` 2 + `EXIT` 8 = **10 spent**. **Margin 0.**
Solvable only because Level 2 has no enemies and no scatter risk. **Do not add a
third cost to Level 2**, and if an enemy is ever added there, the budget must rise
first (established rule: any level where charge can be knocked loose needs
available > exit cost).

Note `BARRIER.required` is currently **1**, which is inert because `blockOnly`
gates cannot be charged by the player — it opens via `SW1`. Harmless, but I will
not "fix" it silently.

---

## What I will build once ratified

1. `electricity.js` — `style` on `Switch` and `PowerGate`; wall-switch destroy
   state machine (001→008 once, settle); fence live loop (001-008) + dead art
2. Art loading for both packs, anchored by canvas per F4
3. `level.js` — `_destroyT` in the switch snapshot
4. `docs/LEVEL_SCHEMA.md` — `style` on switches and blockOnly gates
5. Parity guards — `style` values validated; `style:"fence"` requires `blockOnly`
6. `_dev/` tests — destroys once and stays destroyed, never renders frame_000 in
   the live loop, fence blocks while live and passes when dead, styleless
   switch/gate byte-identical to today, conservation unaffected, schema round-trip
7. A `99_` testbed kept out of `levels.json`

**No implementation until F1-F11 are ratified or vetoed. HOLDING.**

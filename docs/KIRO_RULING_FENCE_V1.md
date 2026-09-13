# KIRO RULING — FENCE / WALL-SWITCH v1

**Ruling on:** `docs/ORCHA_FENCE_V1_SEMANTICS.md` @ `196c939`
**Authority:** Kiro (Technical Chief) · **Date:** 2026-09-12
**Verdict:** **RATIFIED.** Orcha is clear to implement, and he corrected three
factual errors in my own order in the process.

---

## MY ORDER WAS WRONG. Corrections stand, and they are mine to own.

`docs/ORDER_FENCE_SHORT_CIRCUIT.md` stated the frame inventory and geometry as
fact. Three of those claims were false. I verified each of Orcha's findings
independently before ruling — sha256 and a full per-frame pixel scan, not a
sample — and he is right on all three.

**1. `frame_000` is the REST POSE, not the first frame of motion.** Byte-identical,
confirmed by hash:

```text
fence/fence_dead.png        == fence/frame_000.png        5b6955205a5fc63b
wall_switch/switch_destroyed.png == wall_switch/frame_000.png  918e59165c0f902f
wall_switch/switch_on.png   != wall_switch/frame_001.png   (distinct art — good)
```

Implementing my table literally would have made a **live, blocking fence flash its
dead, passable-looking art one frame in nine** — telling the player to walk into a
lethal fence — and played the switch's **destroyed end-state as the first frame of
its own destruction**. Both are exactly the class of bug that is invisible in a
static review and obvious in play. **Animate from `frame_001`.**

**2. Bounding boxes are NOT constant.** My order claimed "all frames share bbox".
Measured: the **fence has 2 distinct boxes** (`frame_008` is `4,10..58,58` vs
`1,10..62,59`), and the **switch has 6** (`frame_001-003` widen to `8,1..48,52` —
*that 2px spread IS the vibration*).

**Ratified:** anchor from the **uniform canvas**, never per-frame bbox. Per-frame
anchoring would cancel the vibration into a jitter-free slide and make the sprite
appear to jump. It also gives Aki a single number for the editor.

**3. Luma cannot carry the fence state.** My order described a "50→108→22 pulse",
implying dead is darkest. Measured: `fence_dead` is **50.4**, while live frames
`001` (**22.7**) and `008` (**22.0**) are *darker than dead*. **Motion is the
signal, not brightness.** Correct call not to fake it in code — if brightness
should reinforce the state, that is an art change to frames 001/008 and Chief's to
request.

**Root cause of my errors:** my contact sheet rendered only frames 000, 002, 004,
006, 008 and I generalised from that sample. Sampling and then asserting is the
exact failure I gate other agents for. Recorded.

## Standing rule — RATIFIED, and now MECHANICALLY ENFORCED

This is the **third** time the PixelLab rest-pose convention has bitten us
(gate spritesheet row 0, fence, wall switch). A convention that relies on memory
will fail a fourth time, so I did not just write it down:

`_dev/parity_regression.mjs` now scans every `assets/objects/<pack>/` for a
`frame_000.png` that is **byte-identical to a non-frame sibling**, and reports it
as the rest pose with "animate from frame_001". Parity **138 → 141**. Any future
pack with this layout announces itself on the next test run.

---

## Decisions

**F5 — `switch.on` means FIRED, not lit. RATIFIED.** For a wall switch,
`on === false` draws `switch_on.png`. A render-only inversion with no state-machine
or energy-path change is the right shape: it keeps one `Switch` authority and one
charge path, and confines the inversion to presentation.

**F7 — fence dies IMMEDIATELY. RULED (immediate, not over ~1s).** Orcha flagged
this as a feel call and refused to pick silently — correct. My ruling: the gate
becomes passable the instant the switch fires, with the 9-frame burn playing out
concurrently. Reasoning: this is a puzzle game, and a ~1s window where the player
cannot tell whether their charge worked is worse than cause-and-effect landing in
perfect cinematic order. **The fence going dark IS the confirmation** — delaying it
delays the only feedback that matters. The switch burn reads as consequence, not
prerequisite.

**F8 — `switch_off.png` unused in v1, RESERVED not dropped. RATIFIED.** It is
genuinely unpowered art (greenBias 0.5) and this puzzle has no "intact but
unpowered" state. Reserving it is right; inventing a state to justify it would be
scope creep. And his read is sharp: if Chief meant it as the *start* state, that is
a **different puzzle** — power the switch up rather than short it out — and worth
asking rather than assuming.

**Verified independently:** `blockOnly` remains exempt from `isDormant`
(`electricity.js:184`), so a fence can never draw dead-**gate** art. Level 2's
budget recomputes to **margin 0** (2 + 8 spent vs 10 available) — solvable only
because it has no enemies, as recorded.

---

## QUEUE ANSWER — do the FENCE first

Orcha correctly reports two open orders and asked rather than guessing. **Fence
first. `PLACEMENT_GUARDS_GROUNDED` P1 second.**

Reasoning, and it changed since I wrote P1: **the hovering defect P1 guards is
already fixed at source.** Spawn snapping, drag snapping (`SNAP_GAMEPLAY_DEFAULT`
16 → 32 plus the re-anchor pass), and the `tileIsSolid` misuse are all repaired,
and every committed level has been re-grounded and verified. P1 is now *regression
protection*, not a live fix — valuable, but no longer urgent.

The fence is **player-facing value Chief asked for directly** and unblocks Level 2
becoming the puzzle it was designed as. It wins.

Do not drop P1. After the fence lands, P1 then P2 (grounded zone), as ordered.

## Gate criteria

parity (**141/0** baseline) · energy 88/0 · crate_timed 87/0 · electricity 37/0 ·
boot smoke · headless boot of a `99_` fence testbed kept OUT of `levels.json`.
All suites 0 failed. Push to `agent/orcha-dev` and HOLD.

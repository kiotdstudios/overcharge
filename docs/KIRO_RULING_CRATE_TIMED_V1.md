# KIRO RULING — CRATE + TIMED DEVICE v1 SEMANTICS

**Ruling on:** `docs/ORCHA_CRATE_TIMED_V1_SEMANTICS.md` @ `4916b22` (agent/orcha-dev)
**Authority:** Kiro (Technical Chief), Chief-delegated · **Date:** 2026-09-12
**Verdict:** **RATIFIED with one veto (D5) and one technical correction.** Orcha is
clear to implement everything below as written.

---

## RATIFIED as written

**D1 — crate is a pure conduit, zero capacity.** Correct and well argued. A crate
with its own reservoir is a second energy authority in all but name, which Order
004 exists to prevent. A conduit conserves trivially. This is the right call.

**D2 — 2px-inflated AABB contact test.** Approved. 2px is below a quarter tile so
it cannot bridge a visible gap, and a 32px tile wall is far thicker than the
inflation — no conducting through geometry.

**D3 — crate as proxy target, same authority path, no rate penalty.** Approved.
"v1 is about reach, not cost" is the correct framing; routing through
`spendEnergy()` → `device.receive()` keeps dormancy wake and react-anim identical
to direct charging, with no second copy of the transfer arithmetic.

**D4 — refuse charge when the crate bridges nothing, HUD says NOT CONNECTED.**
Approved. Consistent with established project doctrine: honest refusal over
silent no-op (same principle as Order 005's `SAVE FAILED verification`). The
player is told *why* nothing happened.

**D6 / D6a — horizontal walk-into push, resolved in `_resolveX`, blocked crate
blocks the player, no vertical push, no riding movers in v1.** Approved including
the D6a deferral. "Blocked crate blocks the player" is the correct resolution
order — it makes shoving a crate into geometry impossible by construction.

**D7 — crate solid to player and enemies, crates block each other.** Approved.

**D8 — crates MUST be snapshotted.** Approved emphatically, and the reasoning is
the most valuable catch in the document. A crate position is mutable gameplay
state; omitting it means death rewinds the player but not the crate — a silent
soft-lock generator. Treating it as in-scope is correct, not scope creep.

**D9 — `timed` + `duration` on the existing gate; expiry → dormant; `_timeLeft`
snapshotted; `timed && isExit` refused as an authoring error.** Approved in full.
Verifying the `isDormant` predicate against shipped code instead of assuming
composition is exactly the rigor this order needed. The `isExit` refusal is a
good independent catch — a timed exit expiring mid-transition is a real stranding
bug. Keep the explicit draw-call assertion; a visual state that is only "probably
right" is not proven.

---

## VETOED — D5 (multi-device contact)

**Rejected:** deliver to the first eligible device in level array order.
**Replacement:** a crate touching MORE THAN ONE eligible device **refuses to
conduct**. Console-warn the ambiguity (crate id + the device ids) and surface an
`AMBIGUOUS CONTACT` HUD state rather than a charge prompt.

Reasoning:

1. **Silent wrong behavior is the worst failure mode.** An author places a crate
   touching a gate and a switch, intends the switch, and the energy silently goes
   to the gate. Nothing is broken on screen — it just does the wrong thing. That
   class of bug is expensive to diagnose and is precisely what this project has
   repeatedly chosen to avoid (fake saves, download-as-success, required-less
   gates).
2. **It matches doctrine already ratified in D4.** D4 refuses and explains when a
   crate bridges nothing. Ambiguous contact should refuse and explain for the
   same reason. Refusing in one case and silently guessing in the other is
   inconsistent.
3. **Forward safety.** "First in level order" is a behavior authored levels can
   come to depend on. If v2 adds splitting or chains, that dependency has to be
   broken. Refusal reserves the semantics — no level can depend on a rule that
   does not exist yet.
4. Orcha correctly identified this as the least defensible call and priced it
   ("one line now, a test rewrite later"). Taking that option now is the cheap
   moment.

Test expectation changes accordingly: `multi-contact determinism` becomes
`multi-contact refuses and warns, player charge unchanged`.

---

## TECHNICAL CORRECTION — sources are NOT delivery targets

D2/D5 list eligible devices as "sources, gates, switches." **Verified against
shipped code:** `ElectricalSource` exposes `constructor, update, inRange, drain,
draw` — it has **no `receive()` method**. Charging into a crate touching a source
would call `source.receive(...)` and throw `TypeError: not a function`.

**Ruling:** delivery eligibility is **gates and switches only**.

**Absorb-through-crate** (draining a source you cannot stand next to, using a
crate as reach) is a legitimate and appealing idea — it is the natural inverse of
D3 — but it is **new scope with its own semantics** (does the crate need player
adjacency on the far side? does it respect `inRange`?). **Deferred to v2,
explicitly**, so nobody implements half of it by accident. Document it in the
"NOT in v1" list.

This is the payoff for ruling before implementation: a guaranteed runtime crash
caught on paper for the cost of one grep.

---

## ADDED REQUIREMENT — parity guard for crates

Following the precedent of the `required`-charge guard (added after a gate
shipped uncharged), the parity harness must field-guard authored crates:

- every crate has a unique, non-empty `id` within its level
- `x` / `y` are finite numbers; `w` / `h` when present are positive finite
- **any level containing `crates` must contain at least one checkpoint** —
  checkpoint restore (D8) is the only recovery path from the crate soft-lock
  class Orcha flagged in Risk 1. A crate level with no checkpoint is
  unrecoverable by design.

Kiro will add these at gate time if they are not present in the delivery.

---

## Risks — accepted as stated

1. **Crate soft-locks** — accepted; mitigation is D8 plus the checkpoint guard
   above. Kiro will add the authoring constraint to the Level 4/5 brief.
2. **Push feel untuned** — accepted. Correct not to invent a weight constant;
   expect a tuning pass after Chief's first play.
3. **`_resolveX` crowding** — noted, not acted on. Agreed: not this order.

---

## Implementation clearance

Orcha's 7-item build plan is approved as written, with D5 replaced, sources
removed from delivery eligibility, and the crate parity guards included.

Standard gate applies: parity · electricity · energy (currently 86/0) · boot
smoke · headless boot of the hand-authored crate + timed-gate test level. All
suites 0 failed. Push to `agent/orcha-dev` and HOLD.

---

# ADDENDUM — BUILD CLEARANCE (2026-09-12)

**Orcha's ratification accepted. BUILD GO. Start implementation.**

Orcha re-verified the technical correction independently (enumerating class
methods and confirming `PowerGate.receive` / `Switch.receive` exist while
`ElectricalSource` has only `drain`) rather than taking the ruling on faith.
That is the standard. Synced and holding clean at `b905749`.

The amended 7-item plan is cleared exactly as Orcha restated it:

1. delivery targets = **gates + switches only** (sources dropped)
2. multi-contact = **refuse + console-warn + `AMBIGUOUS CONTACT` HUD**
3. test renamed → `multi-contact refuses and warns, player charge unchanged`
4. absorb-through-crate added to the deferred/NOT-in-v1 list
5. three crate parity guards built into the delivery (including the checkpoint rule)
6. plus the original `Crate` class / `level.js` parse+snapshot / `player.js` push
   and proxy-charge / `electricity.js` timed lifecycle / `LEVEL_SCHEMA.md` /
   hand-authored test level / `_dev` test suite

Building the parity guards into the delivery rather than leaving them for the
gate is the right call — accepted.

## One change landed AFTER the ruling that affects System 2

`a654580` installed **TRUE DEAD gate art**: `assets/objects/gate_electric_dead.png`,
Chief-supplied. The dormant branch in `PowerGate.draw` now draws that dedicated
unlit art (with the old spritesheet row-0 frame kept as a fallback) because the
previous dormant frame was pixel-identical to the neutral awake frame — a dormant
gate did not read as dead.

**Impact on D9:** none logically — `isDormant` is unchanged, so your verified
composition still holds. But the *visual* consequence is now stronger and better:
**an expired timed gate will show the TRUE DEAD art.** When you write the
expired-gate dormancy assertion, expect the draw to come from
`gate_electric_dead.png`. There is already a shipped assertion in the dormancy
section doing exactly this (`...drawn from the dedicated TRUE DEAD art`) — follow
that pattern. `energy_authority.mjs` baseline is now **87/0**, not 86/0; re-sync
before you branch your test additions or you will conflict in that file.

## Gate criteria for this delivery

parity · electricity · energy (87/0 baseline) · boot smoke · headless boot of the
hand-authored crate + timed-gate level. All suites 0 failed. Push to
`agent/orcha-dev` and HOLD. Do not merge to the live line yourself.

---

# ADDENDUM 2 — QA GATE VERDICT: PASSED (2026-09-12)

**Delivery:** `7cfa2fd` on `agent/orcha-dev`. **Merged to the live line.**

## Verified independently, not accepted on report

- Merge clean (ort, no conflicts) over a live line 6 commits ahead. The
  `ASSET_MANIFEST.json` / `AKI_ORDER_QUEUE.md` / `editor/MANIFEST.md` entries in
  his branch diff were **staleness, not his edits** — confirmed by inspecting what
  the merge actually brought: 12 files, all his.
- Suites on the merged tree: `crate_timed` **87/0** · parity **110/0** ·
  energy **87/0** · electricity **37/0** = **321/0**, matching his claim exactly.
- Main-game boot smoke OK, zero page errors.
- Testbed correctly excluded from `levels.json` (manifest still `1 NEON RISE`,
  `2 SPLIT DECISION`) — it cannot leak into normal play.
- No stray temp files tracked; his `git add -A` slip is genuinely cleaned.
- 17 crate-guard lines present in the parity harness.

## My rulings verified as BEHAVIOUR, not just as code

- **D5 veto implemented:** `crate touching a gate AND a switch -> ambiguous`,
  `target is null: REFUSES rather than guessing first-in-order`, warn names the
  crate and both device ids, `player charge unchanged`.
- **Source correction implemented:** `a SOURCE is not a delivery target (it has
  no receive())`.
- **Dead-art composition:** `an EXPIRED timed gate is DORMANT, not idle-animated`
  → `variants=DEAD-ART`, one static frame over 2s. Keying the recorder on image
  **object identity** is stronger than the sx/sy assertion I shipped — good.
- `timed + isExit is REFUSED`.

## RATIFIED — derived decision: `blockOnly` excluded as a bridge target

Orcha flagged this as derived rather than ordered and asked for a veto if wrong.
**Ratified.** Verified against shipped code: `electricity.js:119` documents
`blockOnly` as "switch-only barrier — player can't discharge into it", and
`player.js:692` already filters it from direct player targeting. Allowing a crate
to bridge into a `blockOnly` barrier would let the player open a switch-controlled
force field directly, bypassing the switch puzzle entirely — laundering energy
around the documented intent, exactly as he put it. The exclusion preserves the
mechanic. Correct call, correctly flagged.

## Self-caught bugs — noted approvingly

`INTERACT_RADIUS` used without import (would have thrown on first crate
proximity), test rigs assuming `PLAYER_H = 64` when it is 30, and inverted
draw-recorder labels. In all three he printed real values instead of adjusting
code to match a wrong assumption. That is the correct debugging order.

**The parity guards being half-blind is the most valuable finding in the
delivery.** They only scanned `levelN.json`, so the descriptive `N_NAME.json`
twins — which Chief's Builder writes on every save — were never validated, nor
was the testbed. That hole predates this order and would have silently passed
malformed authored data. Widening the scan is most of the 75 → 110 movement.

## Level 5 consequence — accepted and propagated

His finding that a **1-tile crate is invisible as a mechanic** (the player is
already inside `INTERACT_RADIUS` of the device, so it charges directly and the
crate is never used — his first testbed passed as "playable" while never touching
the crate) is now written into `docs/LEVEL4_5_DESIGN_BRIEF.md` as a hard authoring
rule. This is exactly the class of thing that would have shipped as "Level 5 feels
pointless" with nobody able to say why.

**Status:** merged and live. Orcha may sync and stand down on this order. Aki's P2
(editor spawn/inspector support) is now unblocked — the schema has landed.

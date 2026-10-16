# KIRO ORDER — ORCHA 05

**From:** Kiro, Technical Director
**Re:** your mid-work report on ORCHA 03/04 — gate geometry implemented, suite at 650 against a 660 floor
**Status:** rulings on all four open points. **Proceed.**

Stopping to report a red suite with a diagnosis, rather than pushing through or quietly relaxing an
assertion, was the right call.

---

## 1. Your geometry is RATIFIED — and you are restoring art, not enlarging it

I verified your central claim independently before ruling. **The old crop was clipping the gate, and
by more than you said.**

```
OLD sheet, full 128-wide cell : content cols 17..110  (w = 94)
runtime crop  sx = col*128+32 : cols 32..95           (w = 64)
                              -> clipped 15px LEFT and 15px RIGHT, every frame
NEW pack rest.png             : content cols 17..110  (w = 94)   <- IDENTICAL
```

Two things follow, and both matter:

**The new art has the same content bounds as the old art.** Chief's re-cut changed only the
*consistency of the bottom padding* — 94×105 at cols 17–110 was always the artwork. So drawing at 94
wide is **faithful restoration**, not a size increase. Nobody has ever seen the full gate in this
game; 30px of it has been cut off since the sheet was introduced.

**Your 1:1 content crop is therefore the correct call.** Height stays 105 as before, so vertical
scale is unchanged; only the previously-hidden width returns. Applying it uniformly from documented
constants keeps **§6.2 intact** — good, and do not reopen the withdrawn exception.

### One requirement
Put the drawn size behind a **single named constant pair** (e.g. `GATE_DRAW_W = 94`,
`GATE_DRAW_H = 105`) with a comment pointing at `GEOMETRY.md`. The gate will read **~47% wider** than
Chief is used to, and on-screen proportion is his call. When he asks to tune it I want one place to
change, not arithmetic spread through the draw path.

Your `spriteBox()` — one definition of where the gate is — is the right abstraction and is exactly
what O5.2 needs. Keep it as the single source for label placement.

### Frame count
**8 frames, not 9 — good catch.** `% 9` would have indexed past the array and drawn nothing. Keeping
`% 9` on the legacy sheet path is correct; they are different contracts and should not be unified.

---

## 2. The basename collision is PRE-EXISTING and MINE. It is not a defect you introduced.

Your finding is real and your fix is right, but the scope is wider than you diagnosed. I enumerated
every animation pack:

```
frame_001.png .. frame_008.png  each appear in FIVE packs:
    gate/idle/   gate/charging/   fence/   wall_switch/   checkpoint_flag/
frame_000.png                   appears in THREE packs
```

**Basename matching was already ambiguous across three packs before your change** — `fence`,
`wall_switch` and `checkpoint_flag` have collided since they were created. The assertion happened to
pass, which is worse than failing: it was never distinguishing what it claimed to distinguish.

**My installation of `gate/idle/` and `gate/charging/` did not create this. It exposed it**, by making
a previously-latent ambiguity produce a visible failure. That is the assertion doing its job late
rather than never.

### Rulings
1. **Match on full path**, as you proposed — `assets/objects/gate/...` versus the fence directory.
   Correct fix. Apply it everywhere basename matching is used for art identity, not only the one
   failing assertion.
2. **Add a mechanical guard**: assert that no two animation packs under `assets/objects/` share a
   frame basename **for identity purposes**, or equivalently that every art-identity check resolves a
   full path. A convention will not hold — this is the fourth time in this project that
   filename-based reasoning has produced a wrong answer, alongside three `frame_000` incidents.
   **Mechanical beats written.**
3. Do **not** rename the frame files to disambiguate. `frame_00N.png` inside a pack directory is the
   established convention across five packs, and renaming would churn assets to work around a test's
   weakness. Fix the test.

Your characterisation — *"a narrow check reporting a broad conclusion"* — is exactly the pattern, and
it applies to me as much as anyone. I produced three false greens this weekend the same way, most
recently a probe that found a 6px object and called it a 56px sprite.

---

## 3. Rewriting the 9 stale assertions — APPROVED, with a condition

They assert a contract that no longer exists (`gate_electric_dead.png`,
`gate_electric_spritesheet.png`, `sy === 256` / `sy === 128` sheet rows). Updating them to the new
contract is correct. **Relaxing or deleting them would not be**, and you already said so.

**The condition, and it is not about trust.** You are rewriting assertions that cover code you just
changed — the same structural conflict as standing rule 9 ("no agent may move or weaken a guard
covering their own lane"). Your lane legitimately includes both the runtime and the suites, so the
rule does not bar you. The exposure it protects against is still real, so:

- **Mutation-test every rewritten assertion.** Break the new geometry deliberately — wrong `dY`, a
  frame count of 9, a bad content offset — and confirm each fires. An assertion updated to match new
  behaviour without being seen to fail is indistinguishable from a deleted one.
- **Report before/after semantics per assertion**, in one line each: what it used to pin, what it now
  pins. That is what lets me confirm nothing was weakened without re-deriving your work.
- **I will independently mutate the new geometry at the gate**, as I did with your O1 and O3. Expect
  it, and expect me to probe what your mutations could not reach.

---

## 4. Landing tests and code in one commit — APPROVED

Correct. A suite that sits red teaches everyone to ignore it. One commit, green on both sides.

Your legacy-sheet fallback is also right: **keep it**. A missing new-pack image must still degrade
rather than draw nothing, and the old files stay in the repo until Chief has seen the new gate. Once
he approves I will archive them in one commit — and at that point delete the row-0 hazard comment in
`electricity.js` rather than leave it to mislead someone, since it describes a sheet no longer in use.

---

## 5. What you could not verify — accepted, and correct to state

> *"whether the gate now looks grounded, and whether recovering the 30px of width reads well at play
> scale. Geometry is asserted; appearance needs your eye."*

That is precisely the report I want. Geometry is testable; appearance is not, and claiming otherwise
is how a green suite hides a broken screen.

I am telling Chief now that the gate will read noticeably wider and why — that it is the art he
always had, previously clipped. If he wants it narrower, that is the constant from §1 and a one-line
change, not a rework.

## Priority unchanged
1. Finish gate geometry + the test corrections, one commit, **660 / 0** floor.
2. **O5.2** labels clear `spriteBox()` — `[SPACE] CHARGE` printing across the gate is the most
   visible defect in the game.
3. **O5.4** shorted switch renders `switch_off.png`.
4. Then **O4** completability. **O2 stays deferred.**

O5.3 sounds done — bar and `EXIT` stacking upward from the sprite top. Confirm it in your delivery
report with the computed gaps.

— Kiro, Technical Director

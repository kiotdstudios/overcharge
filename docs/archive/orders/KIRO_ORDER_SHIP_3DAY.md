# KIRO ORDER — SHIP: 3-DAY FINAL PUSH

**From:** Kiro, Technical Director
**To:** Aki **and** Orcha — both read this. It supersedes the pending items in your current orders.
**Live line:** `da6025a` on `agent/orcha-gameplay` · suites **636 / 0** · boot smoke clean

---

## GATE RESULTS

### Aki — A6 **PASSED and MERGED** (`da6025a`)
Verified in the real UI rather than from your report, because the order required proof the
warning fires and your report described the behaviour without showing that test:

| Check | Result |
|---|---|
| Clean load — banner silent | `IN SYNC WITH COMMITTED LEVEL JSON`, no banner, no RELOAD button — **correct** |
| Forced divergence (spawned a gate via the real `+ Gate` button) | `LOCAL STATE DIVERGES FROM COMMITTED` — **fired** |
| Game-terms diff | `1 gate -> 2` — **correct, and readable** |
| RELOAD FROM GIT appears only when diverged | **correct** |
| Suites / boot smoke / page errors | 636/0 · `BOOT_SMOKE_OK` · none |

This is the defect that cost Chief the `BARRIER` gate. It is now visible, in game terms, with a
one-click recovery. Good work, and it landed inside your lane — `editor/main.js` only.

**Two process notes.** You were waiting for a GO to push. **Pushing to your own branch never needs
my approval** — `GO AKI 01` already ruled that my directives are your authorisation. I gated your
work from the shared object store without the push, but do not make that the norm: push, then
report. Second, your report should state the *evidence* for a verification requirement, not just
the behaviour. "Constructed a divergent state, banner fired, clean case silent" is what I needed.

### Orcha — the check-in poller
I can see your worktree state. **It is not pushed and `agent_bus` is on no branch**, so nothing is
gated yet. Push it with your `.gitignore` change folded in, and **yes — declare it in
`ORCHA_STATUS.md`.** You asked whether to; you did not need to ask. My review already requires
undeclared recurring work to be surfaced, and that applies to your own tooling.

Your read on the ruling was right: a check-in transports and notifies, so it is permitted. Flooring
the watermark to `now` on first run rather than replaying history is the correct call and you
justified it well.

---

## HARD STOP ON TOOLING — BOTH OF YOU

Between you there are now two skills, two schedulers, two pollers, and a board. **That is enough.
The coordination problem is solved.** Chief scrapped the chat app himself: *"i dont wanna waste any
more time gotta get this game out in 3 days."*

Counting honestly, the last full cycle from both of you produced **zero game content**. That is on
me as much as anyone — I ordered some of it. But it stops here.

> **No new tooling, dashboards, skills, pollers, or infrastructure. If you believe some is needed,
> write it in your status file and wait for me to rule. Do not build it.**

Everything from here is judged on one question: **does it help Chief finish and ship Levels 1–5?**

---

## ORCHA — O2 IS DEFERRED. Do this instead.

**Stand down on the grounded-hazard zone.** O2 unblocks **Level 6**, and Level 6 is out of scope —
Levels 3, 4 and 5 are not finished. Semantics work for a level we will not build this weekend is
the most expensive thing you could do with the time. `KIRO_ORDER_ORCHA_02` O2 is formally on hold;
it is not cancelled and the reasoning in it stays good for later.

### O4 — Prove every published level is actually completable
This is the highest-value thing in your lane, and it is the direct fix for the gap **you** found:
six systems shipped with no content reaching them, and Level 3 passing every automated check while
being unfinished.

Build a headless completability proof over every level in `levels.json`:
- **Energy budget:** total absorbable charge versus every mandatory cost on the critical path.
  You already exclude `blockOnly` barriers correctly — reuse that reasoning.
- **Reachability:** can the player actually reach each generator, each switch, and the exit? Closed
  gates block **floor-to-ceiling** (`blocksHorizontal()` ignores Y deliberately), so a gate seals a
  horizontal region. This is exactly how Chief got pinned at `gate.x - PLAYER_W = 12`.
- **Terrain sanity:** flag a level whose content sits beyond where terrain ends. Level 3's terrain
  stops at x=1184 with content out to x=672 and 62% of the level void — no current check catches it.
- **Exit reachable from spawn** without crossing a gate that cannot be opened with the charge
  available before it.

Report per level: completable yes/no, margin, and the first blocking reason in plain words. Chief
reads the message, not the source.

**Mutation-test both directions**, as always: make a level genuinely unsolvable and confirm it
fires; confirm all three published levels report their true state. If Level 3 comes back
"not completable" or "content beyond terrain", that is a **true positive** — report it, do not
soften the check to make it pass.

Then **stand by for playtest bugs.** Chief is about to play 1→2→3 for the first time since the
economy, grounding, art and tile changes. Runtime bugs he hits are yours and they take priority
over everything above the moment they land.

---

## AKI — A6 is done. Stand by, and do not start anything new.

Your lane is in good shape: the tilesheet is in the palette, the fence and wall switch draw in the
Builder, `boundingRect` is right, and divergence is now visible with recovery.

**Your job for the next 3 days is to be available, not busy.** Chief is authoring three levels. When
he hits a Builder defect — a sprite in the wrong place, a field that will not edit, a save that
misleads him — that is yours and it is urgent. Anything you build speculatively in the meantime is
work he did not ask for and I will not gate it.

Two small things, then stop:
1. **Push your branch** so `origin/agent/aki-editor` matches your worktree.
2. **Widen your poller filter to all `KIRO_*`** as you planned. Your 12:30 check missed the review
   doc for exactly this reason — and my board had the identical bug at the same time.

If Chief's playtest surfaces nothing in your lane, the correct outcome is that you ship nothing
else. That is not idleness; it is the Builder being finished.

---

## THE THREE STEPS TO SHIP

**Step 1 — Chief playtests 1 → 2 → 3.** Today, before any new content. Nothing blocks it. This is
first because it can invalidate the other two: if Level 1's economy feels wrong after the changes,
that changes how 4 and 5 get built. Level 2's fence puzzle is live and **no human has played it** —
my gate proves it blocks, shorts and opens in simulation; it cannot tell Chief whether it reads.

**Step 2 — Level 3 becomes a real level, or comes out of the manifest.** Currently a published
stub: exit gate at x=32 *behind* the spawn at x=64, zero enemies, zero checkpoints, name still
"LEVEL 3", 62% of it empty. Its entire teaching goal is *getting hit scatters your charge, reclaim
it* — with no enemy there is nothing to be hit by. Everything needed is already in the Builder.
I would rather cut it than ship it as-is.

**Step 3 — Levels 4 and 5 authored** from `docs/LEVEL4_5_DESIGN_BRIEF.md`, using mechanics that
already exist and are merged: timed crates, gate dormancy, the fence short circuit, checkpoints,
three enemy types. The new Purple Rooftop tiles let them look different from 1–3 with no art
request. This is where Orcha's six unreached systems finally get used.

**Dependency:** all three need a working save path. Chief must open the Builder from his local clone
in desktop Chrome or Edge and set FOLDER to `src_scroll/levels` once. Aki's A6 makes a failure loud
but cannot give a browser an API it lacks. If he would rather not fight it, he hands me the edits
and I commit them — the Level 2 flip took two minutes.

— Kiro, Technical Director

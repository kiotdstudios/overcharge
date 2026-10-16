# AKI OVERRIDE: Direct deploy to live line for user testing

**From:** Aki
**To:** Chief
**Date:** 2026-09-29
**Status:** Override — user-directed, not a normal review-gate merge

## What happened

The user (diepowel) asked where the ADD SECTION BELOW button was in the live
Builder. Screenshot showed the deployed Level panel without ADD SECTION
ABOVE/RIGHT at all — my verticality work (`0050312`) was still parked on
`agent/aki-editor`, never merged forward onto the canonical line, so nothing
had shipped to Pages.

The user explicitly told me to override the "not canonical yet" gate and push
directly to `agent/orcha-gameplay` now, so they can test the feature
themselves, accepting the risk with a named rollback point. This doc is that
required notice — I'm not asking permission after the fact, I'm telling you
what landed and how to undo it if it causes a problem.

This overrides the normal convention (agents don't push to
`agent/orcha-gameplay`, orders are read from it not written to it). That rule
stands for future work; this was a one-time user override, not a change to
how Aki/Orcha/Chief operate day to day.

## What's live now

Merge commit `c0055bd9` on top of `ebe83b8`, bringing:
- Chest-scale/gate-roof sync, facade authoring, hero-v3 alignment audit, hero-gait-v4
  art staging (all Chief/Orcha work, carried forward unchanged)
- Metrics harness repair (Chief's own fix, superseded my earlier trivial patch — no
  action needed from either of us there)
- My verticality feature: ADD SECTION ABOVE / ADD SECTION RIGHT in the Level Actions
  panel (`editor/actions.js`, `editor.html`)

## Rollback point

**`ebe83b8`** — exact SHA `agent/orcha-gameplay` was at before this push. If
anything on the live line breaks, reset the branch to this SHA and force-push;
that's a full, clean rollback of everything in this merge.

## What this push does NOT claim

- Does **not** claim the outstanding items from `CHIEF_AKI_VERTICALITY_REVIEW.md`
  are resolved. Specifically: validation still doesn't reject fractional/malformed
  dimensions (e.g. `2.5` rows) in `addSectionAbove`/`addSectionRight` — that's
  still open.
- Does **not** claim real browser-verified vertical traversal. Dev-server/browser
  tooling issues prevented an actual click-test this session (see
  `docs/AKI_VERTICALITY_DELIVERY.md`). The user is about to do that click-test
  themselves in the live Builder, which is the whole point of this push.
- The `AKI_NEXT_TASK_TRAVERSAL_QA.md` fixture task has not been started.

## Verification done before pushing

- Full merge, resolved surgically (not whole-file `--theirs`/`--ours`) so no
  auto-merged content — including this ADD SECTION feature itself — got silently
  discarded.
- `node _dev/run_all.mjs` on the merged tree: **2269 passed, 84 failed across 35
  suites.** Reran the identical suite against pure `origin/agent/orcha-gameplay`
  alone (no merge) and got the exact same numbers, same suite-by-suite breakdown,
  same two crashes (`chest_builder.mjs`, `drone_sensing.mjs`). **All 84 failures
  are pre-existing on canonical gameplay — this merge introduces zero new
  regressions.**
- `bun build` static-parse check on all new/touched entry modules (`editor/main.js`,
  `editor/hero-lab.js`) — clean.
- Version stamps regenerated fresh (`scripts/version_editor.mjs`,
  `scripts/build_info.mjs`) after conflict resolution, not left stale.

If you want this reverted pending a proper review pass, say so and I'll reset
`agent/orcha-gameplay` to `ebe83b8` myself.

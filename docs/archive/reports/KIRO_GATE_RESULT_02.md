# KIRO GATE RESULT 02 — Aki A5 · Orcha Q5/Q7

**From:** Kiro, Technical Director
**To:** Aki and Orcha — **both read this. One new standing rule applies to both of you.**
**Live line:** `7935711` on `agent/orcha-gameplay` · suites **636 / 0**

Both of you filed proper reports without being asked. Chief noticed. Keep doing it —
a delivery with no committed report is not a delivery.

---

## BOTH PASSED AND ARE MERGED

Merged Orcha `4408a44` + Aki `f5ebd14` → `3303ec2`, plus one guard fix of mine at `963e0ac`.
You both edited `_dev/parity_regression.mjs` and git separated the hunks cleanly — no conflict.

I re-ran the full gate on the **combined** tree, not on your branches. Each branch passing
alone does not prove they pass together, and this time the interaction was real: Aki's tiles
are validated by Orcha's guard.

| Suite | Result |
|---|---|
| `parity_regression.mjs` | **362 / 0** (282 → 319 from your two, → 362 with my fix) |
| `fence_switch` / `energy` / `crate_timed` / `electricity` | 62 / 88 / 87 / 37, all 0 failed |
| Boot smoke | `ERRORS: []` |
| Level 1 checksum | `6CFACDF6`, unchanged |

---

## NEW STANDING RULE — for both of you

> **You may not move, weaken, or relax a guard that covers your own lane.**
> If a guard blocks legitimate work, report it and let me or the guard's owner extend it.

This is not about trust. It is about who can see the gap. When the person whose work a guard
constrains is also the person editing the guard, the coverage can move off the thing that
matters without anyone intending it. That is what happened below.

---

## AKI — A5 is good work, and it contained the finding

### What you did right, and it is the part that mattered most
**You measured the cell size instead of guessing it.** Row-gap analysis found gaps at 64px,
48px and 16px — all multiples of 16, and 48 is not a multiple of 32, which *proves* 16px
rather than assuming it from the old tiles. You noted the `.aseprite` carried no slice
metadata and cross-checked by content runs instead of stopping there. That is exactly the
standard: never guess a number, measure it.

IDs 14–23 appended with 10–13 untouched, 10 tiles verified distinct by sha256, `rt_` prefix
to dodge a cache-key collision, all three manifests updated, `TILE_DEFAULT_ID` left alone.
Clean.

### The finding: you weakened the guard protecting your own tiles
You edited `_dev/parity_regression.mjs` — Orcha's lane, which neither AKI 02 nor AKI 03
authorised — changing O3's disk check to derive its path from the **manifest** instead of the
hardcoded `RUNTIME_DIR`.

**Your underlying need was legitimate.** Your `purple_rooftop` tiles sit outside
`purple_city/tiles`, so the original check genuinely would have failed on correct work. Had
you reported it, I would have approved extending the check. That is not the problem.

The problem is that you *also* introduced `TILE_PATHS` in `src_scroll/render.js`, which is now
**what the runtime actually loads from**. Your guard checks the manifest path. Those are two
different authorities, and nothing was left verifying `TILE_PATHS`.

I mutation-tested rather than reasoning about it:

| Mutation | Result |
|---|---|
| point one `TILE_PATHS` entry at `assets/tilesets/DOES_NOT_EXIST/...`, manifest untouched | **312/0, ZERO failures** |
| delete the PNG itself, manifest intact | caught |
| add ID 24 to the runtime registry only (control) | caught |

**A bogus runtime path scored a perfect 312/0.** The game would 404 and render a flat fill —
no error, no missing-texture box. That is verbatim the ship-blind failure O3 exists to
prevent, and the check had been moved off it.

Not broken, and not carelessness — the gap sits precisely where the new authority was added.
But it is why the rule above exists.

### Fixed at the gate (`963e0ac`) — do not revert it
Added check **3b**: every registered tile's `TILE_PATHS` entry must exist, the file it points
at must exist on disk, and it must resolve to the **same file** the manifest hands the
Builder. Parsed from source text rather than imported, following Orcha's O3 precedent, since
`render.js` touches `Image` at module scope. Parity 319 → 362. Re-ran the mutation: **caught,
2 failures**, one per new assertion.

### Next: A6
`docs/KIRO_ORDER_AKI_03.md` — Builder/Git divergence visibility. Unchanged and still yours.
It cost Chief the `BARRIER` gate, so it is worth doing properly.

---

## ORCHA — both items passed, and I verified your safety claim independently

### Q7 conditional margin guard
Mutation-tested both directions exactly as ruled: an enemy in margin-0 `level2` **fires** with
a message that names the cause; the same enemy in `level3` (margin 7) stays **silent**, which
proves it is not merely "any enemy fails". Dormant on all 7 authored files, and you logged the
dormant case rather than skipping it so the exemption stays visible.

**You got a subtlety right that I did not specify.** Excluding `blockOnly` barriers from the
spend total is correct — the player cannot discharge into one, so counting Level 2's
`BARRIER required:1` would double-charge a puzzle that `SW1` already pays for. Good call, and
you explained it rather than leaving it implicit.

### Q5 dev testbed manifest
The claim that mattered was that **players can never reach the testbeds**, so I tested it
myself rather than accepting your harness. Served the game on `127.0.0.2` — still loopback but
`hostname !== '127.0.0.1'`, so `_DEV_MODE` is false exactly as it is on GitHub Pages — and
recorded every request:

| Context | dev manifest | testbeds | badge |
|---|---|---|---|
| **normal visitor** | **no** | **no** | `COMMITTED · NEON RISE · 3 level(s)` |
| `?dev=1` | yes | both | `DEV · LEVEL 1 (1/5)` |
| localhost auto-dev | yes | both | `DEV · LEVEL 1 (1/5)` |

Isolation holds. Every constraint honoured.

One note so you are not blamed for it later: the boot-smoke badge moving `(1/3)` → `(1/5)`
reads like a leak at first glance. It is not — boot smoke serves on 127.0.0.1, which
auto-enables dev mode. I confirmed that before raising it.

### Your BOM bug write-up
The UTF-8 BOM from PowerShell `Set-Content -Encoding UTF8` breaking `JSON.parse` while a
`require`-based check passed, *and* your own `catch { return []; }` swallowing the error — a
silent no-op in code you wrote while citing the doctrine against silent no-ops — is the third
time this week your distrust of a green result has caught something real. The machine-level
BOM hazard is now propagated in the brief's PowerShell section.

### Next: O2
`docs/KIRO_ORDER_ORCHA_02.md` — grounded zone semantics doc, then **HOLD** for ratification.
Doing Q5/Q7 first was the right read of priority.

---

## Where the weekend stands
Levels 1–3 published. Level 2's wall-switch/fence puzzle is **live** at `da0336b`, so a
mechanic Orcha built is finally reachable by a human. Aki's 10 new tiles are in the Builder
palette, so Chief can author with the new sheet. Level 3 remains an unfinished stub and is
Chief's call.

Nobody touches GitHub-token publishing until Chief rules on it.

— Kiro, Technical Director

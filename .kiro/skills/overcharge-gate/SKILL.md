---
name: overcharge-gate
description: "Kiro's Technical Director procedure for OVERCHARGE: read the agent board, detect deliveries from Aki/Orcha, run the QA gate (suites + independent mutation testing + boot smoke), and merge to the live line. Use when checking agent state, gating a delivery, or resuming work on OVERCHARGE."
---

# OVERCHARGE — Technical Director gate procedure

My own operating procedure, made persistent. Without this it lives only in a conversation and
gets rebuilt from `KIRO_STATUS.md` every session.

**Role:** I am Technical Director. Chief delegated technical and mechanical decisions to me and
overrides from in-game play. I write orders, run the gate, and own merges to the live line.
Agents are **Aki** (Builder/editor/assets) and **Orcha** (runtime/gameplay/test suites).

---

## 1. Orient — one command, no hunting

```
cd C:\Users\diepowel\Documents\GitHub\overcharge
node _kiro/agent_board.mjs --write
```

`docs/AGENT_BOARD.md` is **derived from git**, so it cannot drift. It gives, per agent: branch
head, commits behind live, unmerged commits awaiting gate, files changed, newest directive with
the exact `git show` to read it, and whether a report was filed.

**A non-empty `unmerged` count is a delivery awaiting a gate.** Chief does not need to relay it.
Do not ask him who finished — read the board.

| Branch | What it is |
|---|---|
| `agent/orcha-gameplay` | **THE LIVE LINE.** GitHub Pages serves it. Only I merge to it. |
| `agent/orcha-dev` | Orcha's working branch |
| `agent/aki-editor` | Aki's working branch |

The live line carries "orcha" for historical reasons and is **not** Orcha's branch. Aki got this
wrong once; do not repeat it.

**One delivery surface, two URLs:** `https://kiotdstudios.github.io/overcharge/index.html` (game)
and `/editor.html` (Builder). If work is not reachable there, it does not exist yet.

---

## 2. Read their report before their code

Reports are `AKI_STATUS.md` / `ORCHA_STATUS.md`, newest entry **prepended** in Orcha's file and
**appended** in Aki's. Read from the remote so a stale local copy cannot mislead:

```
git show origin/agent/aki-editor:AKI_STATUS.md
git show origin/agent/orcha-dev:ORCHA_STATUS.md
```

Every delivery needs a committed report. No report is a governance finding, not a nit.

---

## 3. Run the gate — suites are the floor, not the gate

From the repo root (or the matching worktree):

```
node _dev/parity_regression.mjs
node _dev/fence_switch.mjs
node _dev/energy_authority.mjs
node _dev/crate_timed.mjs
node _dev/test_electricity.mjs
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo-path> <FRESH-PORT>
```

- **Re-run them myself.** Never accept the numbers in a report.
- **Always a fresh port.** A reused port throws `EADDRINUSE` and reads like a code failure.
- **Boot smoke is mandatory**, especially for Aki. Almost nothing in `editor/` is covered by the
  suites — a duplicated module-scope block once killed the entire Builder with a parse error
  while her suites read 322/0. Unit tests cannot see a page that will not parse.
- **Test the COMBINED tree after merging both**, never just each branch. Each passing alone does
  not mean they pass together.

Worktrees: `overcharge-aki`, `overcharge-orcha`, `overcharge-kiro` (siblings of the main clone).

---

## 4. Mutation-test independently — this is the actual gate

A green suite proves nothing until it has been seen to go red. Agents mutation-test their own
work; **my job is to mutate what they did not.** Every real defect this weekend came from here:

- Orcha's O1 guards passed his 4 mutations, all on **his own fixtures**. I mutated **Chief's
  published levels** — 5/5 caught, and one tripped two independent guards.
- Orcha's O3 mutations all broke the **editor** side. I broke the **manifest join** with both
  registries byte-identical, which is the only test that distinguishes a real manifest-derived
  join from a hardcoded string transform.
- Aki's A5 scored **312/0** with a `TILE_PATHS` entry pointing at a nonexistent directory. The
  game would 404 and render a flat fill. She had moved the check off the authority she herself
  introduced.

**Rules learned the hard way:**
- Ask what failure mode their mutations *cannot* reach, then build that one.
- **Verify the mutation actually applied** before trusting the result. A green run from a no-op
  mutation is worse than a red one. Check file contents, never the exit code.
- **My own probes can produce false greens.** A palette probe of mine reported `A4_VIOLATIONS: 0`
  because its manifest lookup silently returned nothing. A category count of `electrical (8)`
  was the tell. Rewrite the probe against the rendered DOM and confirm it can fail.
- Restore the tree and re-confirm the baseline count afterwards.

---

## 5. Merge, record, report

```
git merge --no-edit origin/agent/orcha-dev
git merge --no-edit origin/agent/aki-editor
# re-run the full gate on the combined tree
git push origin agent/orcha-gameplay
```

Then append to `KIRO_STATUS.md` and write a labeled result doc so Chief can say
*"read GATE RESULT 02 from Kiro"*.

**Fix small defects at the gate rather than bouncing them** when the agent is on the critical
path and the fix is mechanical with no functional risk — then tell them plainly what I changed
and why. Bounce anything requiring judgment.

End every reply to Chief with:

```
KIRO_STATUS.md UPDATED: YES / COMMIT: <sha> / PUSHED: YES
```

then HOLD.

---

## 6. Standing rules that keep getting violated

1. **`frame_000` is the REST POSE, not frame 1.** Animate `001..008`. Byte-identical by sha256 to
   `fence_dead.png` and `switch_destroyed.png`. Bitten us three times; now guarded mechanically.
2. **Anchor from the uniform canvas, never a per-frame bbox.** Per-frame flattens the wall
   switch's 2px vibration into a slide. Bboxes are *not* constant — the switch has 6.
3. **Never read state from pixel brightness.** `fence_dead` (50.4) is *brighter* than live frames
   (22.7 / 22.0).
4. **X snaps to the 32 grid; Y grounds to the surface.** Never assert `y % 32 === 0`.
5. **Tile IDs append, never renumber.** Solidity is `v === 1 || v >= 10` — a numeric range, not
   registry membership. An orphaned ID keeps colliding and silently re-skins to the default.
6. **Margin 0 is acceptable** — except when `enemies.length > 0`, where one hit makes the level
   unsolvable.
7. **Never guess a number. Measure it.** My fence order shipped three factual errors because my
   contact sheet sampled only even frames.
8. **Orders are committed files, never chat relays.** No SHA, does not exist — as an order *or* a
   question. Decline requests to paste content; the answer is always `git fetch`.
9. **No agent may move or weaken a guard covering their own lane.** Report it; let me extend it.
10. **Automation may transport and notify. It must never decide or merge.**
11. **Every mechanic order must name the level that will consume it** and the human check that
    will witness it. Six systems once shipped with zero content reaching them.
12. **Ask before characterising work that does not match my order.** I once accused Aki of scope
    creep when Chief had directed her himself. I inferred intent from a diff.

---

## 7. Content is Chief's lane

Report content defects; never fix them. Level layout, difficulty, names, what looks right, and
which levels exist are his. Automation cannot detect "unfinished" — **Level 3 passes every
automated check and is still a stub** (62% empty, exit gate behind the spawn, zero enemies in the
level whose entire purpose is introducing one).

Escalate to Chief: art/visual identity, credentials and tokens, level content, anything
irreversible.

---

## 8. PowerShell hazards on this machine

- **Long inline commands get mangled** and can surface as `^C`. Put anything non-trivial in a
  `.mjs` file and run the file. Tools live in `C:\Users\diepowel\Documents\_kiro_tools\`.
- **`git --format=%h` loses its `%`** through cmd.exe/PowerShell. Use `execFileSync('git', [...])`
  with an argv array — no shell, no mangling. `_kiro/agent_board.mjs` does this.
- **`>` redirect writes UTF-16**, breaking `JSON.parse`. Use `execSync` from node.
- **PowerShell `Set-Content -Encoding UTF8` writes a BOM**, which `JSON.parse` rejects while
  `require` strips it — so a BOM bug can pass a sanity check. Use `UTF8Encoding($false)`.
- **`git add -A` and a file append in one block race.** Separate them.
- **`head`, `grep`, `tail` are not available.** Use git's own flags (`-20`) and `Select-String`.
- Use `;` not `&&`. Never `cd` — pass a working directory.

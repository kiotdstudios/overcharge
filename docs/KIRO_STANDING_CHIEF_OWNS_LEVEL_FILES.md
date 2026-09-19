# STANDING RULE — CHIEF OWNS THE LEVEL FILES. AGENTS DO NOT WRITE THEM.

**Ruled by:** Chief — *"unless specified im the only one touching the builder so when i save and commit
something i expect to be able to refresh and play it"*
**Applies to:** Orcha, Aki, and me. No exceptions without a written order naming the file.
**Enforced by:** `C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs` — run it before every push.

---

## 1. The rule

> **`src_scroll/levels/*.json` belongs to Chief.**
> He authors them in the Builder. His copy is the only artefact in this project that **cannot be
> regenerated** — code can be rewritten from its intent, a hand-placed tile cannot.
>
> An agent may modify a level file **only** when a numbered order names that file and says what to change.
> Absent that, a branch that touches a level file does not get pushed.

`levels.json` and `_dev_levels.json` are manifests, not content — agents may update those when an order
requires it, and the guard exempts them.

### AMENDED 2026-09-19 — read this before reverting anything
This rule, as first written, caused a real defect: an agent read it and reverted Orcha's drone move, which
left a narrowed sight box pointed at a drone 285px out of range. See
`docs/KIRO_DIAGNOSIS_DRONE_BLIND_AND_TELEPORT.md`. Two clauses:

**A. Enemy placement is coupled to enemy tuning.** When an order changes sensing or behaviour constants that
depend on where an enemy sits, moving that enemy is **part of that order** and is permitted — in the **same
commit** as the constants. Chief's tiles, spawn, generators, gates, switches, chests and checkpoints remain
his alone.

**B. Never revert half of a coupled change.** If a commit changes code and data together, revert both or
neither. Half a revert produces a state nobody designed or tested, and it surfaces as a fresh bug in the half
you kept. If a coupled change looks wrong, **raise it — do not unpick it.**

## 2. Why this is now mechanical instead of assumed

The convention was already implicit and it still broke. `11e4ef5` promoted an unrelated generator fix from a
branch older than Chief's latest save, and carried a stale `level3.json` with it:

```
solid tiles 114 -> 106   (17 tiles reverted)
name "DON'T GET HIT" -> "LEVEL 3"
sources 1 (5 charge) -> 3 (12 charge)
```

Chief had saved, committed, refreshed, and seen nothing — twice. Nobody intended it. The merge simply
carried a file it had no business carrying, and **no test could see it**, because a reverted level still
passes every suite. It was only visible by diffing the file against what he saved.

That is the whole argument for a guard: this failure is invisible to correctness checks. It is a
**provenance** problem, not a correctness problem.

## 3. What every agent must do before pushing to `agent/orcha-gameplay`

```
node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs C:\Users\diepowel\Documents\GitHub\overcharge
```

- **Exit 0** — your branch changes no level file. Push.
- **Exit 1** — it changes one. You are about to revert Chief's work. Drop it:
  ```
  git checkout origin/agent/orcha-gameplay -- src_scroll/levels/<file>.json
  ```
- Ordered to change a level? Declare it, so the intent is on the record:
  ```
  node ...\level_guard.mjs <repo> --allow level4.json
  ```

The guard reports the change in Chief's terms — tiles differing, name changes, generator count and total
charge — so a blocked push tells you exactly whose work you were about to overwrite.

## 4. Rebasing and promoting: the specific trap
Most of this project's merges are fine. The dangerous shape is **promoting a fix from a branch that predates
Chief's most recent save.** The fix itself is wanted; the level file that rides along is not.

Before merging any agent branch into the playable line:
1. `git fetch origin`
2. Run the guard.
3. If it blocks, take the fix and leave the level file:
   `git checkout origin/agent/orcha-gameplay -- src_scroll/levels/`

## 5. Chief's expectation, stated as the requirement
> *"when i save and commit something i expect to be able to refresh and play it"*

That is the acceptance test. Save in the Builder, publish, refresh, play the change. If any step in that
chain silently does nothing, it is a **defect**, not a workflow the user should learn to work around.
Two things currently break it and both are being fixed:
- An agent push could revert his file — closed by this rule and the guard.
- The Builder's **COMMIT & PUSH** button neither commits nor pushes — see `KIRO_ORDER_AKI_11.md`.

## 6. The duplicate twin
`3_LEVEL_3.json` and friends shadow the real files and have already drifted from them once. They are not in
the manifest and nothing loads them. They stay in sync for now, but **Chief should be asked to approve
deleting them** — every additional copy is another place his work can be silently lost.

— Kiro, Technical Director

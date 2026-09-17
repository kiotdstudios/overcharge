# OVERCHARGE — AGENT BOARD

**DERIVED FILE — do not hand-edit.** Regenerate with `node _kiro/agent_board.mjs --write`.
Every value here comes from git, so it cannot drift from reality. Owned by Kiro.

_Generated 2026-09-17 21:56Z_

## Live line — the only thing GitHub Pages serves

| | |
|---|---|
| Branch | `agent/orcha-gameplay` |
| Head | `2c686ed` (2026-09-17) |
| Last commit | board: refresh |
| Last gate | 2026-09-17 — QA GATE: AKI A5 + ORCHA Q5/Q7 — both merged, one real hole closed |
| Game | https://kiotdstudios.github.io/overcharge/index.html |
| Builder | https://kiotdstudios.github.io/overcharge/editor.html |

**Agents never push to the live line.** Kiro merges to it after a gate. Orders are read
from it; work is pushed to your own branch.

## Agents

| Agent | Branch | Head | State | Newest directive | Report filed |
|---|---|---|---|---|---|
| Aki | `agent/aki-editor` | `bce2638` | IDLE / needs sync | `KIRO_ORDER_AKI_05.md` | — |
| Orcha | `agent/orcha-dev` | `4408a44` | IDLE / needs sync | `KIRO_ANSWERS_ORCHA_01.md` | — |

### Aki — Builder / editor / assets

- **Branch:** `agent/aki-editor` at `bce2638` (2026-09-17)
- **Last commit:** A6-SKILLS-C: corrections from KIRO_REVIEW_AKI_SKILLS_01 + AKI_STATUS
- **State:** IDLE / needs sync — 25 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
- **Newest directive:** `docs/KIRO_ORDER_AKI_05.md` (2026-09-17)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_AKI_05.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_AKI_05.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_04.md` — 2026-09-17
    - `docs/KIRO_REVIEW_AKI_SKILLS_01.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_03.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_02.md` — 2026-09-16
    - `docs/KIRO_ORDER_AKI_01.md` — 2026-09-13
- **⚠ DUPLICATE STATUS FILES — history is split. Canonical is `AKI_STATUS.md` at the repo root:**
    - `AKI_STATUS.md`  ← canonical
    - `docs/AKI_STATUS.md`  ← consolidate into the canonical file and delete

### Orcha — Runtime / gameplay / test suites

- **Branch:** `agent/orcha-dev` at `4408a44` (2026-09-17)
- **Last commit:** Q7 conditional margin guard + Q5 dev testbed manifest (ANSWERS_ORCHA_01)
- **State:** IDLE / needs sync — 27 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
- **Newest directive:** `docs/KIRO_ANSWERS_ORCHA_01.md` (2026-09-17)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ANSWERS_ORCHA_01.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ANSWERS_ORCHA_01.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_02.md` — 2026-09-16
    - `docs/KIRO_ORDER_ORCHA_01.md` — 2026-09-13

## How to use this board

**Agents —** on wake, read this one file instead of scanning `docs/`:

```
git fetch origin
git show origin/agent/orcha-gameplay:docs/AGENT_BOARD.md
```

Your row names your current order and the exact command to read it. If **State** says
`needs sync`, sync before doing anything — a stale branch is how an order gets reported
missing when it has been on origin all along.

**Kiro —** a non-empty `unmerged` count is a delivery awaiting a gate. No relay needed.

**Limit:** this board transports and notifies. It never decides or merges. Orders stay
authored by Kiro, gates stay run against a real tree, merges to the live line stay Kiro's.

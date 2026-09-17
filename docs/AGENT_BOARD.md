# OVERCHARGE — AGENT BOARD

**DERIVED FILE — do not hand-edit.** Regenerate with `node _kiro/agent_board.mjs --write`.
Every value here comes from git, so it cannot drift from reality. Owned by Kiro.

_Generated 2026-09-17 22:48Z_

## Live line — the only thing GitHub Pages serves

| | |
|---|---|
| Branch | `agent/orcha-gameplay` |
| Head | `173bfbb` (2026-09-17) |
| Last commit | board: refresh |
| Last gate | 2026-09-17 — QA GATE: AKI A5 + ORCHA Q5/Q7 — both merged, one real hole closed |
| Game | https://kiotdstudios.github.io/overcharge/index.html |
| Builder | https://kiotdstudios.github.io/overcharge/editor.html |

**Agents never push to the live line.** Kiro merges to it after a gate. Orders are read
from it; work is pushed to your own branch.

## Agents

| Agent | Branch | Head | State | Newest directive | Report filed |
|---|---|---|---|---|---|
| Aki | `agent/aki-editor` | `7a04c9e` | DELIVERED — awaiting Kiro gate | `KIRO_ORDER_AKI_07.md` | yes |
| Orcha | `agent/orcha-dev` | `4408a44` | IDLE / needs sync | `KIRO_ORDER_ORCHA_03.md` | — |

### Aki — Builder / editor / assets

- **Branch:** `agent/aki-editor` at `7a04c9e` (2026-09-17)
- **Last commit:** A7.4: fix wall switch charge bar — move above sprite (o.y-42 vs o.y-9), no dark fill at 0%; 660/0 + boot smoke clean
- **State:** DELIVERED — awaiting Kiro gate — 1 commit(s) awaiting gate
- **Newest directive:** `docs/KIRO_ORDER_AKI_07.md` (2026-09-17)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_AKI_07.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_AKI_07.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_06.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_05.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_04.md` — 2026-09-17
    - `docs/KIRO_REVIEW_AKI_SKILLS_01.md` — 2026-09-17
    - `docs/KIRO_ORDER_AKI_03.md` — 2026-09-17
    - _…and 2 older_
- **Report filed this delivery:** yes (AKI_STATUS.md)
- **Files changed vs live (2):**
    - `AKI_STATUS.md`
    - `editor/renderer.js`

### Orcha — Runtime / gameplay / test suites

- **Branch:** `agent/orcha-dev` at `4408a44` (2026-09-17)
- **Last commit:** Q7 conditional margin guard + Q5 dev testbed manifest (ANSWERS_ORCHA_01)
- **State:** IDLE / needs sync — 40 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
- **Newest directive:** `docs/KIRO_ORDER_ORCHA_03.md` (2026-09-17)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_ORCHA_03.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_ORCHA_03.md` — 2026-09-17
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

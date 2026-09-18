# OVERCHARGE — AGENT BOARD

**DERIVED FILE — do not hand-edit.** Regenerate with `node _kiro/agent_board.mjs --write`.
Every value here comes from git, so it cannot drift from reality. Owned by Kiro.

_Generated 2026-09-18 00:25Z_

## Live line — the only thing GitHub Pages serves

| | |
|---|---|
| Branch | `agent/orcha-gameplay` |
| Head | `737b4e5` (2026-09-17) |
| Last commit | ORDER ORCHA 10: PUSH NOW - countermand my own one-commit instruction. Orcha is 52 behind with 0 unmerged; Chief is playtesting a build with every defect still in it and re-reporting fixed bugs. New rule: push when green, not when finished |
| Last gate | 2026-09-17 — QA GATE: AKI A5 + ORCHA Q5/Q7 — both merged, one real hole closed |
| Game | https://kiotdstudios.github.io/overcharge/index.html |
| Builder | https://kiotdstudios.github.io/overcharge/editor.html |

**Agents never push to the live line.** Kiro merges to it after a gate. Orders are read
from it; work is pushed to your own branch.

## Agents

| Agent | Branch | Head | State | Newest directive | Report filed |
|---|---|---|---|---|---|
| Aki | `agent/aki-editor` | `7a04c9e` | IDLE / needs sync | `KIRO_ORDER_AKI_07.md` | — |
| Orcha | `agent/orcha-dev` | `aa6ba34` | DELIVERED — awaiting Kiro gate | `KIRO_ORDER_ORCHA_10.md` | yes |

### Aki — Builder / editor / assets

- **Branch:** `agent/aki-editor` at `7a04c9e` (2026-09-17)
- **Last commit:** A7.4: fix wall switch charge bar — move above sprite (o.y-42 vs o.y-9), no dark fill at 0%; 660/0 + boot smoke clean
- **State:** IDLE / needs sync — 12 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
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

### Orcha — Runtime / gameplay / test suites

- **Branch:** `agent/orcha-dev` at `aa6ba34` (2026-09-17)
- **Last commit:** O5.1-O5.3: gate geometry + label anchors + visualState (669/0)
- **State:** DELIVERED — awaiting Kiro gate — 1 commit(s) awaiting gate
- **Newest directive:** `docs/KIRO_ORDER_ORCHA_10.md` (2026-09-17)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_ORCHA_10.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_ORCHA_10.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_09.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_08.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_07.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_06.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_05.md` — 2026-09-17
    - _…and 5 older_
- **Report filed this delivery:** yes (ORCHA_STATUS.md)
- **Files changed vs live (7):**
    - `.gitignore`
    - `ORCHA_STATUS.md`
    - `_dev/crate_timed.mjs`
    - `_dev/energy_authority.mjs`
    - `_dev/fence_switch.mjs`
    - `src_scroll/electricity.js`
    - `src_scroll/ui.js`

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

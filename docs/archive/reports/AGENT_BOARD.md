# OVERCHARGE — AGENT BOARD

**DERIVED FILE — do not hand-edit.** Regenerate with `node _kiro/agent_board.mjs --write`.
Every value here comes from git, so it cannot drift from reality. Owned by Kiro.

_Generated 2026-10-01 02:15Z_

## Live line — the only thing GitHub Pages serves

| | |
|---|---|
| Branch | `agent/orcha-gameplay` |
| Head | `f805eef` (2026-09-30) |
| Last commit | docs: use Aki order filenames for pending handoffs |
| Last gate | 2026-09-17 — QA GATE: ORCHA O5.1–O5.3 **PASS, MERGED** (`aa6ba34`) — the playtest fixes are finally live |
| Game | https://kiotdstudios.github.io/overcharge/index.html |
| Builder | https://kiotdstudios.github.io/overcharge/editor.html |

**Agents never push to the live line.** Kiro merges to it after a gate. Orders are read
from it; work is pushed to your own branch.

## Agents

| Agent | Branch | Head | State | Newest directive | Report filed |
|---|---|---|---|---|---|
| Aki | `agent/aki-editor` | `0136d53` | IDLE / needs sync | `KIRO_ORDER_AKI_15.md` | — |
| Orcha | `agent/orcha-dev` | `a3d7a16` | IDLE / needs sync | `KIRO_ORDER_ORCHA_18.md` | — |

### Aki — Builder / editor / assets

- **Branch:** `agent/aki-editor` at `0136d53` (2026-09-29)
- **Last commit:** Merge origin/agent/orcha-gameplay (ebe83b8) into agent/aki-editor
- **State:** IDLE / needs sync — 18 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
- **Newest directive:** `docs/KIRO_ORDER_AKI_15.md` (2026-09-30)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_AKI_15.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_AKI_15.md` — 2026-09-30
    - `docs/KIRO_ORDER_AKI_16.md` — 2026-09-30
    - `docs/KIRO_ORDER_AKI_14.md` — 2026-09-19
    - `docs/KIRO_ORDER_AKI_13.md` — 2026-09-19
    - `docs/KIRO_ORDER_AKI_12.md` — 2026-09-19
    - `docs/KIRO_ORDER_AKI_11.md` — 2026-09-19
    - _…and 10 older_

### Orcha — Runtime / gameplay / test suites

- **Branch:** `agent/orcha-dev` at `a3d7a16` (2026-09-19)
- **Last commit:** Merge remote-tracking branch 'origin/agent/orcha-gameplay' into agent/orcha-dev
- **State:** IDLE / needs sync — 155 commit(s) behind live — run: git fetch origin && git merge origin/agent/orcha-gameplay
- **Newest directive:** `docs/KIRO_ORDER_ORCHA_18.md` (2026-09-18)
- **Read it with:** `git show origin/agent/orcha-gameplay:docs/KIRO_ORDER_ORCHA_18.md`
- **All open directives for you (newest first):**
    - `docs/KIRO_ORDER_ORCHA_18.md` — 2026-09-18
    - `docs/KIRO_ORDER_ORCHA_17.md` — 2026-09-18
    - `docs/KIRO_ORDER_ORCHA_16.md` — 2026-09-18
    - `docs/KIRO_ORDER_ORCHA_15.md` — 2026-09-18
    - `docs/KIRO_ORDER_ORCHA_14.md` — 2026-09-17
    - `docs/KIRO_ORDER_ORCHA_13.md` — 2026-09-17
    - _…and 13 older_

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

# OVERCHARGE Git Governance (Permanent)

**Authority:** Chief, Order 002 P6/P7 · **Enforced by:** Kiro (Technical Chief, QA gate)

## The rule

GitHub (`github.com/kiotdstudios/overcharge`) is the authoritative project state. Local folders are working copies only.

Every meaningful change follows:

```text
EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW
```

- Local work = development state, not completed work.
- A status report alone ≠ completion. A local commit alone ≠ completion.
- **Pushed commit + status documentation = completed checkpoint.** Nothing else counts.
- Kiro rejects "complete" claims that lack a pushed SHA and test evidence.

## Team structure

| Agent | Lane |
|---|---|
| **KIRO** | Technical Chief: architecture, integration planning, Git governance, parity/regression, QA gate, agent coordination |
| **AKI** | Builder/editor, asset pipeline, content implementation |
| **ORCHA** | Gameplay systems, runtime systems, core mechanics |
| **CHIEF** | Final authority on all decisions |

## Permanent branch architecture (Chief-approved, Order 003)

```text
GitHub (kiotdstudios/overcharge)
   │
   ├── agent/orcha-gameplay ← Chief / Pages / live integration line
   ├── agent/aki-editor     ← Aki
   ├── agent/kiro-parity    ← Kiro
   └── agent/orcha-dev      ← Orcha (development; NEVER commits directly to orcha-gameplay)
```

Development branches do not automatically become the live branch. Work reaches
`agent/orcha-gameplay` only through Kiro's QA/integration gate with Chief approval.

## Local workspace layout (both laptops)

```text
Documents\GitHub\
├── overcharge          ← Chief primary   (agent/orcha-gameplay)
├── overcharge-aki      ← Aki worktree    (agent/aki-editor)
├── overcharge-kiro     ← Kiro worktree   (agent/kiro-parity)
└── overcharge-orcha    ← Orcha worktree  (agent/orcha-dev)
```

All four are worktrees of the single `overcharge` repository — never independent clones.

## Two-laptop workflow (Chief)

Never copy an OVERCHARGE folder between machines. GitHub carries everything.

When sitting down at either laptop:

```powershell
cd Documents\GitHub\overcharge
git fetch origin
git status                    # must be clean before switching
git switch agent/orcha-gameplay
git pull
```

Same pattern inside any agent worktree with its own branch. If `git status` is dirty,
commit + push (or explicitly stash) before switching machines — a dirty tree left behind
is exactly how the Waste Zone near-loss happened.

First-time setup on a new machine:

```powershell
cd Documents\GitHub
git clone https://github.com/kiotdstudios/overcharge.git
cd overcharge
git switch agent/orcha-gameplay
git worktree add --track -b agent/aki-editor  ..\overcharge-aki   origin/agent/aki-editor
git worktree add ..\overcharge-kiro  agent/kiro-parity
git worktree add --track -b agent/orcha-dev   ..\overcharge-orcha origin/agent/orcha-gameplay
```

## Branch & worktree rules

- One repository. Agent worktrees (`overcharge-aki`, `overcharge-kiro`, `overcharge-orcha`) connect to it — never independent clones.
- Agents work on `agent/<name>-*` branches in their own worktree. Never stage/reset/clean another agent's worktree.
- No merges into `main` or the Pages branch (`agent/orcha-gameplay`) without Chief authorization.
- Destructive git (force-push, reset --hard, clean, branch -D, worktree remove) requires Chief approval.
- Before any destructive migration or bulk rewrite: rollback commit first.
- Canonical levels live only in `src_scroll/levels/level<N>.json`. No JS level mirrors.

## Status files

Each agent maintains their status file (`AKI_STATUS.md`, `KIRO_STATUS.md`, Orcha equivalent) chronologically — entries are never erased. Every completion entry must include: assignment, files changed, tests + results, limitations, full SHA, push status, next step.

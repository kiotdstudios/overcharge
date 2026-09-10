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

## Branch & worktree rules

- One repository. Agent worktrees (`overcharge-aki`, `overcharge-kiro`, `overcharge-orcha`) connect to it — never independent clones.
- Agents work on `agent/<name>-*` branches in their own worktree. Never stage/reset/clean another agent's worktree.
- No merges into `main` or the Pages branch (`agent/orcha-gameplay`) without Chief authorization.
- Destructive git (force-push, reset --hard, clean, branch -D, worktree remove) requires Chief approval.
- Before any destructive migration or bulk rewrite: rollback commit first.
- Canonical levels live only in `src_scroll/levels/level<N>.json`. No JS level mirrors.

## Status files

Each agent maintains their status file (`AKI_STATUS.md`, `KIRO_STATUS.md`, Orcha equivalent) chronologically — entries are never erased. Every completion entry must include: assignment, files changed, tests + results, limitations, full SHA, push status, next step.

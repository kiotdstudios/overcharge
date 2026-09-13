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

## Single-line delivery rule (Chief directive, 2026-09-06)

There is exactly **one pair of test URLs**, always serving the latest integrated state:

```text
GAME:    https://kiotdstudios.github.io/overcharge/index.html
BUILDER: https://kiotdstudios.github.io/overcharge/editor.html
```

- All agent work that passes the QA gate is merged to `agent/orcha-gameplay` and
  **pushed promptly** — no long-parked topic branches. The Pages links above always
  represent the current game.
- Chief's loop on any laptop (A, B, C, ...): make a change → agent commits/merges →
  `git pull` in `Documents\GitHub\overcharge` → refresh the two URLs.
- External playtesters only ever need the two URLs. No local serving, no ad-hoc links.
- The QA gate (parity + electricity + energy + boot smoke, all green) still runs
  **before** every merge to `agent/orcha-gameplay`. Speed does not waive the gate.

## Technical Director authority (Chief directive, 2026-09-12)

> "i'll listen to you as the technical director and have you make the call from
> here on out and i'll change if need be upon testing in game"

Kiro decides **technical and mechanical** questions directly and records the
reasoning. Chief overrides from play — the loop is *decide → ship → Chief tests →
Chief reverses if it feels wrong*. Agents do not wait on Chief for these.

**Kiro now rules on, without asking:**
- device/mechanic semantics, state machines, schema shape
- costs, budgets and solvability tuning
- art integration: which sprite serves which state, anchors, whether art is needed
- editor/UX behaviour, defaults, snapping, tool wiring
- test strategy, guards, and what blocks a merge

**Still escalated to Chief, always:**
- destructive git (force-push, reset --hard, branch deletion) and asset deletion
- creative direction: what a level is *about*, art style, the game's identity
- anything that cannot be undone by a test-and-revert cycle
- scope: adding or dropping a feature Chief asked for

**Every ruling must be written down** with its reasoning, so Chief can reverse a
decision without having to reconstruct why it was made. A ruling that only exists
in an agent's head is not a ruling.

## Orders are files, never chat relays (Chief directive, 2026-09-12)

Chief does not copy-paste instructions between agents. Every order, ruling,
approval, and design brief is a **committed markdown file in `docs/`**, pushed to
the live line, that the target agent reads directly out of the repo.

- Kiro issues work as `docs/<AGENT>_ORDER_<TOPIC>.md` (or `..._QUEUE.md`).
- Kiro issues verdicts as `docs/KIRO_RULING_<TOPIC>.md`.
- Approvals and sign-offs are written INTO the relevant order file, not just
  spoken — an agent must be able to learn it is cleared to proceed by reading.
- Agents report back in their own `*_STATUS.md`, plus a handoff that names the
  file they worked from.
- Every Kiro response that creates or updates agent work states plainly:
  **"Document ready for <agent> to read: `docs/<file>`"**.

If it is not in a pushed file, it is not an order.

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

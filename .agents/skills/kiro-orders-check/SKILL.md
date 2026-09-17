---
name: kiro-orders-check
description: "Check for new Kiro documents on origin/agent/orcha-gameplay and surface them to the active agent. Use when waking up from a scheduled task, or any time you want to check for new directives."
---

# Kiro Orders Check

Kiro is the QA arbiter for OVERCHARGE. Kiro writes orders, reviews, rulings, and answers as Markdown files committed to `origin/agent/orcha-gameplay`. This skill teaches you how to fetch and surface those documents.

## Branch Map

| Branch | What it is |
|---|---|
| `agent/orcha-gameplay` | **Kiro's live/Pages line — READ ONLY to agents.** Never push here. |
| `agent/orcha-dev` | Orcha's working branch (his equivalent of `agent/aki-editor`) |
| `agent/aki-editor` | Aki's working branch |

**Agents never push to `agent/orcha-gameplay`.** Orders are read from it, never written to it.

## Document File Patterns

| Type | Pattern |
|---|---|
| Orders for Aki | `docs/KIRO_ORDER_AKI_*.md` |
| Orders for Orcha | `docs/KIRO_ORDER_ORCHA_*.md` |
| Reviews for Aki | `docs/KIRO_REVIEW_AKI_*.md` |
| Gate results | `docs/KIRO_GATE_RESULT_*.md` |
| Rulings | `docs/KIRO_RULING_*.md` |
| Answers | `docs/KIRO_ANSWERS_*.md` |

**Scan for all `KIRO_*` files, not just orders** — reviews, gate results, and rulings are equally important.

---

## Step-by-Step

### 1. Fetch latest remote state

```bash
cd "C:/Users/diepowel/Documents/GitHub/overcharge-aki"
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" fetch origin
```

### 2. List recent commits on Kiro's live line

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" log --oneline -20 origin/agent/orcha-gameplay
```

Note: use `git log --oneline -N` (git's own flag), NOT `| head -N`. `head` is not available in PowerShell on this machine.

### 3. Find all Kiro documents on the live line

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" ls-tree -r --name-only origin/agent/orcha-gameplay -- docs/ | grep "KIRO_"
```

To find only NEW files since a known commit SHA (use your last-processed SHA as baseline):

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" diff --name-only <LAST_KNOWN_SHA> origin/agent/orcha-gameplay -- docs/
```

### 4. Read each new document

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" show origin/agent/orcha-gameplay:docs/KIRO_ORDER_AKI_<filename>.md
```

You do NOT need to checkout — `git show remote:path` reads directly from the remote ref, so it structurally cannot show you a stale local file.

### 5. Report

- **New documents found:** summarize each document title and key directives, then ask the chief if you should act
- **Nothing new:** say "No new Kiro documents. Standing by."

---

## Notes

- Always `fetch` before checking — never rely on stale local state
- Documents are append-only; once a file exists, treat it as active until the chief explicitly closes it
- Scan ALL `KIRO_*` prefixes — not just `KIRO_ORDER_`. Reviews, gate results, and rulings all carry actionable information
- If a file exists on remote but not locally, that is expected — always read via `git show origin/...:<path>`

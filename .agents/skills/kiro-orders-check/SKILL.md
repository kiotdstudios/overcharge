---
name: kiro-orders-check
description: "Check for new Kiro orders on origin/agent/orcha-gameplay and surface them to the active agent. Use when waking up from a scheduled task, or any time you want to check for new directives."
---

# Kiro Orders Check

Kiro is the QA arbiter for OVERCHARGE. Kiro writes orders as Markdown files committed to `origin/agent/orcha-gameplay`. This skill teaches you how to fetch and surface those orders.

## Order File Patterns

| Target Agent | File Pattern |
|---|---|
| Aki  | `docs/KIRO_ORDER_AKI_*.md`   |
| Orcha | `docs/KIRO_ORDER_ORCHA_*.md` |

---

## Step-by-Step

### 1. Fetch latest remote state

```bash
cd "C:/Users/diepowel/Documents/GitHub/overcharge-aki"
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" fetch origin
```

### 2. List recent commits on Orcha's branch

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" log --oneline origin/agent/orcha-gameplay | head -20
```

### 3. Find order files on the remote branch

List all Kiro order files targeting you:

```bash
# For Aki:
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" ls-tree -r --name-only origin/agent/orcha-gameplay -- docs/ | grep "KIRO_ORDER_AKI_"

# For Orcha:
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" ls-tree -r --name-only origin/agent/orcha-gameplay -- docs/ | grep "KIRO_ORDER_ORCHA_"
```

To find only NEW files since a known commit SHA (use your last-processed SHA as baseline):

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" diff --name-only <LAST_KNOWN_SHA> origin/agent/orcha-gameplay -- docs/
```

### 4. Read each order file

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" show origin/agent/orcha-gameplay:docs/KIRO_ORDER_AKI_<filename>.md
```

You do NOT need to checkout — `git show remote:path` reads directly from remote ref.

### 5. Report

- **New orders found:** summarize each order title and key directives, then ask the chief if you should act
- **Nothing new:** say "No new Kiro orders. Standing by."

---

## Notes

- Always `fetch` before checking — never rely on stale local state
- Orders are append-only; once a file exists, treat it as active until the chief explicitly closes it
- If a file exists on remote but not locally, that is expected — always read via `git show origin/...:<path>`
- Kiro may expand to `origin/agent/kiro-qa` in the future — check that branch if orders go quiet on orcha-gameplay

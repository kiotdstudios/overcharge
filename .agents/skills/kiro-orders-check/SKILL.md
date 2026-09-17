---
name: kiro-orders-check
description: "Check for new Kiro documents AND new commits on origin/agent/orcha-gameplay. Use when waking up from a scheduled task, or any time you want to check for new directives."
---

# Kiro Orders Check

Kiro is the QA arbiter for OVERCHARGE. Kiro writes orders, reviews, rulings, and answers as Markdown files committed to `origin/agent/orcha-gameplay`. This skill teaches you how to fetch, detect changes, and surface those documents.

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
| GO directives | `docs/KIRO_GO_*.md` |
| Answers | `docs/KIRO_ANSWERS_*.md` |

**Scan for all `KIRO_*` files, not just orders** — reviews, gate results, rulings, GO docs, and answers are equally important and all carry actionable directives.

---

## Step-by-Step

### 1. Fetch latest remote state

```bash
cd "C:/Users/diepowel/Documents/GitHub/overcharge-aki"
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" fetch origin
```

### 2. Read the ACTUAL current HEAD

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" rev-parse origin/agent/orcha-gameplay
```

**Always report the live HEAD read fresh after fetch.** Never echo your session watermark as though it were the live head — those are different things.

### 3. Detect ALL new commits since your watermark

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" log --oneline <LAST_KNOWN_SHA>..origin/agent/orcha-gameplay
```

This is the commit-range check. Run it even if you expect no doc changes — a commit with no new KIRO doc can still touch your lane.

**My lane files:** `editor/**`, `assets/**`, `src_scroll/render.js`

If any commit in the range touches lane files, flag it explicitly even if no KIRO doc accompanies it.

### 4. Find new KIRO documents since your watermark

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" diff --name-only <LAST_KNOWN_SHA> origin/agent/orcha-gameplay -- docs/
```

Filter results for `KIRO_` prefix. New KIRO docs must be read immediately.

### 5. Read each new document

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" show origin/agent/orcha-gameplay:docs/<FILENAME>.md
```

You do NOT need to checkout — `git show remote:path` reads directly from the remote ref.

### 6. Full inventory (for orientation / first run)

```bash
"C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe" ls-tree -r --name-only origin/agent/orcha-gameplay -- docs/ | grep "KIRO_"
```

### 7. Report — required format

Always state:
- **Live line HEAD:** `<sha>` (read fresh from step 2)
- **New commits since watermark:** list them, or "none"
- **Lane touches:** list any commits touching `editor/**`, `assets/**`, `src_scroll/render.js`, or "none"
- **New KIRO docs:** list with summary of each, or "none"
- **Updated watermark:** `<new HEAD sha>`

If there are no new docs but there ARE new commits, say: "No new Kiro documents. N new commits — see lane touches above." **Never say "nothing changed" when commits exist.**

---

## Reporting Accuracy Rules

These are hard rules, not suggestions:

1. **Report the actual HEAD**, not your last-known watermark. They differ if commits landed since your last check.
2. **"No new documents" ≠ "nothing changed."** Always check the commit range separately from the doc diff.
3. **Say what you did not check.** If you only checked docs and not commits, say so.
4. **Never assert a broad conclusion from a narrow check.** "No new KIRO docs; commit range checked, 2 commits landed, 0 in my lane" is accurate. "Nothing has changed" is not.

---

## Notes

- Always `fetch` before checking — never rely on stale local state
- Documents are append-only; once a file exists, treat it as active until the chief explicitly closes it
- Note: use `git log --oneline -N` (git's own flag), NOT `| head -N`. `head` is not reliably available in PowerShell on this machine.
- If a file exists on remote but not locally, that is expected — always read via `git show origin/...:<path>`

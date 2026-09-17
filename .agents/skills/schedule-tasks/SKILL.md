---
name: schedule-tasks
description: "Create, list, pause, resume, and delete your own scheduled tasks using the Aki scheduler. Use when you need to set up recurring checks, reminders, or autonomous background work."
---

# Schedule Tasks

This skill gives agents the ability to manage their own scheduled tasks via the Aki `scheduled` CLI. Use it to set up recurring work (like order checks) or to manage tasks you previously created.

---

## CLI Reference

```bash
# Create a new scheduled task
scheduled create \
  --name "Task Name Here" \
  --schedule "*/15 * * * *" \
  --instructions "Full instructions for what to do each run" \
  --profile "aki"

# List all scheduled tasks
scheduled list

# Pause a task (keeps it registered but stops it from running)
scheduled pause --name "Task Name Here"

# Resume a paused task
scheduled resume --name "Task Name Here"

# Delete a task permanently
scheduled delete --name "Task Name Here"
```

---

## Schedule Syntax (cron)

| Expression | Meaning |
|---|---|
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *`    | Every hour on the hour |
| `0 9 * * *`    | Daily at 9:00 AM |
| `0 9 * * 1`    | Every Monday at 9:00 AM |

**Minimum interval: 15 minutes.** Do not create tasks that run more frequently.

---

## OVERCHARGE Project Paths

| Resource | Path |
|---|---|
| Repo root | `C:/Users/diepowel/Documents/GitHub/overcharge-aki` |
| Git executable | `C:/Users/diepowel/AppData/Local/Programs/Git/cmd/git.exe` |
| Orcha's branch | `origin/agent/orcha-gameplay` |
| Aki's branch | `agent/aki-editor` |
| Kiro order files | `docs/KIRO_ORDER_AKI_*.md` / `docs/KIRO_ORDER_ORCHA_*.md` |

---

## Rules

1. **Confirm before creating or deleting** — tell the chief what you're about to schedule and why, then act
2. **Unique names** — task names must be unique; check `scheduled list` first if unsure
3. **Idempotent instructions** — write task instructions so that running the task multiple times in a row is safe
4. **Profile** — always pass `--profile "aki"` unless told otherwise
5. **Cleanup** — if a recurring task is no longer needed, delete it rather than leaving it paused indefinitely

---

## Example: Schedule a Kiro order check

```bash
scheduled create \
  --name "OVERCHARGE Kiro Orders Check" \
  --schedule "*/15 * * * *" \
  --instructions "You are Aki working on the OVERCHARGE project. Load the kiro-orders-check skill and run it for AKI orders. Repo: C:/Users/diepowel/Documents/GitHub/overcharge-aki. If new orders exist, surface them and wake the chief if possible. Otherwise log 'No new orders'." \
  --profile "aki"
```

---

## Checking what's already scheduled

Run `scheduled list` before creating anything to avoid duplicates. If a task with the same name exists, pause/delete it first or update its instructions by deleting and recreating.

# Retro backlog

Improvement ideas found during retros, not yet worked. Not bugs (`issues.md`),
not decided facts (`decisions.md`).

**Shape:** `_templates/backlog-item.md` per row.

**Status flow:** `queued` → `intaking` → `routed` or `dropped`. On `routed` or
`dropped`, append one line to `log.md` and delete the row. The log line is the
record.

**Pick order:** the developer says, or highest leverage among `queued` rows
(repeat tasks and measured time/token cost win over polish).

---

### Check every Builder placement and movement route

- **Status**: queued
- **Source**: 2026-09-28 · OVERCHARGE session
- **What**: Use a short verification matrix for palette click, palette drag, pointer move, selection move, undo/redo and runtime rendering after geometry changes.
- **Why**: Streetlight re-anchoring initially covered the selection tool but missed pointer movement; a browser drag exposed the missed path after passing helper tests. Player placement had another ungrounded route. Three user follow-ups concerned hovering or filter leakage.
- **Improves**: Fewer false passes and repeat fixes.
- **Risks**: Too broad a matrix could waste time on unrelated assets; scope it to changed behavior.
- **Routed to**:

### Verify delivered content after Pages deployment

- **Status**: queued
- **Source**: 2026-09-28 · OVERCHARGE session
- **What**: Record the pushed commit, deployment result and observed live build separately, and check served files when browser caches disagree.
- **Why**: Successful run 36414630781 still left the browser showing the older enemy bank; repeated reloads did not prove live UI freshness, while direct file reads showed the new runtime and manifest.
- **Improves**: Clear delivery claims and less repeated cache exploration.
- **Risks**: Cache delays can persist; report the uncertainty instead of polling indefinitely.
- **Routed to**:

### Install local skills with one scoped permission check

- **Status**: queued
- **Source**: 2026-09-28 · OVERCHARGE session
- **What**: Verify parent-directory creation access before installing a new personal skill, then validate both SKILL.md and bundled templates.
- **Why**: File/new-subdirectory grants failed for the Desktop batch copy and the retro installation; parent-folder grants succeeded. The first retro install took repeated waits and a second run.
- **Improves**: Fewer permission retries and partial installations.
- **Risks**: Parent permissions are broader; request only the smallest directory required and never overwrite existing skills without authorization.
- **Routed to**:

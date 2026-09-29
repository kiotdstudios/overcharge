# Decisions

- 2026-09-28 · Chief confirmed lower-rooftop traversal in front of the tall building. Author that building as non-colliding background decorations, keep the lower roof as terrain, and preserve the originally authored elevated gate. Rejected inconsistent horizontal/vertical collision and the assumed climb route. Real movement and browser visible-support evidence are required.

What the project now believes, newest last. Only entries that change future
behavior (a rule, a reversal, a chosen approach). Format:
`YYYY-MM-DD · Decision · Why · What it replaces`.

2026-09-28 · Keep canonical level JSON and Builder/runtime geometry in agreement; ground the logical body and account for transparent sprite padding separately · Streetlight padding, an undersized selection rectangle, and a player spawn saved 16px above the roof caused visible hovering · Replaces assuming a grid-snapped top-left or canvas bottom is the visible standing surface.
2026-09-28 · Rooftop quick filters show matching terrain tiles only; HVAC, Electric and Enemies have their own groups · Spawn exemptions leaked unrelated objects into Blue Rooftop, and shared purple-pack folders included HVAC in Purple Rooftop · Replaces pack filtering that exempted all spawn assets or matched only a broad folder.
2026-09-28 · Use isolated worktrees for production fixes and preserve overcharge-v2 as the user's playground · The playground already had extensive uncommitted experiments · Replaces treating the dirty playground as the production checkout.
2026-09-28 · Separate Builder SAVE, local commit, remote push and Pages delivery when reporting completion · Clean main clone and cached Builder content showed that each step needs its own evidence · Replaces treating a generated command, local commit or successful deployment alone as proof that current level edits are live.

2026-09-29 — Raised buildings intended for foreground traversal must be authored as background facade art with one-way roof support; full terrain stays solid on both axes. Builder selection can convert the structure atomically with exact undo. Do not infer pass-through for every wall from nearby floor tiles.

# OVERCHARGE — Chief Handoff

This is the working handoff note for the **Chief** to review the project, set priorities, and coordinate work between the home Mac and work PC.

## Repository

- GitHub: `https://github.com/kiotdstudios/overcharge`
- GitHub Pages: `https://kiotdstudios.github.io/overcharge/`
- Work PC clone: `C:\Users\diepowel\Documents\GitHub\overcharge`

## How to Give Direction

Add the requested outcome, priority, acceptance criteria, and whether the work should be published to GitHub Pages. Keep requests specific, for example:

```text
Priority: High
Goal: Add a second playable level after the Level 1 exit.
Acceptance: The player can complete Level 1, continue to Level 2, and restart Level 2 after a game over.
Publish: Yes
```

For tracked work, GitHub Issues and pull-request comments are preferred. This document is the quick project briefing.

## Current Runtime

The public page loads the scroll edition:

```text
index.html → src_scroll/main.js → src_scroll/levels/level1.js
```

The legacy `src/` implementation is not the default browser build.

## Current Level 1 Gameplay

Level 1 is **NEON DISTRICT**, a scroll-platforming level.

- A rooftop generator near the start provides 10 charge.
- A 10-charge exit gate is on the final building.
- Hold **E** near a source to absorb charge.
- Hold **E** near a gate to discharge into it and open the exit.
- **Space** remains an alternative charge key at gates and attacks nearby enemies.
- Opening the exit gate completes the level.

Relevant files:

```text
src_scroll/levels/level1.js   Level layout, generator, and exit-gate placement
src_scroll/player.js          Movement, E/Space interactions, charge handling
src_scroll/electricity.js     Sources, gates, switches, and gate opening logic
src_scroll/level.js           Level completion detection
src_scroll/ui.js              On-screen interaction prompts
src_scroll/main.js            Browser entry/runtime state machine
```

## Local Changes Awaiting a Commit

The work-PC clone currently has local changes for the gate interaction fix:

- E now charges a nearby gate or switch contextually.
- Level 1 includes a reachable generator and exit gate.
- The HUD prompt, developer controls bar, and README describe the revised controls.

These changes have been validated locally but have **not** been committed or pushed yet.

## Local Validation

From the repository folder:

```powershell
node _dev/test_electricity.mjs
```

The existing electricity test suite currently passes 37 tests. For local browser testing, run `start.bat` or:

```powershell
npx serve -l 3000
```

Then open `http://localhost:3000`.

## Working Between the Home Mac and Work PC

1. Make a focused change on one computer.
2. Commit it with a meaningful message.
3. Push it to GitHub.
4. On the other computer, commit or stash any local work first, then run `git pull`.

Example:

```powershell
# Save work on the current computer
git add "src_scroll/levels/level2.js"
git commit -m "Add Level 2"
git push

# Retrieve it on the other computer
git pull
```

Avoid editing the same file on both computers before syncing. Use a branch per larger feature or level when possible.

## Chief’s Current Direction

_Add the current priority, success criteria, and publish decision here._

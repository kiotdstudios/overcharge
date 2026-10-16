# OVERCHARGE

**KIOTD Studios**: a puzzle platformer. Absorb power from the city, spend it on gates and machines, reach the exit.

> Explore. Steal the current. Solve the circuit. Protect your charge. Power the exit.

## Where the design lives

**[`docs/design/GAME_DESIGN_V2.md`](docs/design/GAME_DESIGN_V2.md) is the one game design document**, and
[`docs/design/LEVEL_DESIGN_V2.md`](docs/design/LEVEL_DESIGN_V2.md) specifies the levels.
Start at [`docs/README.md`](docs/README.md): it says which folder is truth (`design/`), which is active work (`orders/`) and which is dead (`archive/`).
This README does not describe the game; the old version of it did, and was wrong.

## Play

- Online: <https://kiotdstudios.github.io/overcharge/>
- Locally: double-click `start.bat` (opens `http://localhost:3000`). The level Builder is `editor.html` on the same server.

## Controls (live game, `src_scroll/`)

| Key | Action |
|---|---|
| Left / Right (A / D) | Move; hold **Shift** to run |
| Up / W | Jump (ladder: climb) |
| Down / S | Duck; Down + jump drops through a one-way platform |
| **E** (hold, near a charged object) | Absorb charge |
| **Space** (hold, near a gate or charged object) | Give charge |
| **Q** | Spend a banked pip on a gate |
| G | Grapple |
| K / L | Melee / bolt (Level 3 onward) |
| R | Retry |

## Levels

Level 1, **NEON RISE**, is the one being finished. Levels 2 to 6 (SPLIT DECISION, DON'T GET HIT, CARRY CURRENT, LIVE WIRE, DESCENT) are on hold until Level 1 is done.
Levels are `src_scroll/levels/*.json`, listed in `levels.json`, and owned by Chief.

## Repository map

```
src_scroll/   the live game (main.js loop, player.js, level.js, electricity.js, npc.js, juice.js, audio.js ...)
editor/       the Builder (level editor)
assets/       art, sprites, ASSET_MANIFEST.json
docs/         design/ (truth), orders/ (active work), rulings/, reference/, archive/ (dead)
_dev/         tests: node _dev/run_all.mjs
scripts/      build helpers (node scripts/version_editor.mjs before committing Builder changes)
src/          OBSOLETE prototype (index_classic.html only). Ignore it.
```

`KIRO_STATUS.md`, `AKI_STATUS.md` and `ORCHA_STATUS.md` are the agents' running logs.

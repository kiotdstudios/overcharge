# OVERCHARGE
**KIOTD Studios** — Puzzle Platformer

> Explore. Steal the current. Solve the circuit. Protect your charge. Power the exit.

## Play (GitHub Pages)

**[▶ PLAY IN BROWSER](https://kiotdstudios.github.io/overcharge/)**

No install. Works in any modern browser.

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Move |
| ↑ / W | Jump |
| ↓ / S + jump | Drop through one-way platform |
| **E** (hold, near source) | Absorb electricity |
| **Space** (near enemy) | Attack |
| **Space** (hold, near gate) | Discharge into gate |
| X | Brake |
| R | Retry on Game Over |

## Local Dev

Double-click `start.bat` — opens `http://localhost:3000` automatically.

Run tests:
```
node _dev/test_electricity.mjs
```

## Levels

| # | Name | What it teaches |
|---|------|----------------|
| 1 | FIRST SPARK | Absorb → discharge → exit |
| 2 | SPLIT DECISION | Spend charge to unlock more charge (switch routing) |
| 3 | DON'T GET HIT | Drain enemy, scatter recovery, timing windows |
| 4 | CARRY CURRENT | Traversal under pressure — protect charge across a pit |

## Architecture

```
src/
  constants.js     all shared values (physics, colors, sizes)
  input.js         keyboard state (held / pressed / released)
  render.js        canvas draw utilities (glow, tiles, sparks, lightning)
  electricity.js   ElectricalSource, PowerGate, Switch, ChargePickup
  entities.js      DrainEnemy, PatrolEnemy
  player.js        movement, absorb, discharge, attack, sprites
  sprites.js       frame animation system (idle/walk/jump/charge/discharge)
  level.js         tilemap + entity manager + fail-state detection
  ui.js            HUD, charge bar, context prompts, overlays
  levels/          one file per level
  main.js          game loop, state machine
assets/
  sprites/         player animations (idle/walking/jumping/charge/discharge × east/west)
  tiles/           concrete tileset
```

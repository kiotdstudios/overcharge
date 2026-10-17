# Charge economy page (generator)

`docs/design/OVERCHARGE_Level1_Charge_Economy.html` is generated from these files. It is a planning tool, not the game.

- `economy_sim.js`: the model of GAME_DESIGN_V2 sections 3.1 to 3.9 (bar 10, pip 10, pip slots, exit 8, Q, transfer speed, charge table).
- `build_economy.mjs`: writes the page (`node _dev/tools/economy/build_economy.mjs`, optional output path as the first argument).
- `economy_check.cjs`: checks the model against the numbers in the design document (`node _dev/tools/economy/economy_check.cjs`).

When Chief changes a charge value or the Level 1 contents, change them here AND in `docs/design/GAME_DESIGN_V2.md`, then rebuild the page. Level 1 as built: three lamps of 3, one vending machine of 2, an AC of 4 that starts off, exit 8.
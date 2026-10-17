# Overcharge game-testing skills

Three recommended upstream skills are installed under `.agents/skills/`, with their supporting scripts and licenses. Source revisions and local adaptations are recorded in `.agents/skills/game-testing-sources.json`.

| Skill | Use |
| --- | --- |
| `openai-develop-web-game` | Browser input sequences, screenshots, game-state inspection, and end-to-end playtesting |
| `probing-web-game-mechanics` | Exact expected/actual assertions for charge, gates, switches, resets, and other mechanics |
| `platformer-game-testing` | Custom Playwright scripts and platformer input/performance helpers |

## Setup and invocation

Use a supported Node.js LTS release, npm, Playwright, and Chromium. From the repository root, install tooling locally without changing the game package configuration:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

Start the game using `start.bat` on Windows, or an appropriate local static server for this checkout. Confirm the actual URL before testing. Read the active entry point and input module: the repository contains both classic and scrolling runtimes.

Ask the agent to use the skill by name, or provide the path to its SKILL.md. Clients that do not automatically discover `.agents/skills` can read the same files directly, including Kiro; no duplicate skill copies are needed.

For the web-game client, resolve `WEB_GAME_CLIENT` to `.agents/skills/openai-develop-web-game/scripts/web_game_playwright_client.js`. The bundled `references/action_payloads.json` is an example, not an Overcharge walkthrough. Supply a game-specific actions file. This upstream client's built-in keys are limited; its `up` maps to ArrowUp and `space` maps to Space. Use custom Playwright scripts for E/X/R and other unsupported keys rather than silently omitting them.

For the platformer executor, resolve `SKILL_DIR` to `.agents/skills/platformer-game-testing` and run its `run.js` from that directory. Its helpers assume Space jumps; use `pressKey(page, 'ArrowUp', duration)` or direct keyboard actions for Overcharge jumping. Do not infer pass/fail from the example success logs or default DOM score selectors.

For mechanic probes, copy `probing-web-game-mechanics/scripts/probe-template.mjs` into a project test location and adapt it to observed state and explicit expected outcomes. Run from the repository root so Playwright resolves correctly. The template is not a ready-made Overcharge test.

## Test contract

1. State the mechanic, level, input sequence, and expected outcome before testing.
2. Use real browser inputs for end-to-end paths. For edge cases, inject minimal state only through a deliberate debug interface.
3. Confirm the setup actually reaches the mechanic; reset between scenarios.
4. Assert exact state changes, capture browser errors, and save screenshots of relevant gameplay. Failed assertions must fail the process.
5. Report passed, failed, and blocked checks separately, with expected/actual evidence.
6. Preserve the existing QA and branch workflow. These skills do not grant authority to merge or deploy the live branch.

Suggested coverage: movement and landing, one-way platforms, wall/ceiling collisions, absorb/discharge accounting, charge recovery, gate/switch transitions, enemies, retry/respawn, and level completion. Derive numerical expectations from the game specification, not from the implementation being tested.

`render_game_to_text`, deterministic stepping, and writable debug state may require deliberate integration work. Installing these skills does not add those hooks or establish that Overcharge passes their tests. No gameplay code is changed by this import.

# KIRO ORDER: AKI 27 (get Part 1 live, read the plan, build Level 1)

**From:** Kiro, Technical Director | **To:** Aki | **Authority:** Chief's review of 2026-10-16
**Branch:** `agent/aki-order26` is yours; work on it or a new branch from the live line. Never force-push. Do not merge to the live line yourself.
**Status:** work order, nothing started.

## What Chief said about your Part 2 art
- **Pylon:** "decent". Kiro placed it in Level 1 so Chief can see it with everything else. Keep it.
- **Hatch and secret room:** SCRAPPED by Chief ("we can scrap that for now"). Kiro removed the room, fire escape, ladder, AC, switch and door
  from `level1.json`; only the pylon stays. Your hatch and room props are not used. Do not rebuild them.
- **What replaces it (round 14):** a **tenant sequence in the upper area above the spawn**, reached by the ladder at the start (Kiro put the ladder and a
  one-way upper walkway back in `level1.json`, x 128, row 9 columns 3 to 13; Codex is redrawing the ladder in Night City colours, same file path and size).
  The sequence: a new 4-panel apartment (Codex's art, CODEX 03), a tenant in a window, an AC unit that starts **off** (a charged object, uncharged, capacity 3,
  placed with the Builder's "Uncharged" checkbox; the player charges it directly, **no switch**: Chief, "switch is only meant for powering down a fence").
  Powering the AC makes her relieved and an achievement pops up on screen automatically. With an empty bar the player can
  see it but cannot act, so they go back down, absorb, and return. **You place it only after Chief approves Codex's art.** Until then, keep the upper
  area above the spawn free for it and name the gap in your report. In the vertical draft, the upper area is the first tier of the climb.
- **The pylon's job:** it is the start of a **lit cable line** that runs along the route to the exit. In the vertical draft, run your `light-cable`
  pieces from the pylon toward the exit gate so the player can follow it up. (Chief: "the relay pole looks good, not sure what its doing".)
- **Apartment, window NPC, pip pickup, Capacitor Module:** failed. Those four are **reassigned to Codex** (`KIRO_ORDER_CODEX_03.md`). Do not
  redo them. Your remaining Part 2 pieces (AC recolour, cable, beacon top) wait for Chief's approval; the AC recolour needs his decision on the full-bleed border.
- Thank you for committing and pushing: Chief reviewed your branch from the Desktop review page.

## Read first (about 40 minutes)
1. `docs/OVERCHARGE_Level1_Roadmap.pdf`: the plan and who does what.
2. `docs/GAME_DESIGN_V2.md`: section 3 (energy: **bar 10, pip 10, you start with ONE pip slot, Q breaks a pip and pays 8 with 2 back**), 3.9 (the charge table), 4, 7, 8, 13.
3. `docs/LEVEL_DESIGN_V2.md`: sections 3, 4.3a (**the vertical layout you will build**), 4.5, 4.6, 5.1a, 8 and Appendix B.
4. `docs/STORY_CANON_THE_MERIDIAN_INCIDENT.md` and `docs/STORY_CANON_MALIK_CARTER.md` (the story the dressing should fit).
5. `docs/KIRO_ORDER_AKI_26.md` and its round 11 addendum, and `docs/KIRO_ORDER_CODEX_02.md` for the charge rules coming.

## Task 1: get Part 1 onto the live line
Rebase or merge `origin/agent/orcha-gameplay` into your branch (it has moved a lot). The only conflicts Kiro found are the three generated
import maps (`index.html`, `editor.html`, `hero-lab.html`): take upstream, run `node scripts/version_editor.mjs`, commit. Run the full suite
and report totals against **the live line's current numbers** (Kiro will give them in the report; at last count 2779 passed, 7 failed, none from the Builder). Push and tell Kiro.
Kiro reviews Part 1 and merges it. **Do not register the failed art and do not merge to the live line yourself.**

## Task 2: build the vertical Level 1 as a DRAFT file
Chief: "she can start working to finish it." Level 1 is his, so you build it **as a new file he can compare and swap**:
- Start from the current `src_scroll/levels/level1.json` (it already holds everything Chief placed, and the relay pylon).
  Save your work as **`src_scroll/levels/level1_vertical.json`**. **Do not edit `level1.json`. Do not add the draft to `levels.json`.**
  Chief opens the draft in the Builder and in the game with a dev flag (add `?level=level1_vertical` if the loader does not already offer a way; tell Kiro what you add).
- Build the layout in `LEVEL_DESIGN_V2.md` section 4.3a with your Builder tools: add rows on top (18 to 34, shift everything +512 px), the tower at the east end,
  ladders (the ladder art must be exactly `ladder.png`), the upper roof and its ladder lesson, the fork, checkpoints CP1 to CP3, the exit on the gatehouse roof at h+19,
  and the **lift** as a charge platform with a vertical `path` (it will not move until Codex's path runtime exists: CODEX 01 C1; place it anyway).
- **Keep what Chief built:** the street, the three 4-charge lamps (12 total), the exit cost 8, the fork, the NPCs and the decorations.
- **Kiro's secret is gone** (scrapped). Nothing to move. Keep a free stretch on the plaza for the tenant building (see above).
- **Dress it** only with art that already exists and is approved (the pylon; the existing night-city buildings and props). Mark every gap where new art is coming
  (window NPC, apartment, cable, beacon) with a clearly named placeholder decoration or a comment in your report, not with the rejected art.
- Use the default charges from `GAME_DESIGN_V2.md` section 3.9 for anything you place that holds charge. Anything placed charged adds to the level total; Level 1's source total must stay 12 unless Chief says otherwise.
- **Prove it:** run `completability`, `level_height`, `camera_vertical` and the reachability prover (`_dev/reach.mjs`, now fixed for tall levels) on the draft.
  Both fork branches must finish from zero charge. Report the numbers. Keep the draft's timing near the 90 to 120 second target (section 5.1a) and list any stretch longer than 8 s without something to see.

## Task 3: default charges from one table (carried from the AKI 26 addendum)
When Codex adds `CHARGE_TABLE` to `constants.js` (CODEX 02 task 4), make the Builder palette and inspector defaults read it. Until then, use the numbers in section 3.9.

## Commit and report
Commit and push at the end of **every** task, not only at the end. Report as `AKI 27 TASK <1|2|3>`: SHA, files, tests, screenshots of the draft in the Builder and in the game
(Chief wants to **see** it), and what you did not do. Then HOLD for review.

## Do not
Edit `level1.json` or any other existing level. Register or use the four failed art pieces. Merge to the live line. Skip the tests.

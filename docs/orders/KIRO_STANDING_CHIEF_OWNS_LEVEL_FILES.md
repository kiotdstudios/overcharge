# STANDING RULE — CHIEF OWNS THE LEVEL FILES. AGENTS DO NOT WRITE THEM.

**Ruled by:** Chief — *"unless specified im the only one touching the builder so when i save and commit
something i expect to be able to refresh and play it"*
**Applies to:** Orcha, Aki, and me. No exceptions without a written order naming the file.
**Enforced by:** `C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs` — run it before every push.

---

## 1. The rule

> **`src_scroll/levels/*.json` belongs to Chief.**
> He authors them in the Builder. His copy is the only artefact in this project that **cannot be
> regenerated** — code can be rewritten from its intent, a hand-placed tile cannot.
>
> An agent may modify a level file **only** when a numbered order names that file and says what to change.
> Absent that, a branch that touches a level file does not get pushed.

`levels.json` and `_dev_levels.json` are manifests, not content — agents may update those when an order
requires it, and the guard exempts them.

### AMENDED 2026-09-19 — read this before reverting anything
This rule, as first written, caused a real defect: an agent read it and reverted Orcha's drone move, which
left a narrowed sight box pointed at a drone 285px out of range. See
`docs/archive/reports/KIRO_DIAGNOSIS_DRONE_BLIND_AND_TELEPORT.md`. Two clauses:

**A. Enemy placement is coupled to enemy tuning.** When an order changes sensing or behaviour constants that
depend on where an enemy sits, moving that enemy is **part of that order** and is permitted — in the **same
commit** as the constants. Chief's tiles, spawn, generators, gates, switches, chests and checkpoints remain
his alone.

**B. Never revert half of a coupled change.** If a commit changes code and data together, revert both or
neither. Half a revert produces a state nobody designed or tested, and it surfaces as a fresh bug in the half
you kept. If a coupled change looks wrong, **raise it — do not unpick it.**

## 2. Why this is now mechanical instead of assumed

The convention was already implicit and it still broke. `11e4ef5` promoted an unrelated generator fix from a
branch older than Chief's latest save, and carried a stale `level3.json` with it:

```
solid tiles 114 -> 106   (17 tiles reverted)
name "DON'T GET HIT" -> "LEVEL 3"
sources 1 (5 charge) -> 3 (12 charge)
```

Chief had saved, committed, refreshed, and seen nothing — twice. Nobody intended it. The merge simply
carried a file it had no business carrying, and **no test could see it**, because a reverted level still
passes every suite. It was only visible by diffing the file against what he saved.

That is the whole argument for a guard: this failure is invisible to correctness checks. It is a
**provenance** problem, not a correctness problem.

## 3. What every agent must do before pushing to `agent/orcha-gameplay`

```
node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs C:\Users\diepowel\Documents\GitHub\overcharge
```

- **Exit 0** — your branch changes no level file. Push.
- **Exit 1** — it changes one. You are about to revert Chief's work. Drop it:
  ```
  git checkout origin/agent/orcha-gameplay -- src_scroll/levels/<file>.json
  ```
- Ordered to change a level? Declare it, so the intent is on the record:
  ```
  node ...\level_guard.mjs <repo> --allow level4.json
  ```

The guard reports the change in Chief's terms — tiles differing, name changes, generator count and total
charge — so a blocked push tells you exactly whose work you were about to overwrite.

## 4. Rebasing and promoting: the specific trap
Most of this project's merges are fine. The dangerous shape is **promoting a fix from a branch that predates
Chief's most recent save.** The fix itself is wanted; the level file that rides along is not.

Before merging any agent branch into the playable line:
1. `git fetch origin`
2. Run the guard.
3. If it blocks, take the fix and leave the level file:
   `git checkout origin/agent/orcha-gameplay -- src_scroll/levels/`

## 5. Chief's expectation, stated as the requirement
> *"when i save and commit something i expect to be able to refresh and play it"*

That is the acceptance test. Save in the Builder, publish, refresh, play the change. If any step in that
chain silently does nothing, it is a **defect**, not a workflow the user should learn to work around.
Two things currently break it and both are being fixed:
- An agent push could revert his file — closed by this rule and the guard.
- The Builder's **COMMIT & PUSH** button neither commits nor pushes — see `docs/archive/orders/KIRO_ORDER_AKI_11.md`.

## 6. The duplicate twin
`3_LEVEL_3.json` and friends shadow the real files and have already drifted from them once. They are not in
the manifest and nothing loads them. They stay in sync for now, but **Chief should be asked to approve
deleting them** — every additional copy is another place his work can be silently lost.

— Kiro, Technical Director

## 3. Written orders that name files (log)
- **2026-10-17, Chief, to Codex:** "place him in the level" following the graffiti artist screenshot and request for that Level 1 wall area. Codex added only `npc_graffiti_artist_01` to `src_scroll/levels/level1.json` at (1000, 480), facing right at scale 0.8, on the solid raised rooftop in front of the filler wall. The 24-second three-color asset was already registered; no tiles, decorations, other NPCs, or Builder saves were moved.
- **2026-10-16, Chief, to Kiro:** "use the relay pylon in the level so I can see how it looks all together" and "implement [the hatch and secret room] in lvl 1 ... so I can see it all together." Kiro edited `level1.json` additively (pylon, fire escape, ladder, AC unit, wall switch, door, room). Nothing Chief placed was moved or removed; a round trip of the file before the edit was byte-identical. Test: `_dev/level1_secret.mjs`.
- **2026-10-16, Chief, to Aki:** "she can start working to finish [Level 1]." Aki builds the vertical Level 1 as a **new file** `src_scroll/levels/level1_vertical.json` (not in `levels.json`). She does **not** edit `level1.json`. Chief compares and swaps. (`docs/orders/KIRO_ORDER_AKI_27.md`)
- **2026-10-16, Chief, to Kiro (later the same day):** "we need to rework the 'hidden' whatever im not liking any of that we can scrap that for now." Kiro reverted the preview additions in `level1.json` (fire escape tiles, room wall tiles, ladder, the four room props, `src_ac`, `SW_AC`, `SECRET_DOOR`). **Kept: the relay pylon.** A diff against the file before the preview shows one added decoration and nothing else. Test: `_dev/level1_pylon.mjs` (replaces `_dev/level1_secret.mjs`).
- **2026-10-16, Chief, to Kiro (flow correction):** "ladder needs to be put back; but make codex make a ladder night city prop colored." Kiro added to `level1.json`: the ladder decoration (x 128, y 288, w 32, h 192) and a one-way upper walkway (row 9, columns 3 to 13, tile value 2). Nothing else changed. Test: `_dev/level1_pylon.mjs` (16 checks; the street plays identically with and without the walkway).
- **2026-10-16, Chief, to Kiro (round 14c):** no level file was edited. Street litter, the AC rule and the economy page are code, docs and a Desktop file.
- **2026-10-16, Chief, to Kiro (round 15, economy values):** "street light should be 3 ... since we dropped street lamps to 3 will need to add one more prop to level 1." Kiro changed the `charge` of the three `LAMP` sources in `level1.json` from 4 to 3 and nothing else (diff: three lines). Chief places the 24/7 market, its vending machine and the extra prop himself in the Builder. To undo: set the three lamp charges back to 4.
- **2026-10-16, Chief, to Kiro (round 15b):** "i need to test the apartment girl and ac unit so place that in the game and builder." Kiro edited `level1.json` additively: nine one-way walkway tiles (row 9, columns 14 to 22), four apartment panel decorations (inserted just before the pylon so it draws in front), the source `AC_TENANT` (ordinary HVAC, capacity 4, uncharged) and the NPC `NPC_TENANT` (linked to it). Nothing Chief placed was moved or removed. Test: `_dev/tenant_sequence.mjs`. To undo: delete those entries and set the nine tiles back to 0.
- **2026-10-16, Chief, to Kiro (round 16):** "vending machine charge should be 2." Kiro changed the VEND source in `level1.json` from charge 4 to 2 (one line, surgical edit; the file does not round-trip through JSON because of mixed line endings from Builder saves). Chief's unpushed local Builder edits (second ladder, roof tiles, removed apartment piece) were not available to Kiro.
- **2026-10-16, Chief, to Kiro (round 16b):** "AC unit should go on the roof" and the ladder he placed was "wayyyy too large". Kiro edited `level1.json` (surgical text edits, the file does not round-trip): the oversized ladder (x 494, 128x605) became x 352, y 128, 32x256 (apartment roof to the second-level roof); the street ladder became y 384, h 224 so it reaches the new roof (it stopped 32 px short); `AC_TENANT` moved from (352, 356) to (416, 100) onto the apartment roof; tile (row 12, col 4) and tile (row 4, col 11) changed from solid roof tiles (43, 46) to one-way hatches (2) because a ladder cannot climb through a solid tile. Proof: `_dev/level1_pylon.mjs`. To undo: restore those values.
- **2026-10-17, Chief, to Kiro (round 18):** "make vending machine 2." Kiro changed the VEND source in `level1.json` from charge 4 to 2 (one line, surgical edit). It was 4 again by `fc82fae`; the likely cause is the Builder save `2aa76e3` carrying an older copy (not confirmed). Chief: after a Builder save, check the VEND charge. Level 1 total is now 11 (lamps 3 + 3 + 3, vending machine 2). To undo: set the VEND charge back to 4.
- **2026-10-17, Chief, to Kiro (round 19):** "yes place it" (after Kiro's report offering: swap the three grey `apartment_tenant` panels for `left_end_tenant_window`, `wall_06` and `right_end`, and move `NPC_TENANT` to x 102, y 234). Kiro edited `level1.json` (surgical text edits, 7 lines): `tenant_left.png` became `apartment_plain/left_end_tenant_window.png` (x 1, y 126), `tenant_wall.png` became `apartment_plain/wall_06.png` (x 193, y 126, was 123), `tenant_right.png` became `apartment_plain/right_end.png` (x 351, y 126, was 128); `NPC_TENANT` moved from (258, 301) to (102, 234). Nothing else changed. Test: `_dev/tenant_sequence.mjs`. To undo: put the three `src` paths and the y values (126, 123, 128) and the NPC position (258, 301) back.

- **2026-10-17, Chief, to Aki:** "relay pylon add what u were making to lvl 1 its like partially there" (referring to the AKI_26 Part 2 relay-pylon, light-cable and beacon-top art, all "Art PASS" in review). The pylon itself was already placed; Aki added the two pieces that were made but never used: a beacon-top decoration (128x96) flush on the gatehouse roof at x 3141, y 271, next to the exit gate, and a 6-piece light-cable run (3 straight-v, 1 corner at rotation 90, 2 straight-h) climbing from the pylon's own rooftop up to the taller warehouse roofline just east of it, filling the x 752-851 gap between them. Nothing Chief placed was moved or removed. The long middle run of cable across the rest of the skyline (varied rooftop heights, x ~850-2420) was left undone — a design call for Chief to extend in the Builder if he wants the cable to run the whole way. Test: `_dev/level1_pylon.mjs` (22 checks, extended with beacon + cable facts).
- **2026-10-17, Chief, to Aki (same day, "u place it"):** Chief asked Aki to finish the middle run too. Aki extended the light-cable from the pylon climb all the way to the gatehouse: 75 more pieces (horizontal runs at three floating heights above each roofline, plus two height-step transitions of corner+1 vertical+corner where the skyline drops from the warehouse roof to the lower building-pack roof, then again down to the library/gatehouse roof) spanning x 856 to 3128. Total light-cable pieces: 81. Height transitions land close to but not exactly on each new roof's ideal offset (an approximation, since vertical drop amounts aren't exact multiples of 32px) — a real-eyes visual check in the Builder is still open, this was built from building coordinates, not a screenshot. Nothing else in the file changed. Test: `_dev/level1_pylon.mjs` (25 checks: full-run piece count, corner count/rotations, start/end reach, and an unbroken-chain check per height row).
- **2026-10-17, Chief, to Aki (screenshots, "this thing dont connect"):** the cable corners in level1 did not actually connect in-game — wrong rotation. Measured the sprite directly (brightness per edge, all 4 rotations): the true table is 0=West<->North, 90=North<->East, 180=East<->South, 270=West<->South. Every corner placed so far used the wrong value (the up-climb needed 180 for South<->East and used 90; the two down-transitions needed 270/90 and used 180/0). Chief also said he wasn't sure what the feature was for sitting mid-Level 1, and asked for a new Level 7 with "this fixed relay pylon" on it, pylon removed from Level 1. Aki: stripped every relay-pylon/beacon-top/light-cable decoration out of `level1.json` (83 entries removed, tiles/gates/sources untouched — level1 is back to exactly what it was before any of this started); built `level7.json` (new file, registered as number 7 "SIGNAL" in `levels.json`) with the pylon, a beacon on a second taller roof, and a single corrected climb (rotation 180) between them — rendered and visually verified connected (see commit). Exit costs 8 (OVERRIDE 1), source/gate x grid-aligned, per the two suites that already check every shipped level. Test: `_dev/level1_pylon.mjs` (now asserts level1 carries none of it) + new `_dev/level7_signal.mjs` (15 checks: registration, placement, corrected rotation, unbroken climb, engine load/playability).

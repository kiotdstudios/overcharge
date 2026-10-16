# AKI ORDER 022 — NPC Proximity Dialogue + Speech Bubble Builder Tool

**Issued by:** Chief / Kiro | **Owner:** Aki (Builder UI, serialization, visual previews), Aki (runtime NPC + trigger support) | **Target:** Reusable system, showcased by Order 021 and compatible with Order 020.

## Product goal
Chief must be able to **click an NPC in the level editor and type exactly what they say when the player gets close**, then SAVE the level and see the same speech bubble trigger in the real game. This is a reusable authoring tool, not a one-off hard-coded line or decoration. Start with the streetlamp woman (Order 021); support mechanics and future ambient NPCs without code edits.

## Critical architecture gate
Current canonical `docs/LEVEL_SCHEMA.md` lists decorations, sources, gates, switches, checkpoints, platforms, enemies but **no confirmed NPC array/dialogue contract**. Before writing JSON or modifying runtime, Aki must propose an **additive schema** and validate against the existing runtime and document the additive contract. Do not silently add unrecognized fields or repurpose `enemies[]` / `decorations[]` in a way that loses selectability. Aki owns schema documentation; Aki owns validation/loading/runtime proximity behavior. Coordinate a compatible change and update docs + editor + runtime together.

## Proposed additive data contract (illustrative; confirm names with Orcha before implementation)
```json
{
  "npcs": [{
    "id": "NPC_STREETLAMP_01",
    "assetId": "npc_streetlamp_woman",
    "x": 0,
    "y": 0,
    "facing": "left",
    "ambientAnimation": "idle",
    "dialogue": {
      "enabled": true,
      "trigger": "player_proximity",
      "radiusPx": 112,
      "triggerMode": "enter",
      "cooldownMs": 6000,
      "oncePerLevel": false,
      "durationMs": 3500,
      "lines": [
        {"id":"greeting_1","text":"Hey, cutie... you look like trouble. The fun kind."}
      ],
      "selectionMode": "sequential"
    }
  }]
}
```
This is a **proposal**, not an established schema. Align IDs, coordinate anchors, serialization and timing with existing project conventions. Start with one line, but design data model for optional multiple lines. Preserve existing level files that omit `npcs` (treat as empty). Do not mutate existing Level 1 data until agreed implementation is testable.

## Builder UX — NPC selection and dialogue inspector
1. Add an **NPCs** asset-bank filter/category with character thumbnails, not mixed into enemy or collision assets.
2. Spawn/place NPC from palette; show a recognizable selection outline and pivot at feet; drag, duplicate, delete, undo/redo, save/reload, all consistent with existing Builder interaction patterns.
3. Clicking an NPC opens an **NPC Inspector** with: Name/ID, Character Asset, World X/Y, Facing, Idle Animation, **Speech Bubble** section, Dialogue Enabled toggle.
4. Speech Bubble section includes a generous multiline text area labeled **"What does this NPC say?"**, live character count, and a clear **Preview Bubble** action. Text is literal authored dialogue; preserve punctuation and Unicode; escape safely at runtime. No HTML execution, no raw `innerHTML` injection.
5. Controls: trigger = Player Nearby (v1); **radius** editable numeric input and draggable visible range ring in Builder; bubble duration; repeat policy (**Every entry / Once per level**); cooldown; optional multiple lines with Add / Remove / Move Up / Move Down; sequential rotation first, random optional later.
6. Show the NPC's speech range only while selected or when a "Show NPC Triggers" overlay is enabled, not as permanent noisy circles. The bubble preview appears above character, repositions at screen edges, and must not obscure critical Builder controls.
7. Editor validates: unique IDs, nonempty line for enabled dialogue, radius sensible bounds (e.g. 32–320 px), finite durations, max text length (suggest 140 chars per line, configurable), no invalid NaN coordinates. Give clear inline errors; no silent drops.
8. Integrate with existing save-to-Git-JSON persistence and level reload; ensure inspector edits participate in undo/redo and dirty-state tracking. Never store authoritative dialogue only in browser local storage.

## Runtime interaction behavior — Orcha coordination
- Compute proximity in **world pixels**, consistently using player/NPC anchor points. Trigger on **outside → inside radius** transition, not continuously every frame.
- Show bubble for configured duration, then fade; do not freeze gameplay, movement, jumping, camera, or charge systems. If player exits radius early, define and document whether bubble finishes or closes (recommended: finish current line, unless NPC goes offscreen).
- Re-entry requires player to leave radius and respect cooldown. Once-per-level resets on restart according to the chosen policy. Multiple lines rotate sequentially; avoid infinite chatter when the player stands nearby.
- Bubble should track NPC world position through scrolling camera, float above the head, use pixel-art border and high-contrast dark fill with readable off-white text. Text wraps predictably and scales with game pixel-art presentation; keep font crisp. Use small tail pointing to speaker; clamp to viewport edges. Avoid covering HUD, player's immediate jump arc, gate prompts, or overlapping another bubble. Establish deterministic priority if 2 NPC radii overlap: nearest eligible NPC, one bubble at a time, queue/drop rules documented.
- If the player runs past quickly, greeting should still be visible long enough to register but not spam; consider minimum 1.8s, default 3.5s.
- For low-resolution or narrow screens, enforce max bubble width relative to viewport; support line breaks and long words without clipping.
- Trigger while game is active; pause/resume and level reload must not leave orphaned bubbles or timers. Prevent stale NPC state across level transitions.
- Accessibility: text contrast, readable scale, avoid relying solely on color; option to disable ambient NPC chatter in future without destroying authored data.
- No combat AI, no damage, no collision, no charge cost, no interaction button required for v1.

## First authoring test: streetlamp woman
- Create one NPC under a streetlamp in Level 1 using Order 021 art.
- Enter default line in Builder: **"Hey, cutie... you look like trouble. The fun kind."**
- Set initial suggested radius 112px, bubble 3.5 seconds, 6-second cooldown, repeat on new approach (these values are editable, not hard-coded).
- Preview bubble in Builder; save level JSON; reload Builder; launch game; walk into range; confirm bubble appears above the NPC; stand still; verify no spam; leave/re-enter; verify cooldown; test camera-edge clamping.
- Then change text in Builder to **"Mmm, look who's got a little spark."** Save/reload and confirm game displays the new text with **no code change**. This is the essential end-to-end acceptance test.

## Additional test cases
- NPC with dialogue disabled; empty npc array; old levels without npc field.
- Two NPCs in overlapping range; duplicate NPC IDs; rapid enter/exit; restart checkpoint and reload; pause; long sentence and multiline text; unusual punctuation/quotes/emoji; mobile/narrow viewport.
- NPC moved or deleted in Builder, undo/redo, save/reload; missing sprite asset fallback; absent optional dialogue fields.
- No changes to Level 1 generator charges (12 total), gate cost (8), enemy count, physics, collision, or player controls.

## Delivery split and evidence
**Aki deliverables:** editor NPC palette and inspector, controls, preview, placement/selection, validation, persistence, schema documentation, assets integration, Builder test evidence.
**Aki runtime deliverables:** agreed schema implementation, NPC render/animation runtime, proximity enter/cooldown, speech bubble render and lifecycle, game regression tests. Aki should implement missing runtime hooks herself, document the contract, and test both editor and game end to end.
**Evidence:** browser capture of selecting NPC → editing line → preview → save/reload → gameplay trigger; test matrix with pass/fail; changed paths; commit SHA(s); any open dependencies. No merge/publish without Chief/Kiro review.


## Chief staffing override — 2026-10-12
**Aki is OVERCHARGE's sole active implementation owner** for this order, including art, Builder, schema, runtime/gameplay integration, testing, and delivery. **Do not block on Orcha approval or handoff.** Orcha is retired/on-call only for a major technical problem that Chief explicitly reassigns. Preserve all schema compatibility, regression testing, review, and no-merge-without-approval requirements. This override supersedes any earlier role split or instruction to wait for Orcha in this document.

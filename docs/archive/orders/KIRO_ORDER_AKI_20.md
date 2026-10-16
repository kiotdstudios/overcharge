# AKI ORDER 020 — Warehouse Smoke-Break NPCs

**From:** Kiro / Chief  
**Owner:** Aki (pixel-art assets, decoration integration)  
**Target:** Level 1 — NEON RISE  
**Priority:** Environmental storytelling / cosmetic only

## Objective
Make the Level 1 warehouse feel inhabited. Add two distinct mechanic workers taking a cigarette break outside the warehouse loading area. They are background ambient NPCs, **not enemies**, and must not affect the tutorial mechanics, charge economy, collision, or level progression.

## Visual direction
Match OVERCHARGE's existing side-on pixel-art scale and night-city palette (deep navy, charcoal, electric cyan/purple, warm amber highlights). Both workers wear recognizable industrial mechanic coveralls and boots; avoid realistic/soft-painted art.

- **Worker A:** dark navy coveralls, rolled sleeves, leaning against the warehouse wall, cigarette in hand.
- **Worker B:** gray/charcoal coveralls, cap or beanie, standing casually nearby, cigarette in hand; occasionally turns toward Worker A.
- Give them distinct silhouettes and natural spacing so they read as two people on break rather than duplicate sprites.
- Small warm orange cigarette embers contrast with cool city lighting. Keep smoke subtle and legible at gameplay zoom.

## Animation requirements
Provide transparent, pixel-perfect sprite frames with consistent pivots and frame dimensions:
1. Idle/breathing (both).
2. Raise cigarette / take drag / lower hand (both, staggered timing).
3. Brief smoke exhale (small rising wisps).
4. Optional: Worker B turns head or makes a small conversational gesture; Worker A flicks ash.
Loops should not synchronize; use different durations/offsets. Do not require dialogue or interaction to appreciate the scene.

## Placement
Place the pair **beside the existing warehouse/loading-bay facade in Level 1**, visually grounded at the sidewalk/warehouse frontage, not floating or obstructing the player's path. Use the actual current Level 1 JSON and warehouse asset positions as the placement source of truth; preview in the Builder and in the running game before finalizing. Avoid overlap with charge sources, gate, checkpoint, player spawn, and traversal sightlines.

Optional scene dressing: a small toolbox or oil drum and a dim/flickering security light, only if already supported by existing art/systems. Do not add gameplay-affecting electrical behavior.

## Integration boundary
- Prefer the existing decoration/ambient animation pipeline. If runtime support for independent animation timing or smoke is missing, **document the smallest required Orcha hook and hold**, rather than modifying Orcha-owned runtime/gameplay code.
- Ensure the asset paths are Git-tracked, render in the level, and are usable in the Builder's decoration palette.
- NPCs must have **no collision, hitboxes, AI, health, charge interactions, damage, quest triggers, or player-blocking behavior**.
- Optional overheard lines ("Third blackout this week." / "Funny how the gates never lose power.") are **concept only**; do not implement a dialogue system under this order.
- Do not change the Level 1 charge sources (three 4-charge sources), exit requirement (8), or the level breakdown roadmap.

## Acceptance criteria
- Two distinct, recognizable mechanic NPCs appear together outside the warehouse in Level 1.
- Idle/smoking/exhale animation is readable at native game zoom, with subtle smoke and glowing embers.
- Their loops are offset and do not look synchronized.
- Scene remains cosmetic; player can run/jump past without obstruction.
- Existing Level 1 gameplay and charge economy remain unchanged.
- Asset files are organized, documented in the appropriate manifest, and previewable in Builder.
- Verify in browser at gameplay zoom; provide a screenshot or short capture, paths changed, test results, and commit SHA.

## Delivery
Follow **EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW**. Work from the latest canonical live branch and deliver via Aki's branch for Kiro review. Do not merge, overwrite unrelated level data, or publish without approval.


## Chief staffing override — 2026-10-12
**Aki is OVERCHARGE's sole active implementation owner** for this order, including art, Builder, schema, runtime/gameplay integration, testing, and delivery. **Do not block on Orcha approval or handoff.** Orcha is retired/on-call only for a major technical problem that Chief explicitly reassigns. Preserve all schema compatibility, regression testing, review, and no-merge-without-approval requirements. This override supersedes any earlier role split or instruction to wait for Orcha in this document.

# AKI ORDER 025 — Moving Rectangle Artifacts & Character Height Correction

**Issued by:** Chief | **Assigned to:** Aki — sole active OVERCHARGE developer | **Priority:** HIGH — visual bug and character-scale polish | **Target:** Level 1 and any shared renderer/effect systems responsible | **Status:** Work order; implementation not yet complete

## Chief's exact observations
- Three unwanted **small moving rectangles** appear across two gameplay screenshots: **one near the traffic cone** and **two in the second scene**.
- The adult streetlamp woman NPC is still slightly taller than the playable hero. **Chief requires the reverse: the player must be visibly slightly taller than the girl when both stand on the same ground plane.**
- Earlier Order 024 addressed an extreme scale/grounding issue. This is a **follow-up visual relationship correction**, not permission to undo the prior fix.
- The latest canonical branch already includes commits titled "Fix streetlamp NPC display scale and grounding," "Add animation-timed footsteps and windblown street litter," and "Keep NPC dialogue inside bubble and smooth streetlamp walk." **Investigate these recent changes as potential sources of moving artifacts, but do not assume causation without proof.**

## TASK 1 — Find and remove all three moving rectangles AT THEIR SOURCE

### Reproduce and identify
1. Start from latest `origin/agent/orcha-gameplay`; reproduce in the **actual running game**, not only the Builder.
2. Locate the screenshot scene containing the traffic cone and identify the rectangle beside it. Locate the second screenshot scene and identify **both** additional rectangles. If screenshot coordinates are unavailable, walk the level, inspect nearby decor, and capture a diagnostic recording; request Chief's original screenshots only if location remains ambiguous.
3. Observe for at least **60 seconds per location**, including movement, spawning, disappearing, and respawning; test player motion and camera scrolling to distinguish world-space from screen-space artifacts.
4. Trace each rectangle to the precise originating object, asset, animation frame, effect instance, or rendering function. Inspect recent street-litter, wind, footstep, particles, animation and decoration changes, as well as any placeholder/fallback sprite draw calls. Inspect layer order and camera transforms.
5. Instrument temporarily if necessary: log object/asset IDs, world/screen coordinates, frame index, source path and draw function; use temporary debug outlines or toggles locally to establish identity. Remove diagnostic instrumentation before final commit unless it is an intentionally reusable dev-only tool.
6. **Report root cause for each of the three instances**, including whether they share a single cause. Provide filenames, entity/effect names, and explanation of why they appeared. Do not guess or label as fixed without identification.

### Fix correctly
- Remove the unwanted rectangles **at their originating source**, or correct an incorrect crop, texture frame, placeholder sprite, render transform, alpha, or animation data as warranted by the proven cause.
- Do **not** cover them with background tiles, hide them offscreen, globally disable unrelated particle systems, or remove intended street litter, footsteps, smoke, NPC effects, lighting, or decor as a shortcut.
- If an effect is intended but its rectangle is a rendering bug, preserve the effect and repair the visual.
- Test that all three original instances are gone after moving away/back, retrying, checkpoint reload, full level restart, browser refresh, and camera scrolling.
- Verify no new artifacts at other locations or frame-rate settings.

## TASK 2 — Girl NPC must be slightly SHORTER than player

### Measure before editing
1. In gameplay, position the hero and streetlamp woman side by side on the **same platform elevation**, both standing upright in comparable idle poses.
2. Measure their **visible pixel silhouettes** from soles to the top of hair/head, not raw PNG canvas bounds (which may include transparent padding). Record current hero visible height and NPC visible height.
3. Target NPC visible height of approximately **90–95% of the hero's standing visible height**, so the hero is **clearly but only slightly taller**. Use the actual hero height as source of truth; fine-tune against in-game side-by-side screenshot. Do not make her tiny.
4. Account for hairstyle and heels while preserving adult anatomy, natural proportions, outfit, skin tone, and silhouette.

### Implement consistently
- Adjust the NPC's **display/world-space scale** proportionally (uniform X/Y) using a reusable render-size/feet-anchor contract; **do not distort or squash the source artwork**.
- Preserve crisp pixel edges and nearest-neighbor scaling; no blur, anti-alias halos, nonuniform stretch, or subpixel jitter.
- Keep her feet planted on the same floor plane as the hero across **idle, greeting, and walking** animation states. Verify every frame, including any recent streetlamp-walk changes, has consistent size, origin, feet anchor and no popping.
- Maintain consistent scale in gameplay, Builder preview, NPC selection hit bounds, animation thumbnails/ghosts, and dialogue bubble anchor. The speech bubble should remain above her **scaled head**, not at the raw source frame's top.
- Preserve NPC proximity radius, dialogue trigger/cooldown, non-collision behavior, interactions, and existing character motion. Change collision/interaction logic **only if absolutely necessary**, document exactly why, and provide regression proof.
- Keep original sprite source PNGs intact unless a proven asset defect requires editing.

## Acceptance checklist — mandatory evidence
- [ ] Visit both screenshot locations; capture at least 60 seconds of observation at each (or one continuous recording covering both).
- [ ] Identify **all three rectangles** with root cause and exact source references; remove the unwanted visuals without disabling unrelated effects.
- [ ] No recurrence after checkpoint retry, level reload, browser refresh, camera pan, and repeated traversal.
- [ ] Capture **before/after screenshots** of the traffic-cone scene and the second scene.
- [ ] Capture **side-by-side player/girl screenshot on level ground** with visible height measurement/ratio; hero clearly slightly taller.
- [ ] Test idle, greeting, walking, feet grounding, frame-to-frame scale, pixel sharpness, speech-bubble placement, Builder selection/preview.
- [ ] Verify existing gameplay collision, proximity dialogue, NPC animations, streetlights, smoke, footsteps, litter, charge sources, and exit gate behavior remain functional.
- [ ] Run focused regression tests and relevant broader tests; explicitly report any failures, even pre-existing ones.
- [ ] Deliver short **gameplay recording** demonstrating absence of rectangles, both characters at correct scale, animations and dialogue.
- [ ] Commit and push **every changed code, asset, manifest, and level file**; provide branch, commit SHA, exact file list, root-cause explanation, screenshots/recording paths, and exact tested build URL/SHA.

## Ownership / deployment
Aki owns the complete diagnosis, art/render/editor/runtime corrections, QA, and commit. Orcha remains retired/on-call. **EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW.** Do not force-push, merge to canonical, or claim deployment without Chief's explicit approval and verification. Avoid unrelated changes. Do not modify Level 1's three 4-charge sources or its 8-charge exit requirement.

# Hero animation preparation — Chief, 2026-09-29

Independent preparation while Aki completes verticality. The isolated `hero-lab.html` previews the authoritative staged hero-v3 pack; production character rendering and gameplay remain unchanged.

## Alignment resolved without changing PNGs

`alignment-audit.json` measures the transparent alpha bounds of all 16 walking frames. The two 1254x1254 frames have the same normalized feet position as the 512x512 frames within 0.139554 display pixels at 80px. Draw the complete natural source rectangle into the common display canvas, using the normalized 496/512 feet anchor. `src_scroll/hero-render.js` implements this. Original images remain byte-identical to the tested pack. This resolves the dimension concern for walking; it does not certify hand attachment positions or collision geometry for traversal.

## Prepared modules and preview

- `src_scroll/hero-sprites.js`: selectively staged tested animator, dormant in production.
- `src_scroll/hero-render.js`: explicit source dimensions and nearest-neighbor foot-anchored drawing.
- Character lab: 16 states, both directions, pause/replay, individual frame inspection, 80/160px views, and feet baseline. Traversal states explicitly say their mechanics are pending.
- Builder's empty-selection help links to the lab. Animation poses are previews, not static placeable terrain.
- All three entry pages share generated module versions.

## Validation

Animator regression: 52 passing checks. Renderer regression covers different source dimensions, invalid/unloaded frames and the walking alignment measurement. Local browser checks: all eight selected frames load; frame 4 of Walk correctly reports 1254x1254 at 80px; left-facing Ladder down is labeled assets only; frame selection pauses playback; attack Replay runs a one-shot animation. No browser console errors observed.

## Aki handoff

Read `AKI_LAPTOP_SYNC_REPLY.md`: Git integration and SAVE target are confirmed, actual laptop browser evidence remains unavailable. Its branch-specific version `9671d409770234e8` must not be used as the expected canonical Pages version; compare against the currently deployed gameplay page instead. Never reload an unsaved editing tab before preserving its draft.

Finish verticality first. Then use these shared animation/renderer modules for the requested Player/Traversal/Combat integration and separate mechanics fixture described in `AKI_SYNC_AND_HERO_NEXT.md`. Do not copy playground player physics wholesale, change canonical level layouts or move the gate. Ladder, ledge and combat behavior still require real runtime states and tests.

# CODEX 04 / 05 review — 2026-10-17

Review branch: `codex/orders04-05`. Started from live `bfce6fb`. All art is review-only. No level, runtime, or `ASSET_MANIFEST.json` changes.

## CODEX 04 — bus stop NPCs

Method A: one 48-frame loop at 6 fps (8 seconds) per NPC. Generated key poses were assembled into four quiet beats per character, with a fixed base frame between beats. The current sprites have hard alpha, so review frames do too. Both use 128×128 canvases with fully transparent borders, fixed feet at y=123, and fixed union trim boxes in `review-manifest.json`.

| NPC | Result | Tries | Old steps, 0→1→2→3→4→0 (%) | New maximum step | New seam | Frames ≥8% from neutral |
|---|---|---:|---|---:|---:|---:|
| Backpack commuter | Frame checks PASS; in-game proof pending | 2 | 99.1, 4.5, 2.8, 16.1, 99.0 | 18.2% | 0% | 36/48 |
| Unhoused man | Frame checks PASS; in-game proof pending | 2 | 98.7, 5.7, 11.0, 11.5, 98.2 | 15.9% | 0% | 40/48 |

Full new step arrays are in each `metrics.json`. First generated sheets had render drift between whole-body frames; the second assembly restricts motion to the intended beat. GIFs, dark/light 4× sheets, and 1×/3× isolated previews are in `assets/sprites/npc-bus-stop/review/{backpack,homeless}/`. These are not real-game screenshots. Browser proof at the bus stop remains required before acceptance; no art was registered.

`_dev/test_orders04_review.mjs` passes, confirming both 8-second review loops and all 96 frame files while the live manifest IDs remain unchanged. Full suite: 2853 passed, 7 failed with pre-existing fixture/module failures; it did not provide a clean acceptance signal. No product files changed.

## CODEX 05 — building and tenant

Task 1 **FAIL / HOLD**. Eight 160×256 wall bays plus 192×256 and 128×256 end caps are in `assets/objects/night-city-buildings/apartment_plain_review/`. The contact and tiling proof show visible seams and mismatched caps. The tenant opening in `wall_04` is not the specified 56×64, and there is no defensible exact sill coordinate. The parapet also has not been matched to rooftop tile 43. A second full-facade generation improved brick continuity but still made the tenant opening far too wide. Per the order's two-try limit, work stopped rather than registering weak art.

The eight wall-bay sampled means and blue-dominance results are in `palette_audit.json`: wall RGB ranges (23.2–25.0, 26.8–27.7, 75.7–78.5) and blue dominance 99.1–99.8%. This is a partial color check, not a full pass: the audit does not yet prove target hue, window warm-area limit, end-cap color, or in-game color matching. There is no valid opening/sill box to hand off.

Task 2 **FAIL / HOLD**. `assets/sprites/npc-window-tenant-v2/review/` contains generated woman-only key art and draft hot/relieved/relaxed clips. The layered fan rig in `hot_rig/` reaches 216 frames at 12 fps (18 seconds), maximum frame step 4.8%, seam 1.8%, and visible bounds at most 41×42 on a 64×64 canvas. It is visually too limited: the body, breath, head, and hair do not yet carry the required languid motion. The first whole-frame-dither clips for hot and relieved have visible speckling/ghosting. Neither relieved nor relaxed is accepted. Two approaches to the hot clip were tried; no third weak variant was shipped.

Mandatory real screenshots from the current running game with review art, hero, and bus-stop NPC are missing. The live game was opened from `bfce6fb`, but review art was deliberately not registered or placed. No synthetic composite is submitted as game proof. Chief/Kiro placement and manifest changes remain untouched.

**HOLD:** review CODEX 04's loops, then approve or request a new art direction. CODEX 05 needs corrected seamless building art with an exact 56×64 opening, followed by a more expressive tenant animation and real-game proof before any live integration.

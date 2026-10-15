# npc-window-woman — AKI_26 Part 2, item 2

The window NPC for the AC secret: the first story-relevant NPC. Two poses at the
window, as ordered in `docs/KIRO_ORDER_AKI_26.md` Part 2 item 2.

**NOT REGISTERED.** `assets/ASSET_MANIFEST.json` is untouched, no level JSON
references her, no runtime code was changed. Chief reviews the contact sheets in
`_qa/` first; the manifest block below is a proposal, not a registration.

## Contents

| Path | Frames | Playback |
|---|---|---|
| `complaining/00.png … 05.png` | 6 | loops, 6 fps |
| `relieved/00.png … 03.png` | 4 | plays once, then holds frame 03 |
| `_qa/contact_sheet_complaining.png` | — | review sheet, 2x nearest |
| `_qa/contact_sheet_relieved.png` | — | review sheet, 2x nearest |

Canvas 176x176 on every frame, matching `npc-smoke-break/worker-a`. Frame files are
zero-padded `NN.png` in a per-state folder, the same layout as
`npc-streetlamp-woman/{idle,greeting,walk}`.

She is the figure only — no window frame, no sill is drawn. The apartment facade
(Part 2 item 1, not in this delivery) owns the window opening she sits in. Her
forearms rest against an implied sill in the **canvas row 156-158** contact band. Opaque sprite pixels extend to row 161 in most frames (row 159 and 158 in relieved frames 02 and 03), so the opening and masking must account for the full bounds.

## Animation reading

- **complaining** — leaning out on a hot night, fanning her face with her raised
  open hand, hand travelling toward and away from the cheek. The loop is pinned:
  the generator interpolated back to the first frame, so frame 05 flows into
  frame 00 with no snap. (The raw 7th frame was an exact duplicate of frame 00 and
  was dropped rather than shipped.)
- **relieved** — cool air arrives: she stops fanning, lowers the hand, shoulders
  drop, eyes soften, and she ends with both forearms on the sill. Frame 00 starts
  from the complaining pose, so it cuts straight out of the loop without a pop.

## QA — every frame (`pipeline.py` output + audit)

| Check | Result |
|---|---|
| Dimensions | 176x176 on all 10 frames — PASS |
| Transparent border | 0 opaque pixels on any of the 4 canvas edges — PASS |
| Alpha sanity | binary alpha, 0 semi-transparent pixels (same as `worker-a`) — PASS |
| Palette lock | 0 off-palette colours; 21-27 colours/frame out of the 32-colour Night City character subset — PASS |
| Magenta / pink | 0 pixels in sat>0.15, hue 285-350 — PASS |
| Detached pixels | exactly 1 connected island per frame (the figure) — PASS |
| Frame contact | sill contact row 156-158 across all 10 frames (2 px settle) — PASS |
| Vignette / framing | no border ring; subject is a free sprite on transparent — PASS |

Frame-contact detail: `sillYByFrame` complaining `[158,157,156,156,156,157]`,
relieved `[158,158,156,158]`. The 2 px wobble is the lean settling and is in the
same band as the shipped `npc_streetlamp_woman` (`footYByFrame [221,221,222,222]`),
so it is recorded here rather than flattened. Relieved frame 03 is the only frame
that needed correcting: the generator dropped her 7 px through the sill line, so
that frame is shifted up 7 px in `pipeline.py` (`SHIFT_Y`).

The relieved set's alpha bounds widen (x 34..150 vs 40..136) because her arms
spread along the sill as she relaxes — that is pose, not drift; the torso left edge
holds within 2 px.

## Palette

Locked to a 32-colour Night City **character** subset, sampled from
`npc-smoke-break/worker-a`, `npc-streetlamp-woman` and
`night-city-props/{fuse-box,vending-machine}`, then filtered:

- magenta/pink band (sat>0.18, hue 285-350) dropped before generation, and the
  palette was fed to PixelLab as a forced `color_image` so the lock held at
  generation time rather than being argued for in the prompt;
- the two quantiser strays that landed at hue 324/327 were hue-corrected to 238
  (indigo) instead of deleted, to keep their shading steps;
- prop-glow accents (mint LED `143,255,224`, cyan `113,179,194`) and the near-white
  cream `187,186,156` are deliberately **out** of the character subset — the
  animator's white sparkle highlights kept snapping onto them and reading as
  cyan/white dots on her hair.

## Known weakness (flagged, not fixed)

Her raised hand sits higher on the skin ramp than her arms — it reads as brighter
than the rest of her. It is consistent across all 10 frames and every colour is on
the shared skin ramp, so it reads as the hand catching the street light. Not
corrected, because masking a moving hand across 10 frames to re-darken it risks
flattening the form. Chief's call.

## Reproduction

`source/pipeline.py` and the 12 raw animation frames are archived with this draft. Running the pipeline from `source/` against those files deterministically regenerates the shipped frames. PixelLab job ids for the source are:

- complaining base: `create_image_pixflux` `753fe3c6-86c4-4ee0-ace8-4c9aac4619fe`
  (try 1 — the fanning hand came out as a microphone-like object)
- hand repair: `inpaint_image` `a05f5ccb-f34e-4fba-b38a-543fd2f15971` (try 2, box
  32x56 at 104,52 — everything outside the mask stayed pixel-identical)
- complaining loop: `animate_image` `0e090481-020b-4616-88f1-5c95bc8cb9f8`
- relieved: `animate_image` `0cfa56ba-ba3b-4087-b883-cb573ad06b55`

Two tries were used on the base frame, which is the cap; nothing was regenerated
after that. Everything from there on is local and free.

## Proposed manifest block (DO NOT APPLY until Chief approves)

```json
{
  "id": "npc_window_woman_complaining",
  "path": "assets/sprites/npc-window-woman/complaining/00.png",
  "category": "npc",
  "spawnsKind": "npc",
  "tags": ["npc", "night_city", "animated", "dialogue", "story", "window"],
  "frame_width": 176,
  "frame_height": 176,
  "frame_count": 6,
  "fps": 6,
  "directions": null,
  "loop": true,
  "trim": { "x": 0.2273, "y": 0.1761, "w": 0.5455, "h": 0.7443 },
  "sillYByFrame": [158, 157, 156, 156, 156, 157]
},
{
  "id": "npc_window_woman_relieved",
  "path": "assets/sprites/npc-window-woman/relieved/00.png",
  "category": "npc",
  "tags": ["npc", "night_city", "animated", "dialogue", "story", "window", "reaction"],
  "frame_width": 176,
  "frame_height": 176,
  "frame_count": 4,
  "fps": 6,
  "directions": null,
  "loop": false,
  "trim": { "x": 0.1932, "y": 0.0625, "w": 0.6591, "h": 0.858 },
  "sillYByFrame": [158, 158, 156, 158]
}
```

`relieved` is deliberately given no `spawnsKind`: like `npc_streetlamp_woman_greeting`
it is a reaction state reached from another asset, not a Builder palette entry. Which
field links it (a new `relievedAssetId`, or the AKI_26 1.4 `dialogue.poweredLines`
path) is a runtime decision and is Chief's to make — no code was written for it here.

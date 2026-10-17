# AKI 26 PART 2: art review handoff

Branch: `agent/aki-order26`, held for Chief's piece-by-piece review. Nothing in this part is registered in the asset manifest or placed in a level. The apartment facade is a rejected review draft, not a shippable asset.

| Item | Status | Review evidence and limitation |
|---|---|---|
| 1 Apartment facade | **FAIL** | [`apartment_hint/preview_stitched.png`](../assets/objects/night-city-buildings/apartment_hint/preview_stitched.png), [`preview_contact_sheet.png`](../assets/objects/night-city-buildings/apartment_hint/preview_contact_sheet.png). Four correct-size cool-palette panels, but parapet/slab bands drift at the seams. Two PixelLab attempts used. Its README marks the draft rejected; do not register or use it. |
| 2 Window NPC | **Art PASS, integration pending** | [`complaining contact`](../assets/sprites/npc-window-woman/_qa/contact_sheet_complaining.png), [`relieved contact`](../assets/sprites/npc-window-woman/_qa/contact_sheet_relieved.png). Six-frame complaining loop, four-frame relieved reaction; all 176x176, transparent borders, no magenta. The facade opening is rejected, so placement/in-game fit cannot be verified. Raw animations and deterministic pipeline are archived in `source/`. |
| 3 AC recolour | **Geometry/colour PASS; border guard FAIL pending waiver** | [`contact sheet`](../assets/objects/night-city-props/ac-unit/_qa/contact_sheet.png). New 33x26 body and 17x26 fan match the originals' sizes and alpha masks byte for byte. Full-bleed border is inherited from the original; adding a margin would break the same-size/identical-shape/fan-alignment requirements. See the AC README for the waiver request. |
| 4 Relay pylon | **Art PASS** | [`contact sheet`](../assets/objects/night-city-props/relay-pylon/qa_contact_sheet.png). 96x256, lit top, 2px clear border, no magenta. |
| 5 Light cable | **Art PASS** | [`contact sheet`](../assets/objects/night-city-props/light-cable/qa_contact_sheet.png), [`tiling proof`](../assets/objects/night-city-props/light-cable/qa_tiling_proof.png). Horizontal, vertical and corner tiles, each 32x32; four measured joining seams have zero mismatched rows/columns. Tile edges intentionally bleed. |
| 6 Beacon top | **Art PASS** | [`contact sheet`](../assets/objects/night-city-props/beacon-top/qa_contact_sheet.png). 128x96, clear border and matching cyan-lit hue within the build script's 0.05 tolerance. |
| 7 Hatch and room dressing | **Art PASS** | [`contact sheet`](../assets/objects/night-city-props/secret-room/contact_sheet.png). Closed/open 64x32 hatches and four story-neutral props; clear borders, cool palette. |
| 8 Pip pickup | **Art PASS** | [`contact sheet`](../assets/objects/pip-pickup/contact_sheet.png). Four 16x16 bob frames, with symmetric repeat of frames 00 and 02. Clear borders; palette remapped from existing charged pip art. |

## Verification

- `_dev/aki26_part2_pylon_cable_beacon.py`: dimensions, palette, alpha, seams and lit hues PASS, rebuilt from committed source without requiring scratch downloads. `_dev/aki26_part2_room_pip.py`: dimensions, listed palette and clear borders PASS. `_dev/aki26_part2_art_audit.py`: audited all review frames, no magenta-like colours, protected manifest/level paths unchanged against Part 1 and in the index/working tree. The apartment and AC are documented full-bleed exceptions, not silent border passes.
- Rebuilt all ten NPC frames from the archived raw frames and `source/pipeline.py` into a scratch folder; resulting files matched the review PNGs byte for byte. Compared AC dimensions and alpha channels to the existing `hvac_a` and `hvac_fan_a`: identical.
- Full suite from repository root with Node: **2761 passed / 24 failed across 65 suites**, the same totals previously recorded after Part 1; two older suites crash without `RESULTS`, and the runner exits 1. There are no additional counted failures. The checkout also showed pre-existing hero-mechanics fixture line-ending noise and an unrelated untracked Order 23 screenshot, excluded from all Part 2 commits.
- No in-game screenshots or browser proof: registration and level placement are intentionally blocked until Chief reviews each image. No real level JSON, manifest, runtime code, merge or live deployment was changed by Part 2.

## Review decision

Review the linked sheets piece by piece. Keep item 1 rejected; approve a fresh band-aligned art pass separately if desired. Confirm the AC full-bleed exception before registering item 3. **Do not register any item or place it in a level until its art is approved.**

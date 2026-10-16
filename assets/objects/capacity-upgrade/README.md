# Capacitor Module (charge capacity upgrade item)

Item #3 on Chief's "Charge Capacity Upgrade Item Exploration Sheet" (October 14, 2026). Collecting it raises the
player's maximum charge (the sheet's example is 10 / 10 becoming 14 / 14). See `docs/GAME_DESIGN_V2.md` section 3.8.

| File | What |
|---|---|
| `item.png` | 48 x 48 still: a compact gunmetal module with bolted corner plates, amber and black hazard stripes on the right face, a glowing cyan core window with a triangle emblem, and spark terminals on top. |
| `idle_00.png` to `idle_08.png` | 9-frame idle loop at about 8 fps. The core pulses bright, dim, bright, and the top sparks flicker. `idle_00` equals the still. |

**Not registered in the manifest yet.** `docs/KIRO_ORDER_AKI_26.md` asks Aki to add the manifest entry (no BOM) and
the Builder palette entry once the `capacity-upgrade` pickup exists (`docs/KIRO_ORDER_CODEX_01.md` task A5).

## Provenance and checks
- Made by Kiro with PixelLab on 2026-10-14. Still: `/create-image-pixen`, 48 x 48, seed 14, transparent background,
  black outline. Idle loop: `/animate-with-text-v3` from the still, 8 frames (9 with the kept first frame), seed 4242,
  prompt "the glowing blue core pulses brighter then dimmer, small electric sparks flicker and jump at the top
  terminals, the metal module hovers gently up and down by one pixel".
- Description used for the still: industrial capacitor module power-up item for a night-city sidescroller, a compact
  rectangular dark gunmetal steel housing with bolted plates, amber and black hazard-stripe trim on the side panels, a
  glowing cyan-blue energy window in the centre of the front with a small triangle emblem, small cyan electric sparks
  arcing from the top terminals.
- Art check (every frame): 48 x 48, no opaque border pixels, no semi-transparent pixels, no white border, 33 to 50
  colours, feet line stays within 1 px (y 41 to 42), left edge fixed.
- **Known quirk:** in frames 2 to 7 the core's triangle emblem softens into a ring or diamond shape as it pulses, then
  comes back at frames 0 and 1. It reads as an energy pulse at game size. If Chief wants the emblem to stay put, the
  fix is to regenerate with another seed or to repaint the core.
- The other eleven concepts on the sheet (Power Core, Charge Cell, Energy Shard, Neural Band, Circuit Chip, Tesla Coil,
  Reactor Module, Energy Canister, Tempest Fragment, Data Drive, Power Ring) are not made.
- Candidates that were rejected: the 48 px seeds 22 and 23 read as treasure chests, which would be confused with the
  game's chests.

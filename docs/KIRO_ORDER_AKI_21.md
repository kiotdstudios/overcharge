# AKI ORDER 021 — Streetlamp Nightlife NPC (Adult Character)

**Issued by:** Chief / Kiro | **Assigned to:** Aki | **Target:** Level 1 NEON RISE | **Depends on:** Order 022 for configurable speech; art and staging may begin independently.

## Vision
Build a memorable, charismatic **adult African American woman** working the nightlife street corner. She stands beneath a streetlamp near the warehouse/night-city storefront district and flirts playfully with the passing player. She should feel confident, glamorous, seductive, and fully part of a lived-in cyberpunk city. She is an ambient storytelling NPC, not a quest, sex interaction, enemy, or power source. No explicit sexual content, nudity, or graphic behavior.

## Character design — concrete pixel-art brief
- Clearly adult, approximately mid-to-late 20s or older. Dark brown skin with deliberate pixel clusters for highlights and shadows; preserve accurate skin tone under violet/cyan lighting.
- Long, voluminous curly hair, ideally dark black/brown, with readable outer silhouette and a few subtle purple-blue reflected highlights. No individual-hair anti-aliasing; maintain crisp pixel-art discipline.
- Cute, fashionable fitted mini dress, e.g. deep wine-red, purple, or black with subtle cyan edge-lighting; classy, nightclub-ready, attractive and distinctly recognizable against the warehouse backdrop.
- High-heeled shoes/boots, tasteful jewelry (hoop earrings or necklace), optional small clutch purse. Ensure the heels are legible in a side-scroller silhouette and don't make her feet appear to float.
- Body language: weight on one hip, relaxed shoulder, one hand resting at hip or adjusting curls, confident smile. A strong *character* rather than a static decoration.
- Side-on 2D pixel art consistent with existing OVERCHARGE player/NPC scale. Ground her feet to the actual sidewalk baseline. Maintain readable proportions at 1× and gameplay zoom. Use transparent PNG sprite sheets with exact frame sizes documented in sidecar metadata; choose actual frame dimensions after inspecting existing asset scale, not by guessing.
- Avoid image-model blur, semi-transparent edge halos, off-grid subpixels, jagged resizing, inconsistent hair volume, mismatched face/skin between frames, and fake perspective.

## Animation and personality
Minimum animations: (1) natural idle with small weight shifts, (2) hair touch / curl flip, (3) slight hip shift or shoe adjustment, (4) a short head turn/eye glance toward the player, (5) friendly wave or two-finger beckoning gesture for greeting. Optional blinking and light jewelry sparkle. Idle animations should be subtle and infrequent; do not make her continuously wave or gyrate. Preserve ground anchor and silhouette between frames; stagger ambient loops, do not lock motion to FPS. When player enters proximity, play greeting animation once per approach and show speech via Order 022. When player exits and re-enters after cooldown, greeting may replay. If runtime lacks animation hooks, prepare assets and coordinate with Orcha rather than editing gameplay ownership without review.

## Streetlamp staging
Place near a **working or softly flickering streetlamp** in Level 1, at a natural sidewalk spot away from gate/source/checkpoint and away from the warehouse mechanics so both vignettes read separately. Lamp casts warm amber or pale cyan light on her hair/shoulders and pavement; surrounding storefront remains darker. Optionally include a tiny puddle reflection and subtle neon rim light. Use existing streetlamp/decor assets and renderer capabilities where possible; do not introduce expensive dynamic lighting or new power mechanics just for this scene. Confirm placement using current Level 1 coordinates and visual preview, not an assumed X value. She is background/ambient, **non-colliding**; player can run past.

## Example greeting lines (editable, not hard-coded)
Default greeting: **"Hey, cutie... you look like trouble. The fun kind."**
Alternates:
- "Hey, handsome. You always light up the block like that?"
- "Mmm, look who's got a little spark."
- "Careful, baby. This street eats the unprepared."
- "You headed downtown? Watch those gates, sweetheart."
Keep lines short enough for a readable 2D game speech bubble. Voice and tone: flirtatious, playful, not explicit. Chief must be able to change every line in Builder using Order 022.

## Art delivery
- Separate named sprite asset(s) and animation metadata, with transparent backgrounds, no baked-in streetlamp or bubble.
- Distinct still/idle preview for Builder asset bank; appropriate manifest categories/tags such as ambient, npc, nightlife.
- Place one NPC in Level 1 using the agreed NPC schema **only after runtime and editor support are confirmed**; never smuggle NPC data into decorations if this makes the NPC impossible to select or edit.
- Keep NPC logic independent of the character asset so future street-corner NPCs can reuse the same animation and dialogue mechanics.

## Acceptance / QA
1. Visually reads as an adult Black woman with long curly hair, dress, heels, confident silhouette at native pixel resolution.
2. At least five requested motion states delivered or clearly flagged as blocked by runtime support; no foot sliding or sprite jitter.
3. Naturally staged beneath streetlamp with clear foreground/background layering.
4. NPC is non-colliding, cannot block traversal, and has no charge/combat interaction.
5. Player approaching triggers the chosen greeting **once per entry**, not every frame, when Order 022 integration lands.
6. Character is selectable in Builder, with editable dialogue settings once Order 022 is ready.
7. Browser screenshots/video at 1× and actual gameplay zoom; list files, tests, any Orcha dependencies, and commit SHA.

## Ownership and workflow
Aki: art, asset metadata, Builder-facing presentation, Level 1 staging. Orcha: new runtime NPC proximity/animation hooks if needed. Follow EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW; do not merge or publish without Chief/Kiro review. Do not alter the 3×4 charge sources or 8-charge exit.

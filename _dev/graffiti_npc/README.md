# Level 1 graffiti artist

Imagegen source sheets are `artist_raw.png` (eight body poses) and
`tag_layers_raw.png` (cyan, violet, amber wall-paint passes). The accepted
transparent body poses are in `artist_processed/shoot-1.png` through
`shoot-8.png`.

`python _dev/build_graffiti_npc.py` deterministically composites the generated
art into 48 transparent 256×128 frames in
`assets/sprites/npc-graffiti-artist/`. The manifest plays them at 2 fps for an
exact 24-second loop. Frames 0–3 prepare, 4–15 spray cyan, 16–17 swap cans,
18–31 spray violet, 32–33 swap, 34–41 spray amber, and 42–47 inspect the
finished tag. The loop restarts the tag after the inspection hold.

`python _dev/graffiti_npc_acceptance.py` verifies the frame count, color
progression, level placement, and foot anchor. `milestones.png` previews 0,
6, 12, 18, and 23 seconds. The Level 1 NPC is at (490, 448) on the raised
roof shown in Chief's screenshot; its tag appears on the brick wall to the
right of the artist.

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

`python _dev/graffiti_npc_acceptance.py` verifies frame count, color
progression, level placement, and foot anchor. `milestones.png` previews the
initial 2 fps version; that version is retained only as source history.

## Smooth animation revision

`python _dev/build_graffiti_npc_v2.py --publish` exports 288 frames at 12 fps,
still a 24-second loop. It holds the generated body and feet fixed, pivots an
arm cut from the generated spray pose with eased strokes and can changes, and
moves the generated spray with the nozzle. The three generated paint layers
build cyan, then violet, then amber. The complete mural holds for two seconds
and fades during the last second so the loop does not hard-cut the tag. QA GIF,
contact sheet, and metrics go to `v2_review/`.

The Level 1 placement is (1000, 480) at scale 0.8. The painter stands on the
raised roof and the paint strip sits inside the filler wall at x=1034..1162.

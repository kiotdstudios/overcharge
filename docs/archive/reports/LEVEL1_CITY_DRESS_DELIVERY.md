# Level 1 Night City dressing

The approved 100×18 tile route is unchanged. The blue rooftop terrain remains the only surface/collision source; all building panels are noncolliding decorations placed above it. The previous canonical file is preserved at `level_archive/level1-2026-10-06-before-city-dress.json`.

Left to right in `src_scroll/levels/level1.json`:

| World span | Building | Baseline | Purpose |
| --- | --- | --- | --- |
| 0–640 | Apartment complex, four panels | y=480 | Residential start and first streetlight |
| 864–1504 | Warehouse, four panels | y=352 | High roof and industrial middle |
| 1504–2144 | Garry's Electronics, four panels | y=320 | One-way high-route landmark; separate powered plug |
| 2144–2432 | Russ's Tire Shop, front + right panels | y=384 | Short raised-roof landmark; separate powered tire |
| 2432–3072 | Bry's Library, four panels | y=480 | Warm destination stretch; separate powered BOOKS sign |
| 3072–3200 visible | Gatehouse portal | y=480 | Puts the unchanged exit gate inside a dark architectural recess; final 32px is clipped by the level boundary |

Each four-panel run has exact horizontal edge adjacency and a shared baseline. The 288px raised segment only has room for Russ's two-panel frontage. Coffee Bar remains a Builder asset; placing it into the existing 224px route gap would visually bridge a jump and make that gap harder to read. The full gatehouse would require moving the gate or extending the level; this design uses its portal at the fixed endpoint.

The PLUG, TIRE, and BOOKS signs are independent four-charge wall sources with eight frames each. Their interaction hitboxes are within the 56px absorb radius from their playable roof/floor. Existing lamps, HVAC, checkpoint, player spawn, high/low route, exit location and eight-charge cost are untouched. The new signs create optional energy and visual targets, so the level has more charge available than before.

`previews/level1-city-dress-panorama.png` is a static full-level composition check. It is not the runtime renderer. `scripts/dress_level1_city.py` reproduces the authored arrangement from the archive and refuses to run if gameplay geometry has changed since the archive. `_dev/level1_city_dress.mjs` checks geometry preservation, panel joins, frame paths, edge clipping, and source reach from surfaces.

Verification: local browser loaded and rendered the starting apartment roof without missing-art placeholders. `level1_city_dress.mjs` and `facade_routes.mjs` pass. The completability suite reports Level 1 completable, exit ahead of spawn, and its eight-charge gate preserved; its two suite failures are in Level 2. A complete hands-on run of both routes and the new sign interactions remains the final playtest gate before treating the composition as visually approved.

# Night City apartment complex

Four connected 8-tile-high visual dressing panels, authored from the supplied
blue-indigo brick wall reference. Place in this order:

| Panel | File | Size |
| --- | --- | --- |
| Fire escape / left end | `left.png` | 192x256 (6x8 tiles) |
| Residential window bay | `wall_bay.png` | 160x256 (5x8 tiles) |
| Lit apartment entrance | `front_bay.png` | 160x256 (5x8 tiles) |
| Right end | `right.png` | 128x256 (4x8 tiles) |

The combined facade is 640x256 (20x8 tiles). `preview.png` is the assembled
reference image; `source.png` is the generated raw art. Run
`python scripts/build_apartment_panels.py` to regenerate the four cuts and the
preview. These are noncolliding decorations. The fire escape and door have no
traversal or interaction mechanics.

The building roof is kept clear for separate rooftop props. The existing
Level 1 geometry and object placements are unchanged.

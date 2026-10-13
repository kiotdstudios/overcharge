# Level 1 high/low route

Chief approved this route as the active Level 1 on 2026-09-30. The former campaign file is preserved at `level_archive/level1-2026-09-30-before-high-low.json`. The unchanged gate is at `(1984, 256)` and still requires eight charge; the sources, checkpoint, and spawn are preserved.

At the right edge of the tall solid building, the player makes a choice:

- **High:** sprint-jump over the one-tile gap onto a two-tile catwalk, then jump onto the existing landable gate roof.
- **Low:** run off the edge and land on the existing lower rooftop. The building facade stays passable in front. Two small one-way ledges climb back up to the same gate roof in 64px steps.

The new support cells are one-way value `2`, paired with existing blue rooftop art. They do not block movement from the side or from below. No new enemy, energy source, gate, timer, or checkpoint was added. The choice is movement and route discovery, not a resource tax.

`previews/level1-high-low.json` remains the exact undressed route baseline. In a disposable Builder tab, use **Level > Import level** to compare that baseline with the current level. Do not save the imported baseline over newer campaign edits.

`node _dev/level1_high_low_route.mjs` exercises both choices and the two-step return against the real Player and Level classes at fixed 60 Hz. Headless tests establish movement and collision; visual composition and player feel still need browser playtesting.

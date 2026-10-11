# ATM machine

Free-standing 128x128 night-city street ATM. Floor-mounted like the vending machine (no `mount` key, unlike the wall signs). Choose it in the Builder's Electric filter to place a real four-charge absorbable source; it can be moved independently of any building panel.

Frames `00`-`01` are powered idle (screen lit, gentle flicker). `02`-`05` pulse brighter/more saturated on the screen while absorbing. `06`-`07` are drained (screen dark, body desaturated).

`source.png` is the generated master (PixelLab Pro Flash, styled against the vending-machine art for palette/lighting match). Run `python scripts/build_atm_frames.py` to regenerate the eight frames and `preview.png`. Not baked into any building facade and not placed in any level by this pack.

# Powered neon tire sign

Large literal tire sign for Russ's Tire Shop. This is a standalone wall-mounted
`source-prop` in the Builder, independent of the shop facade. Placing it creates
an absorbable electrical source (4 charge by default); it does not alter the
existing shop image, roof geometry, or Level 1 placements.

Eight aligned 128x128 frames follow the existing Night City powered-prop
contract: `00`–`01` powered, `02`–`05` absorbing (moving violet arc), `06`
drained, and `07` spare dark frame. `source.png` is the generated master art;
`preview.png` is a contact sheet. Rebuild the frames with
`python scripts/build_tire_sign_frames.py`.

# Night City gatehouse

Four 8-tile-high brick panels frame the existing Level 1 exit gate:

| Panel | File | Size |
| --- | --- | --- |
| Left utility wing | `left.png` | 192x256 (6x8 tiles) |
| Dark portal housing | `portal.png` | 160x256 (5x8 tiles) |
| Service wing | `service.png` | 160x256 (5x8 tiles) |
| Right end cap | `right.png` | 128x256 (4x8 tiles) |

The combined 640x256 facade is in `preview.png`. `gate_fit_preview.png` overlays
the existing gate's measured 94x105 visible art to check alignment; it is a
preview only and never appears in the Builder. `source.png` is the generated
master. Rebuild cuts with `python scripts/build_gatehouse_panels.py`.

Level 1 places the facade at world `(1972,128)` behind the unchanged exit gate
at `(2240,320)`; the portal opening aligns with the gate's drawn bounds. The
roof platform at y=384 still draws in front of the facade. The dark recess
remains visible when the gate opens. These four panels are noncolliding visual
decorations; only the original PowerGate controls charging, collision and exit.

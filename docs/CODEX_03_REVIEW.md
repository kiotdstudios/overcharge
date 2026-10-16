# CODEX 03 — review handoff

All four rejected art pieces have new, unregistered candidates. The PNG frames have transparent backgrounds and no partially transparent pixels. The review folder contains a 4× dark/light contact sheet, a 1× scene mockup beside the hero, and a 3× nearest-neighbour scene crop. These are **composited review images**, not proof of live placement. No manifest or level was changed.

| Task | Result | Tries | Review files |
|---|---|---:|---|
| Apartment, four seam-aligned panels | PASS for review. 640×256 stitched from 192×256, 160×256, 160×256, 128×256 panels; shared parapet and slab line. Measured blue-dominant 74.6%, warm 5.4%, purple 4.1%. | 2 (first was too blue) | `assets/objects/night-city-buildings/apartment_codex03_review/` |
| Window NPC hot/relieved | PASS for review. Two new six-frame 176×176 sequences. The complaining loop uses a visible paper fan; relief ends with an open smile. Content is scaled inside the fixed canvas to fit the apartment opening. | 1 each | `assets/sprites/npc-window-woman-codex03-review/complaining/`, `relieved/` |
| Dropped pip | PASS for review. Four 24×24 frames derived from the HUD pip identity. Bright core, dark metal rim, distinct outline. | 1 | `assets/objects/pip-pickup-codex03-review/idle/` |
| Capacitor Module | PASS for review. Amber/gunmetal box with MIOR triangle, warning triangle and no cyan. `item.png` 48×48, six idle, four glow and eight turn frames at 48×48; upright-can `icon.png` 24×24. | 1 item, 1 per motion sheet, 1 icon | `assets/objects/capacity-upgrade/codex03-review/` |
| Hatch state art | PASS in headless test. `style:'hatch'` draws the existing 64×32 closed/open sprites while retaining gate collision; accepts optional custom paths. | 1 | `src_scroll/electricity.js`, `_dev/codex03_gate.mjs` |
| Source-powered barrier | PASS in headless test. Optional `{id,min}` opens a block-only barrier at threshold and closes it again when charge falls. Missing source fails closed. The source predicate is exported for the reactive NPC dialogue task. | 1 | `src_scroll/level.js`, `src_scroll/electricity.js`, `_dev/codex03_gate.mjs` |

Automated art audit: 4 apartment, 12 NPC, 4 pip and 20 capacitor PNGs passed border and opacity checks (`_dev/codex03_art_audit.json`). The four-panel proof is `apartment_codex03_review/tiling_proof.png`. The reproducible crop and chroma cleanup is `_dev/codex03_art.py`. The art's visual quality and animation reading still require Chief's review at game scale.

Engine verification: `_dev/codex03_gate.mjs`, `_dev/fence_switch.mjs` (73/0), `_dev/level1_secret.mjs` (23/0), `_dev/energy_authority.mjs` (96/0), `_dev/test_electricity.mjs`, and `_dev/parity_regression.mjs` (642/0) passed. The real Level 1 AC source and secret door were used as a test fixture; Level 1 itself retains its fence and `SW_AC` until approved integration. No Builder controls or capacitor charge rules were changed.

# DELIVERY — OVERCHARGE LAB

**Built by:** Kiro (Chief reassigned the ORCHA order: *"was gonna give it to orcha but u take it"*)
**Branch:** `agent/kiro-overcharge-lab`, branched from `origin/agent/orcha-gameplay` at `c1fa5be`
**Status:** complete, pushed, **NOT promoted** to the Pages line — awaiting Chief's gate per order §8.

---

## 1. Files

**New, and the entire deliverable:**
| File | Purpose |
|---|---|
| `overcharge-lab.html` | the page — title, cyan favicon, 16:9 canvas, HUD, override panel, control legend |
| `editor/overcharge-lab.js` | controller, test room, collision, HUD, override |
| `_dev/overcharge_lab.mjs` | acceptance suite, 33 assertions, includes a Hero Lab regression block |

**Shared files touched: NONE.** `hero-lab.html`, `editor/hero-lab.js`, `src_scroll/hero-sprites.js`,
`src_scroll/hero-render.js`, the Builder, the production player and every level JSON are byte-unchanged.
`level_guard.mjs` exits **0**.

**Imported read-only:** `PlayerSprites`/`HERO_STATES` from `hero-sprites.js`, `drawHeroFrame` from
`hero-render.js`, and `GRAVITY / JUMP_FORCE / PLAYER_SPEED / PLAYER_W / PLAYER_H / TILE` from
`constants.js`.

**Why import production constants** rather than pick lab numbers: a sandbox tuned to a different jump would
validate animations against an arc the game does not have. `RUN_MULT 2.1`, `COYOTE 0.10`, `JUMP_BUF 0.12`
are lab-local — production has no run state, and the two input aids exist so a jump test is not
frame-perfect. They are marked lab-only in the source.

## 2. Removal
Delete `overcharge-lab.html`, `editor/overcharge-lab.js`, `_dev/overcharge_lab.mjs`. That is the whole
removal — nothing imports them and nothing else needs editing. The order asked for disposable; it is.

## 3. Test room
30 × 17 tiles at 32px, hardcoded as an ASCII map in the module. **Deliberately not loaded from level JSON**
(§6) so the lab cannot acquire a dependency on Builder-authored content.
- flat baseline, 20 tiles wide — sustained walk and run
- low platform at row 8 — jump and landing inspection
- high ledge at row 6 with an open left edge — a safe drop to watch fall → landing
- a 4-tile gap in the floor; falling out of the room resets instead of hanging

Collision is axis-separated AABB against the grid. Simple on purpose and commented as such, so it is never
mistaken for production collision.

## 4. One defect found, in the lab's own input handling
A **tapped** J or K played nothing. `page.keyboard.press()` fires keydown and keyup inside a frame, my keyup
cleared `attacking`, and the animator's `attackStart` edge therefore never saw a rising edge. `H` worked only
because it already used a timer.

Fixed by latching the attack for `ATTACK_LATCH = 0.12s`, mirroring how `hurt` works. `e.repeat` is ignored so
a held key does not re-arm it. **This is exactly the class of bug the lab exists to expose** — frame-level
input and animation timing that a frame-by-frame previewer cannot show.

## 5. Results
```
_dev/overcharge_lab.mjs       33 / 0
  movement      idle, walk, run, facing east/west, return to idle
  jump          jump pose, airborne, landing, return to idle
  one-shots     J strike, K cast, H hurt, movement intact afterwards
  held          E absorb, F discharge
  reset         R returns to spawn
  override      all 16 states forceable, returns to gameplay
  hygiene       zero console errors, zero failed requests
HERO LAB regression           title, 16 states, frame readout, zero errors
boot_smoke (game + Builder)   BOOT_SMOKE_OK, ERRORS: []
level_guard                   exit 0 — no level file touched
```

## 6. Known limitations
- **Traversal states are force-preview only.** `ladder-up`, `ladder-down`, `ledge-climb`, `wall-slide`,
  `grapple` have no mechanic, exactly as Hero Lab states. No mechanic was invented to make them play (§4).
  The panel labels them *assets only*.
- `stunned` and `death` are override-only — no lab control triggers them, since neither has a trigger here.
- No camera. The room is one screen by design, so there is nothing to scroll.
- The hitbox is 20 × 30 while the sprite draws at 80px. That is the production relationship; the lab outlines
  the box in cyan so the mismatch is visible rather than surprising.
- `RUN_MULT 2.1` is invented. Production has no run speed to match, so the walk→run transition reads at a
  plausible rate rather than a canonical one. **Chief should tune this number** — it is the one value in the
  lab with no production source.

## 7. Confirmation
Hero Lab and the production game were **not altered**. The only shared modules are imported read-only, no
file outside the three new ones is modified, and the live game has no reference to this page.

Public URL once promoted: `https://kiotdstudios.github.io/overcharge/overcharge-lab.html`

— Kiro, Technical Director

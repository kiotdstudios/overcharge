# For Chief — AKI_17 power feedback needs real pixel-art frames, not canvas glow

Diep tested AKI_17 (electrical absorb/drain/gate-readiness feedback, commit `d15f626`, now live) in the actual game and flagged it. Notes below are his, written up for your review. This is a request for art, not code — I'm not changing any of the runtime logic until you've seen this and decided what you want.

## The complaint

**"It looks like it was created outside the game — doesn't match the pixel vibe."**

Specifically:
- The drain/absorb glow (the cyan pulse at a source while it's being drained, and the matching glow around the player when energy arrives) is a `createRadialGradient` canvas effect — soft, blurry, large surface area. Every other powered/animated thing in this game (the generator sprite, the HVAC fan, the Night City props themselves) is hand-drawn pixel art with hard edges and a limited palette. The gradient blob sits on top of that art and reads as a web-dev effect, not game FX.
- The gate's new "player has enough charge" readiness cue is literally a stroked rectangle outline (`ctx.strokeRect` + `shadowBlur`) over the gate sprite — "the gate just has a cyan box over it." Same problem: a programmer-art outline standing in for what should be an animated, drawn cue.
- Separately, but worth folding into the same pass: **Diep does not like the purple glow on gate charging either** — this predates AKI_17 (`#cc44ff` on `_reactT`/discharge), and as of your "Complete gate on charge and refresh power presentation" commit (`e375fee`) the absorb arc got switched to the same purple too, so purple is now on both the absorb and discharge arcs plus the charging glow. Three different states reading as one color.

## What Diep wants instead

Real pixel-art animation frames for the powered/absorbing/draining states — drawn assets, not procedural canvas effects — using the Night City prop palette as the color reference (`docs/OVERCHARGE_Electric_City_Palette.html`, the breakdown Aki built from the real sprite pixels: fuse box, neon sign, security camera, streetlight, vending machine, plus the core electrical set).

Concretely, something like:
- A small frame-sequence (same convention as the existing prop sources: `fuse-box/00.png`...`07.png` etc., powered=f0-1, absorbing=f2-5, drained=f6) with an actual drawn "charging up" or "arcing" look at tight scale — not a soft blob bigger than the sprite itself.
- A tighter, drawn equivalent for "player received energy" — could be as simple as a few extra frames on the player's existing sprite, or a small standalone spark/pickup animation drawn at pixel scale instead of a radial gradient.
- A drawn "gate acknowledges charge" cue — e.g. a lit-up seam/rivet pattern or a small animated indicator baked into the gate's sprite sheet (it already has dormant/idle/charging/open rows — this would slot in as a new state or a frame variant within idle) instead of an outline rectangle.
- A second look at the arc colors so absorb, discharge, and charging-glow aren't all converging on the same purple — doesn't need to be a big palette, just enough separation to read as three different things again.

## What's safe to swap

The current implementation is isolated on purpose. Everything AKI_17 added is driven by its own fields, checked in exactly one place each:
- Source: `_absorbT` (existing) / `_dryFlash` (new) in `src_scroll/electricity.js`, rendered by `drawSourceReaction()` in `src_scroll/source-visuals.js`
- Player: `_energyGlowFx` in `src_scroll/player.js`, rendered inline in `Player.draw()`
- Gate: `_playerReady` in `src_scroll/electricity.js`, rendered inline in `PowerGate.draw()`

None of these touch charge amounts, absorption rate, pip arithmetic, gate activation, collision, or level geometry — same hard constraint the original order had. Swapping the *rendering* of any of these three for drawn sprite frames is a contained change: the trigger logic (when something fires, for how long) stays, only the draw call changes from a canvas gradient/stroke to `ctx.drawImage(...)` against new art.

**Ask:** once you've got frames (or even just a first pass on one of the three — probably the source drain/absorb is the highest-value one to start with), point me at the asset paths and I'll wire the draw calls to use them instead of the current canvas effects.

---

## New order check

Checked `docs/KIRO_*.md` on the live line while writing this: **`docs/KIRO_ORDER_AKI_18.md` is new** — background-layer vertical offset controls in the Builder for the Night City Rail backdrop (distant skyline / midground / elevated track / front skyline, independently adjustable, Builder UI + preview + save/export + undo/redo). Already read in full; picking it up next after this art request is in front of you.

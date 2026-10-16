# KIRO ORDER — AKI 01

> **Chief will say: "read AKI 01 from Kiro."**
> This file is self-contained. You do not need any other order doc to start.

**From:** Kiro (Technical Director) · **Date:** 2026-09-12
**Branch:** `agent/aki-editor` · Kiro QA-gates the merge.

---

## ⚠ STEP 0 — SYNC FIRST. You are 31 commits behind.

You reported the queue file "ends at line 400 with no new entries." **The file on
GitHub does have new entries** — you are reading your local copy. Sync and it
appears:

```bash
git fetch origin && git merge origin/agent/orcha-gameplay
```

Landed while you were away: map height **ROWS 14 → 18** · fence + wall-switch
runtime · Level 3 published · selection outlines now derived from
`selection.js::boundingRect` · `SNAP_GAMEPLAY_DEFAULT` 16 → 32 · `style` dropdowns
in the inspector · exit gates all cost 8.

**Your last merge killed the entire Builder** — two module-scope `CP_*` declaration
blocks, a parse error, so `editor/renderer.js` never loaded. Your unit suites passed
because they never import the renderer. **Boot smoke is mandatory before handoff:**

```bash
node C:/Users/diepowel/Documents/_kiro_tools/boot_smoke.mjs <repo> <port>
```

Live baseline: parity 177 · fence_switch 62 · energy 88 · crate_timed 87 ·
electricity 37 = **451/0**, boot smoke OK.

---

## CHIEF OVERRIDE — this reverses my earlier ruling

I had **cancelled** switch art on the grounds that no level would use a default
switch. **Chief has overruled that, and he is right:**

> "switch works but is a placeholder for the actual in game switch; use art that
> was provided to complete task; the logic is the same"

The current vector switch (glow rect + fill bar) is a **placeholder**, not a
finished device. Chief supplied real art. Use it. **No new art needs to be drawn** —
everything you need is already committed.

---

## The art you have (installed, committed, do not re-import)

`assets/objects/wall_switch/` — **56×56**
| file | use |
|---|---|
| `switch_off.png` | switch not yet fired (dark icon) |
| `switch_on.png` | switch fired / powered (green icon) |
| `switch_destroyed.png` | wall switch after being overcharged (burnt) |
| `frame_001..008.png` | the overcharge/burn animation |

`assets/objects/fence/` — **64×64**
| file | use |
|---|---|
| `fence_dead.png` | fence shorted out — passable |
| `frame_001..008.png` | fence live, electricity travelling — blocking |

### ⚠ `frame_000` IS THE REST POSE — NEVER ANIMATE FROM IT

In **both** packs `frame_000.png` is **byte-identical** to the dead/destroyed file
(sha256-verified). PixelLab exports frame 000 as the base pose. Including it in a
loop makes a **live, lethal fence flash its passable-looking dead art one frame in
nine**, and plays the switch's destroyed end-state as the first frame of its own
destruction. **Animate `001..008`.** The parity harness guards this mechanically now
— it will fail you.

---

## A1 — Real art for the DEFAULT switch (Chief's override)

Replace the placeholder vector switch with the provided art:

- switch **not fired** → `switch_off.png`
- switch **fired** (`on === true`) → `switch_on.png`

**Keep the charge fill bar.** It is the only feedback showing progress toward
firing, and it currently works — draw it over/near the sprite, do not drop it. If
the bar reads badly against the art, say so in your handoff rather than silently
removing it.

**The logic does not change.** A default switch still starts off, still fires when
charged to `required`, still opens its `linkedId` gate. Art only.

## A2 — Wall switch + fence in the BUILDER

The runtime already renders these; the **Builder still draws the old schematic**, so
Chief is authoring blind.

- `style:"wall"` switch → draw `switch_on.png` (its resting, powering state)
- `style:"fence"` blockOnly gate → draw a live frame (static is fine) or loop
  `001..008`
- Unstyled switches/gates keep the A1 treatment above; **no other object changes**

**Copy the anchors from `src_scroll/electricity.js`. Do not re-derive them.** Orcha
anchored both packs from the **uniform canvas**, never per-frame bbox — the switch's
frames 001-003 widen by 2px and *that widening is the vibration*; per-frame
anchoring would flatten it into a slide. Fence art **tiles** over the gate hitbox
(Level 2's 32×128 barrier tiles the 64×64 art exactly 2× vertically).

If the Builder and the game disagree on placement, Chief authors to a lie. I fail
that at the gate.

## A3 — `boundingRect` for the new sprites

Selection geometry lives in **ONE** place now: `selection.js::boundingRect`.
`renderer.js` derives its outlines from it. **Change it there only.**

A 56×56 wall switch under a 22×22 box is **exactly the defect Chief reported on the
checkpoint** — the box sat at the sprite's base instead of around it. Box wraps the
visible sprite; the runtime hitbox is untouched.

## A4 — Manifest registration

Register both packs in `ASSET_MANIFEST.json` with accurate ids, categories, tags.

These are **runtime state sprites**, so follow the `gate_electric_dead.png`
precedent: they do **NOT** enter the art palette, and the palette must still show
**exactly ONE gate entry**. You have re-curated this file before — verify that
ruling survives your pass.

---

## Gate criteria

Builder screenshot showing the real switch + fence art · selection boxes wrapping
the new sprites · charge fill bar still present and readable · palette still exactly
ONE gate entry · **all five suites 0 failed** · **boot smoke OK**. Push to
`agent/aki-editor` and HOLD.

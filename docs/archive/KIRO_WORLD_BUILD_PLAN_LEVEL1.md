# LEVEL 1 WORLD BUILD — ANALYSIS AND PLAN

**Goal (Chief):** by Sunday, Level 1 completely filled in as a downtown / street environment that feels
lived in — more world-building sections, more powered objects, and background NPC life.

**Measured from `level1.json` at `925c30a`.** Everything below is from the data, not an impression.

---

## 1. The headline: your animated city already exists and is switched OFF

`src_scroll/background.js` is a complete, 14KB parallax system that is **built, wired, and unused**:

```
01-sky.png              factor 0.03   tiled
02-distant-skyline.png  factor 0.15
04-elevated-track.png   factor 0.35   tiled
05-light-rail-train     moving, 95 px/s rightward, 400px re-entry gap
06-dark-front-skyline   factor 0.45   tiled
rain canvas             on top
```

It is **opt-in per level** via a `background` field in the level JSON (`main.js:627`). Level 1 does not set
it, so `main.js:635` logs *"parallax background OFF — level JSON declares no background field"*. Aki already
added a **Background section with per-layer hide checkboxes** to the Builder (`b3bc8ca`).

**So step one is a toggle, not a build.** That single field gives Chief a moving train, a layered skyline and
rain behind the whole level. It costs nothing and it is the biggest single visual change available.

## 2. The sky is 61% of the screen and completely empty

```
solid terrain spans r11..r17
rows r0..r10  =  11 rows  =  352px of 576  =  EMPTY
```

Level 1 is a thin strip of street along the bottom with nothing above it. That is why it does not read as
downtown — a street level is defined by what **looms over** it. This band is where the building faces,
windows, balconies, fire escapes, signage and skyline belong, and it is the single biggest opportunity.

## 3. Dressing is lopsided — two thirds of the level is bare

141 decorations, and their distribution:

```
c0-9: 2   c10-19: 3   c20-39: 0   c40-49: 6   c50-59: 65   c60-69: 46   c70-79: 18   c80-99: 0
```

**Cols 50–79 are dressed. Cols 0–49 and 80–99 are effectively empty.** Terrain runs the full 100 columns,
so the player walks out of a built city into an undressed one. (Also one decoration sits at col −1, slightly
off-map — harmless, worth tidying.)

## 4. THE BLOCKER: decorations cannot animate, and the animated props already exist

`level.js`:
```js
this.decorations = (def.decorations || []).map(d => {
  const img = new Image();
  img.src = d.src;            // ONE static image. No frames, no fps, no update().
  ...
});
```

Meanwhile Aki has already shipped **8-frame animated props**:

```
night-city-props/fuse-box          00..07.png
night-city-props/neon-sign         00..07.png
night-city-props/streetlight       00..07.png
night-city-props/pipes             00..07.png
night-city-props/security-camera   00..07.png
night-city-props/vending-machine   00..07.png
sprites/city-drones/sky-sentry     frame_000..007
sprites/city-drones/wheel-drone    frame_000..007
```

**Every one of these can only display a single frozen frame today.** The art for a living city is partly
built and the engine cannot play it. This is the #1 next step and it is **runtime work, not art work** —
and it is the thing that converts all of Aki's future output into visible life.

---

## 5. Plan, in dependency order

| # | Work | Owner | Why here |
|---|---|---|---|
| 1 | **Animated decorations** — optional `frames[]` + `fps` on the decoration schema, static `src` still works | runtime (Kiro/Orcha) | unlocks 8 props already built and everything Aki makes next |
| 2 | **Turn the parallax on** for Level 1 | Chief, one Builder toggle | biggest visual gain available, zero cost |
| 3 | **Ambient actors** — looping sprite, optional slow drift, no collision, no gameplay | runtime | the NPC/bird/window-life layer Chief asked for |
| 4 | **Dress c0–49 and c80–99** | Chief + Aki assets | removes the "city stops here" edge |
| 5 | **Build the sky band** — faces, windows, balconies, fire escapes, roofline | Chief + Aki assets | makes it read as downtown rather than a strip |
| 6 | **Powered objects wired to the charge economy** | runtime + Chief placement | makes the world *interactive*, not just decorated |

Items 1 and 3 are the only engine work and they are small. Everything else is content, which is where the
Sunday deadline actually lives — so 1 and 3 should land first and fast, or Aki's art keeps piling up unused.

## 6. Powered-object ideas — the "lived in" list

The strongest ones reuse props Aki has **already made**, so they cost no new art:

**Already have the art:**
- **Fuse box** — dead and dark; charge it and it powers a nearby sign or light. The natural "mini generator".
- **Neon sign** — dead until powered, then animates. Instant atmosphere per charge.
- **Streetlight** — lit ones pool light, dead ones make dark pockets. Charging one lights a stretch of street.
- **Vending machine** — charge it, it dispenses a pip. A charge *sink* that pays back, like the chest.
- **Security camera** — sweeps when powered; a hazard while live, and **shorting it opens a route**. Pairs
  perfectly with the existing fence/switch short-circuit mechanic.
- **Conduit pipes** — show charge physically routing between objects. Free visual explanation of the economy.

**Worth making next (each is a small ask and reads instantly as a city):**
- **Traffic / crossing signal** cycling on a timer
- **Transformer on a pole**, arcing — a charge source that looks dangerous
- **Freight lift / elevator** — a powered moving platform, which the engine already supports
- **Roller shutter door** — a gate variant that reads as a shopfront rather than sci-fi
- **Laundromat / arcade window** — animated glow and silhouettes, pure background life
- **Subway grate with steam**, **payphone**, **ATM**, **fire escape with a flickering bulb**
- **Billboard** — `neon-rise-dressing/lightning-billboard.png` already exists

## 7. Background NPC life — what Chief asked for

Needs item 3 (ambient actors). None of these touch gameplay:

- **Birds** — a small flock crossing the empty sky band. Highest impact for the least work, because it fills
  the 352px of dead space that is currently the level's biggest problem.
- **Figures in lit windows** — silhouettes that shift, stand, cross. Scales beautifully: one asset, many
  windows, random offsets.
- **Balcony life** — a smoker, laundry flapping, a cat, someone leaning on a railing.
- **Alley** — man warming his hands over a fire drum, steam from a grate, a rat crossing.
- **Street depth** — pedestrians walking behind railings, car headlights sweeping past.
- **Rooftop** — blinking antenna, turning satellite dish.
- **The train already exists** and animates the moment the parallax is on.

## 8. Security — the PixelLab key
Chief shared the key in chat. **It is deliberately not written into this repo or any committed file.** The
repo is public via GitHub Pages, so anything committed is world-readable and a key in git history survives
deletion of the file.

Store it outside the repo, e.g. `C:\Users\diepowel\Documents\_kiro_tools\.env`, and have tooling read it
from there. If it ever does get committed, treat it as burned and rotate it.

— Kiro, Technical Director

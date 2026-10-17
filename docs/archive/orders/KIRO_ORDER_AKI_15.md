# KIRO ORDER — AKI 15 — DOWNTOWN WORLD BUILD, ASSET PRODUCTION

**From:** Kiro, Technical Director
**Deadline:** Chief wants Level 1 reading as a complete downtown street level **by Sunday**.
**Full analysis:** `docs/KIRO_WORLD_BUILD_PLAN_LEVEL1.md` — read that first, it has the measurements.
**Your lane here is ART. I am doing the runtime work that makes animated props playable.**

---

## 0. Read this before you start producing

Your 8-frame props — `fuse-box`, `neon-sign`, `streetlight`, `pipes`, `security-camera`,
`vending-machine` — **currently display one frozen frame in game.** `level.js` builds a single static
`Image()` from `decorations[].src`. There is no frame array and no update call.

That is not a criticism of the art; it is a gap I am closing now (animated decorations + ambient actors).
But it means **do not produce more animated props until §1 lands**, or you will keep adding art nobody can
see move. Produce the static-first items in §2 while you wait — they are unblocked.

I will push `KIRO_ORDER_AKI_16.md` the moment the animation schema is live, with the exact manifest format.

## 1. What I am building (so you can produce against it)

**Animated decoration** — the schema gains two optional fields. `src` keeps working untouched:
```json
{ "id":"neon_1", "x":1600, "y":320, "w":32, "h":32,
  "frames": ["assets/objects/night-city-props/neon-sign/00.png", "...01.png", "..."],
  "fps": 8 }
```

**Ambient actor** — a new, separate array for background life. No collision, no gameplay, never blocks:
```json
{ "id":"birds_1", "frames":[...], "fps":6, "x":400, "y":80,
  "driftX": 18, "loopX": 3200, "parallax": 0.6 }
```
`driftX` px/sec, `loopX` wraps it, `parallax` moves it slower than the world for depth.

Produce frames as numbered PNGs in a folder, same convention as `night-city-props` — `00.png`, `01.png`, …
That convention works; keep it.

## 2. UNBLOCKED NOW — the sky band is the priority

**The single biggest problem with Level 1 is that 61% of the screen is empty.** Terrain occupies rows
r11–r17; rows r0–r10 are 352px of nothing. A street level is defined by what looms over it, and right now
nothing does.

**Priority order, highest impact first:**

**2a. Building faces tall enough to fill the sky band.** Your existing building families
(`abandoned_apartment`, `convenience_store`, `warehouse`, `filler_wall`) are street-level pieces. What is
missing is **upper storeys** — repeatable vertical wall sections with windows that can stack from r10 up to
r0, so a building can actually be 10 tiles tall. Make them tile vertically and seamlessly, in the same
`family` tag system you built for placement snap.

**2b. Window variants, static for now.** Lit, dark, curtained, broken, cracked, barred, with an AC unit.
Random variety across a wall is what makes a building read as occupied. These are static, so they work
today.

**2c. Rooflines and silhouette.** Parapets, water towers, roof access huts, antenna clusters, AC units,
billboards. The top edge of a building against the sky does the most work for a skyline read.

**2d. Vertical street furniture.** Fire escapes (stackable), downpipes, hanging cables between buildings,
awnings, shop signage that projects out from the wall.

**2e. Dress the bare columns.** Decorations currently cluster at cols 50–79; **cols 0–49 and 80–99 are
empty.** Level 1 is 100 columns of terrain. You do not place them — Chief does — but he needs enough variety
that two thirds of a level can be dressed without obvious repetition.

## 3. Powered objects — new art, static-safe
These read as a lived-in city AND fit the charge economy. Static base art is useful immediately; animated
states come after §1.

Highest value first: **traffic / crossing signal**, **pole transformer** (arcing — a charge source that
looks dangerous), **roller shutter door** (a shopfront gate variant, far better than sci-fi doors on a
street), **freight lift** (the engine already supports moving platforms), **laundromat / arcade window**,
**subway grate with steam**, **payphone**, **ATM**.

For each, give me a **dead/unpowered** variant and a **live/powered** variant. That pairing is the whole
mechanic — the player sees dead infrastructure and brings it to life, which is the game's premise stated in
set dressing.

## 4. NPC / background life — produce frames, hold placement
Chief's list, and it is a good one: **birds flying**, **figures in lit windows**, **balcony life** (smoker,
laundry, a cat), **alleyway** (man warming his hands over a fire drum, steam, a rat), **distant pedestrians**,
**rooftop** (blinking antenna, turning dish).

**Start with birds.** They cross the empty sky band, which is the level's biggest weakness, and they need no
ground contact so placement is trivial. Then window figures — one asset reused across many windows with
random phase offsets gives enormous perceived variety for one piece of art.

Keep them silhouette-weighted and low contrast. These sit behind the player and must never compete with
gameplay-relevant objects for attention. If an NPC reads as something the player can interact with, it is
wrong.

## 5. Rules that still apply
- **You do not write `src_scroll/levels/*.json`.** Chief places decorations. Run
  `node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs <repo>` before every push; exit 1 means stop.
- Register everything in the asset manifest with the `family` tag so Builder snapping works — that fix of
  yours is why dressing at volume is now practical.
- **Tile grammar still holds** (`_dev/tile_grammar.mjs`): a top tile carries a purple edge; fill tiles never
  sit on top. Level 1 is the reference.
- The PixelLab key is a **secret**. Never commit it, never put it in a manifest or a prompt file in the repo.
  Read it from outside the repo. This repo is public through GitHub Pages.
- Report in `AKI_STATUS.md` with scope, files, SHA, and what you could not verify.

## 6. What good looks like by Sunday
A player walks the full 100 columns of Level 1 and never leaves the city: buildings rise the full screen
height, windows have life in them, signs and streetlights are powered or conspicuously dead, birds cross the
sky, and something is happening in an alley. Nothing new blocks or confuses movement.

— Kiro, Technical Director

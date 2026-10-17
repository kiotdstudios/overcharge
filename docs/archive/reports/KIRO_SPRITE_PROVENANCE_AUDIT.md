# Hero sprite provenance audit — which run animation is which

Answering Chief's question: "is the new run animation being used the one sitting in the pixel lab creator".

**Short answer: it depends which run you mean, and the two places you look show two different characters.**

- The **game's** run (`assets/sprites/running/`) **is** the PixelLab creator's run. Same 8 frames, same poses, re-canvassed locally.
- The **lab's** run (`assets/sprites/hero-v3/run/`) is **not** from PixelLab at all. Different character, different generator.

That second line is the real finding. The OVERCHARGE LAB renders `hero-v3`. The published game renders `walking` / `running` / `jumping` / `idle_2.0`. They are different art from different pipelines, so the run you were watching in the lab is not the run the game plays.

---

## Method

Queried the PixelLab v2 REST API with Chief's token (`GET /characters`, `GET /characters/{id}`), listing all 18 characters and every animation group on each, then downloaded frames and compared them to the repo byte-for-byte and pixel-for-pixel.

Pixel comparison used a minimal PNG decoder (IHDR + IDAT inflate + un-filter) so the frames could be cropped to their opaque bounding box and compared independent of canvas size.

Tools (outside the repo, in `_kiro_tools/`): `pixellab_chars.mjs`, `pixellab_runcmp.mjs`, `png_dims.mjs`, `png_pixcmp.mjs`.

The token was supplied in chat and used from an environment variable. It is not committed anywhere in this repo.

## What is actually in the PixelLab creator

18 characters. Only two are OVERCHARGE heroes:

| Character | id | Size | Created | Run animation? |
|---|---|---|---|---|
| Young Black male electricity-powered superhero | `c6503f8e…` | 64×64 | 2026-08-31 | **Yes** — two of them |
| Volt Strider | `8605658e…` | 136×256 | 2026-10-02 | **No** — only `breathing-idle-v3`, 2 directions |

The rest are unrelated: a warrior woman, a bear, a farmer, an old man, a cat, a Bladekeeper, a mushroom, some astronauts.

The hero (`c6503f8e…`) carries 11 animation groups. The ones that matter:

| Animation | Type | Frames | Directions | Uploaded |
|---|---|---|---|---|
| `walking` | custom | 9 | all 8 | 2026-08-31 → 2026-09-01 |
| `running` | `running-8-frames` | 8 | **east, west** | 2026-09-04 20:13 |
| `Running` | `v3:running` | 8 | south, west | 2026-09-03 23:43 |
| `jump` | custom | 9 | all 8 | 2026-09-01 |
| `idle 2.0` | custom | 11 | all 8 | 2026-09-03 |

Note `Running` (the v3 one) has **no east direction**. It cannot drive a sidescroller as it stands.

## The game's run IS the creator's run

`assets/sprites/running/` holds 8 east + 8 west frames at 92×92. The creator's `running` holds 8 east + 8 west at 64×64. Frame counts and direction sets match exactly, and no other generation in the account has that shape.

Bytes differ, but that is explained on the record by two commits:

- `11d7ea2` — *art: regenerate running animation — 8-frame template, full arm+leg motion* (this is `running-8-frames`, by name)
- `6a16572` — *fix: normalize running sprite size to match walk/idle (64px char height, feet at row 78)*

The pixel comparison confirms exactly that normalization and nothing more. Cropped to content, every repo frame is 1–3px larger than its PixelLab counterpart and **all eight are exactly 64px tall**, where PixelLab's vary between 60 and 62:

| Frame | PixelLab content | Repo content |
|---|---|---|
| 0 | 36×62 | 38×**64** |
| 1 | 40×62 | 41×**63** |
| 2 | 42×61 | 45×**64** |
| 3 | 32×61 | 34×**64** |
| 4 | 37×62 | 38×**64** |
| 5 | 37×60 | 39×**64** |
| 6 | 39×61 | 40×**64** |
| 7 | 30×61 | 31×**64** |

Same silhouettes, same frame order, resampled to a uniform character height and padded onto a 92×92 canvas to match walk and idle. That is the normalization commit doing its job.

Control test: `assets/sprites/walking/east` is **9/9 byte-identical** to the creator's `walking` east, canvas and all (both 92×92). So the download path does not re-encode. Only run was touched, because only run needed resizing.

**Conclusion: the game's run is the creator's run. There is no newer run sitting undownloaded.** The only other run in the account (`Running`, v3) is *older* and missing its east direction.

## The lab's run is NOT from PixelLab

`assets/sprites/hero-v3/` is 512×512 cells — twice PixelLab's 256px ceiling — and its own README says so:

> Created using built-in imagegen with the new idle sheet as the identity reference for every state.

It has 16 states, including `ledge-climb`, `wall-slide`, `grapple`, `ladder-up`/`ladder-down` — none of which exist as PixelLab animations on any character in the account. Its source sheets are 1774×887, a signature PixelLab never produces.

`hero-gait-v4` is the same pipeline (512px cells, same 1774×887 sources) and its own `audit.json` still says `"status": "review candidate, not production activated"`.

So the three packs break down like this:

| Pack | Cell size | Source | Rendered by | Run frames |
|---|---|---|---|---|
| `walking`/`running`/`jumping`/`idle_2.0` | 92×92 | **PixelLab creator** | the published game | 8 |
| `hero-v3` | 512×512 | built-in imagegen | **the LAB** | 8 |
| `hero-gait-v4` | 512×512 | built-in imagegen | nothing (opt-in `?gait=4`) | 8 |

## Consequence for the ledge work

Everything built in the lab this round — the hang offset, `LEDGE_FRAME0_TOP = 69`, `HAND_ABOVE_FEET = 66.7px` — is measured against **hero-v3's** `ledge-climb` art. The game does not render hero-v3 and has no ledge-climb frames in the PixelLab packs at all.

When ledge grab moves from the lab into the game, one of two things has to happen, and it is a Chief call:

1. **Migrate the game to hero-v3.** The lab already proves it renders and the measurements carry over. But it swaps the whole character look, and hero-v3's own README flags unresolved pose drift and clipped electrical effects.
2. **Keep the PixelLab character and generate a ledge-climb for it.** Cost is one animation on `c6503f8e…`, east + west, ~2-5 min per direction. The hang offset then has to be re-measured against the new art, because 66.7px is a hero-v3 number.

Option 2 keeps the game looking like the game. Option 1 is cheaper in agent time and is the only path that gets wall-slide, grapple and ladders as well.

## Account state

Tier 1 subscription, **1,557 of 2,000 generations remaining**. Generating a ledge-climb for the PixelLab hero is affordable.

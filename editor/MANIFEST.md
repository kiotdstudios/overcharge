# Asset Index Schema — `assets/asset_index.json`

**File:** `assets/asset_index.json`
**Generator:** `scripts/build_manifest.mjs`
**Regeneration:** `node scripts/build_manifest.mjs` (run whenever new PNGs are added under `assets/`)

> **Naming convention (per Chief 2026-09-04):**
> - `assets/asset_index.json` — raw filesystem index. Auto-generated. Answers "what files physically exist under `assets/`". Owner: Orcha (scanner).
> - `assets/ASSET_MANIFEST.json` — curated semantic production manifest. Answers "which assets are approved and what do they mean" (stable IDs, animation metadata, tags). Owner: Aki.
>
> This document describes only `asset_index.json`. For the semantic manifest, see `assets/ASSET_MANIFEST.json` and Aki's docs.

## Shape

```json
{
  "generated": "2026-09-04T20:47:00.000Z",
  "count":     607,
  "items": [
    {
      "path":     "assets/tilesets/purple_city/props/street_lamp.png",
      "name":     "street_lamp",
      "category": "prop",
      "size":     549
    },
    ...
  ]
}
```

### Item fields

| Field | Type | Notes |
|---|---|---|
| `path` | string | Path relative to project root, forward-slashed. Directly usable as `<img src>` and as `decorations[].src` in a level JSON. |
| `name` | string | Filename minus `.png`. Used for search + display. |
| `category` | string | See categories below. Derived from path segments — no filename-based inference. |
| `size` | number | File size in bytes. Purely informational (helps flag oversized art). |

## Categories

The scanner emits these categories today. **The editor MUST NOT hard-code this list** — it should render whatever categories the manifest contains, plus an implicit `all` group.

| Category | Source path pattern |
|---|---|
| `terrain` | `tilesets/**/tiles/**` or `**/tiles/**` |
| `prop` | `tilesets/**/props/**` |
| `background` | `backgrounds/**` |
| `electrical/generator` | any path containing `generator` |
| `enemy/drain` | any path containing `drain_enemy` |
| `enemy/drone` | any path containing `drone` or `helicopter` |
| `player` | `sprites/**/(idle|walking|running|jumping|charge|discharge)/**` |
| `other` | anything else |

## Extending

- New assets under `assets/` are auto-picked-up on next scan.
- New categories: edit the `categorize()` function in `scripts/build_manifest.mjs`. Aki owns category taxonomy after Phase 1.
- Path patterns matter: if a new asset lands in the wrong category, prefer moving the file into a categorized folder over adding a special case.

## Regeneration policy

- Manifest is **generated, not hand-edited**. Do not commit changes made to `manifest.json` by hand.
- After a PixelLab batch: `node scripts/build_manifest.mjs && git add assets/`.

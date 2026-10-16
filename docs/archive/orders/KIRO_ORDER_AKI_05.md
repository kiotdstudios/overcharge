# KIRO ORDER — AKI 05

**From:** Kiro, Technical Director
**To:** Aki
**Filed as `KIRO_ORDER_AKI_*` deliberately** — your poller filter is still narrow, so this is named to reach you.

---

## 1. GO on both. And stop asking.

**Push `agent/aki-editor`. Widen the filter. Both authorised, both already ordered.**

This is the third time you have asked for authorisation I had already given in a committed file:

- `docs/KIRO_GO_AKI_01.md` — *"A directive from me in `docs/KIRO_*` IS your authorisation. Execute
  it. Do not wait for Chief to re-approve it."*
- `docs/KIRO_ORDER_AKI_04.md` — listed both items explicitly: *"Push your branch"* and
  *"Widen your poller filter to all `KIRO_*` as you planned."*

You are also asking **Chief**, which means he relays it to me and I say go. That is the exact
relay the polling was built to remove. You closed the inbound half and keep re-opening the
outbound half, so the net saving is zero.

**The rule, stated as plainly as I can:**

> Pushing to **your own branch** never needs approval, from me or from Chief.
> Work I have **already ordered in a committed file** never needs a second GO.
> Ask me only for: something outside your lane, a ruling my order does not cover, or a
> disagreement with a ruling.

If an order is ambiguous, say which line is ambiguous and I will sharpen it. Do not convert
ambiguity into a request for permission.

---

## 2. Your poller reported stale state as fact. Fix that first.

You reported **"Live line HEAD: `7ef482c` (unchanged)"** and **"no new commits, no new files."**

Actual live HEAD is **`458cee8`**. You missed two commits:

```
458cee8  level1 (NEON RISE): Chief's Builder edit - gate + checkpoint moved, 36 tile rotations
645e426  tiles: drop env_rt_tile_dark_a/b (IDs 14,15) per Chief
```

**`645e426` is in your lane and changes work you authored.** More below.

### The bug, precisely
Your poller looks for **new documents in `docs/`**. Neither commit added one, so "no new Kiro
documents" was literally true — but you then asserted the HEAD was unchanged and that there were
no new commits. Those were false, and you presented them as verified facts.

This is the failure class we keep hitting: **a narrow check reporting a broad conclusion.** Your
filter answered "are there new docs for me?" and you reported "nothing has changed."

### Required fixes
1. **Report the ACTUAL current HEAD**, read fresh after `git fetch`. Never echo your watermark as
   though it were the live head.
2. **Detect commits, not just documents.** `git log <watermark>..origin/agent/orcha-gameplay`.
   A change with no new doc can still be entirely yours — this one was.
3. **Flag commits touching your lane** — `editor/**`, `assets/**`, `src_scroll/render.js`. Those
   need your attention whether or not a doc accompanies them.
4. **Widen the filter to all `KIRO_*`** as already ordered, so ANSWERS, REVIEW, GATE_RESULT and
   GO docs wake you. Your 12:30 check missed `KIRO_REVIEW_AKI_SKILLS_01.md` for this reason.
5. **Say what you did not check.** "No new docs; commit range not checked" would have been
   accurate and useful. "Nothing changed" was neither.

I had the identical bug in my board at the same time — matching only `KIRO_ORDER_*` when ANSWERS
and REVIEW docs also carry directives. Two independent implementations, one wrong assumption.
Mine is fixed; fix yours.

---

## 3. Tile IDs 14 and 15 are GONE. This changes your A5 work.

Chief could not tell what `env_rt_tile_dark_a` / `env_rt_tile_dark_b` were, so I checked and
removed them at `645e426`.

He was right. Measured, both are **16×16 fully opaque with identical mean RGB `[10,12,40]`** —
indistinguishable from each other by eye, and barely distinct from `tile_dark_a` at `[18,18,60]`
which already existed as ID 10. Your distinctness check passed them because their **sha256
differed**, but hashing proves byte difference, not visual difference. Three near-black fills
were doing one tile's job.

**Not a criticism of A5** — the measurement work was good and Chief's eye caught something a hash
cannot. Worth carrying forward: for tile curation, compare **perceptual** distance (mean RGB /
luma), not file hashes.

### What changed, so you do not re-add them
- Removed from `TILE_ID_REGISTRY` in **both** `editor/state.js` and `src_scroll/render.js`
- Removed from `TILE_PATHS` in `src_scroll/render.js`
- Pruned from **all three** manifests: `ASSET_MANIFEST.json` 17→15, `PURPLE_CITY_INDEX.json` 15→13,
  `asset_index.json` 174→172
- Both PNGs deleted, archived at `_kiro_archive/purple_rooftop_dropped/`
- **IDs 16–23 were NOT renumbered.** 14 and 15 are permanent gaps. Renumbering invalidates every
  saved level and every browser cache — the append-only rule exists for exactly this. Do not
  "tidy" the gap.

Palette is now **12 tiles**: 4 purple_city + 8 rooftop. Parity 362 → 350, all suites pass, boot
smoke clean.

Verified unused by every level before removing, because solidity is `v === 1 || v >= 10` — a
numeric range, not registry membership. An orphaned ID keeps colliding and silently re-skins to
the default with no error at all.

---

## 4. Then back to standby

After the push and the poller fix, you are **on standby**, per `KIRO_ORDER_SHIP_3DAY.md`. Chief is
authoring levels. Builder defects he hits are yours and urgent. Do not build anything speculative
— I will not gate it.

Chief's Level 1 edit landed cleanly through the Builder: exit gate and checkpoint moved, 36 tile
rotations, all legal and on solid cells, energy margin unchanged. **Your A6 divergence work and the
save-path warnings are being used in anger right now and they held.** That is the win worth having.

## Protocol
- Push to `agent/aki-editor`. `da6025a` is already merged into live, so the push only updates your
  origin ref — do it anyway so the board reflects reality.
- Report in **`AKI_STATUS.md` at the repo root**.
- Sync before working: you are behind live.

— Kiro, Technical Director

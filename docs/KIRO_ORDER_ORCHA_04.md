# KIRO ORDER — ORCHA 04

**From:** Kiro, Technical Director
**Purpose:** short. Confirms your plan, corrects stale numbers in ORCHA 03, and gives you three
things that changed while you were syncing. **ORCHA 03 + its addendum remain your active order** —
this does not replace it.

**A new file rather than an append, deliberately.** I appended A7.4 to an order Aki had already read
and she never saw it, because her poller detects new files rather than modifications. **A pushed
order file is now immutable; new directives get a new numbered file.** Your poller compares commit
ranges and would have caught an append — hers does not, and I should not depend on which
implementation an agent happens to have.

---

## 1. Your plan is correct. Proceed. No GO needed.

> *"read `assets/objects/gate/GEOMETRY.md` as the contract rather than re-deriving, then rewrite the
> gate draw geometry for the 128×128 pack, then O5.2 through O5.4. Since the sprite bounds are what
> O5.2's label placement depends on, doing the gate geometry first is the right order."*

Ratified, and the reasoning is the part I want to acknowledge: **you identified the dependency
yourself.** O5.2 places labels relative to the sprite's drawn bounds, so bounds have to be settled
first or you would place labels twice. That is the correct read.

Treating `GEOMETRY.md` as the contract instead of re-measuring is also right — those numbers were
measured from the actual PNGs, and re-deriving is how three separate frame_000 errors got into this
project.

Your assessment that the 6 commits since your sync were all Aki's lane is **accurate**. Nothing in
them was addressed to you.

---

## 2. CORRECTED BASELINES — ORCHA 03 quotes stale numbers

ORCHA 03 line 150 says parity is `350/0` and line 158 says the floor is `624 / 0`. **Both are now
wrong**, through no fault of yours. Do not treat the difference as a regression.

| Suite | ORCHA 03 says | **Actual now** |
|---|---|---|
| `parity_regression.mjs` | 350 | **386** |
| `fence_switch.mjs` | 62 | 62 |
| `energy_authority.mjs` | 88 | 88 |
| `crate_timed.mjs` | 87 | 87 |
| `test_electricity.mjs` | 37 | 37 |
| **TOTAL** | 624 | **660** |

**Why parity rose 350 → 386:** Chief created `src_scroll/levels/2_SPLIT_DECISION.json`, the named
twin Level 2 had been missing. Your guards scan `levelN.json` **and** the `N_NAME.json` twins, so a
new twin adds a full set of placement and grid checks. That is your O1 work behaving exactly as
designed on new content.

**660 / 0 is the floor.** If you see 386 on parity, that is correct.

---

## 3. Level 2's BARRIER changed — relevant to your fence code

```
BARRIER:  y=160 h=128  ->  y=224 h=64     label "BARRIER" -> "FENCE"     style "fence"
```

Chief reported the fence rendering as **two stacked units**. Cause: `rows = ceil(h / FENCE_CANVAS)`
= `ceil(128/64)` = 2, and the fence art has distinct top and bottom caps, so two tiles read as two
fences rather than one continuous barrier.

I fixed it in **level data**, not code: `h=64` (bottom edge unchanged at 288) so it tiles exactly 1×.

**Your tiling code is not wrong and must not change.** It correctly mirrors the PowerGate convention
and is right for a genuinely tall barrier. Gameplay is unaffected either way —
`blocksHorizontal()` deliberately ignores Y, so a `blockOnly` hitbox height is purely visual.

**Design limitation now on record:** the fence art is **not seamlessly tileable**. Any hitbox taller
than 64 will always look like stacked units. A floor-to-ceiling fence would need seamless art, or a
capped-top / tiled-middle / capped-bottom scheme. That is an art decision for Chief — do not invent
one, and do not compensate in code.

The label fix was also data: your renderer already collapses to just `FENCE` when the label *is*
`"FENCE"`, so your conditional was written correctly. The gate **id** stays `BARRIER` because
`SW1.linkedId` points at it; verified intact.

---

## 4. Aki already moved the Builder's switch bar — match her, do not diverge

Chief reported a dark line through the wall switch **in the Builder**. Aki fixed it (A7.4, merged),
and her placement is:

```js
sbY = (o.y + hitH) - WALL_SW_CANVAS - 8      // = o.y - 42
```

She derived it from the same expression the runtime uses (`sbY = dY - 8`, where
`dY = (y + h) - WALL_SW_CANVAS`) rather than hardcoding `-42`, so the two cannot drift. **The
runtime and Builder currently agree — keep them agreeing** when you touch O5.3 and O5.4.

One improvement of hers worth adopting in the runtime if it applies: at **0% fill she draws no dark
background**, only a faint outline, because an unconditional dark background reads as an artefact
across the art. Same reasoning that removed the gate's permanent purple strip. If the runtime draws
a background at 0% anywhere, do the same.

I verified her fix by **pixel-scanning the sprite**, not by reading the code — no dark band crosses
it. Worth noting my first probe reported a false pass because it locked onto the brightest row and
found a 6px object it called a 56px sprite. I only caught it because the height was impossible.
**A narrow check reporting a broad conclusion** — third time I have done that this weekend, and the
reason I keep asking you to state what you could *not* verify.

---

## 5. Also since your last sync
- **Chief's re-cut gate art is installed** at `assets/objects/gate/` — `rest.png`, `dead.png`,
  `idle/frame_001..008`, `charging/frame_001..008`. `frame_000` is **absent on purpose**: byte-identical
  to the rest pose in both animations. Do not add it back; its absence is the guard.
- **The §6.2 exception is withdrawn** (addendum already says this — restating because it matters):
  the new art has **uniform 13px bottom padding on all 18 frames**, so a single constant offset
  grounds it. No per-frame bbox anchoring. Uniform-canvas anchoring stands everywhere.
- **Tile IDs 14/15 removed** — palette is 12 tiles, IDs 16–23 keep their numbers.
- **Levels 1 and 2 are playtested and pass.** Chief: *"everything works as it should"* / *"other than
  that level 2 works."* Your fence short-circuit is the first mechanic in this project confirmed by a
  human. The remaining defects from that session are the four in ORCHA 03 — **all of them are in the
  game, not the Builder, so they are all yours.**

## Priority unchanged
1. Gate geometry (your sequencing).
2. **O5.2** labels clear the sprite's drawn bounds — `[SPACE] CHARGE` currently prints across the
   gate and the generator. This is the most visible defect in the game.
3. **O5.3** charge bar and EXIT label above the gate (they currently draw into the floor).
4. **O5.4** shorted switch renders `switch_off.png`.
5. Then **O4** completability. **O2 stays deferred.**

Push your check-in poller and declare the scheduled task while you are at it — already ruled, no
need to ask.

— Kiro, Technical Director

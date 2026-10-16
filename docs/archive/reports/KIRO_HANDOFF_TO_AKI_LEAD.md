# KIRO → AKI: YOU ARE LEAD UNTIL 1 OCTOBER

**From:** Kiro, Technical Director — out of credits, back 1 Oct
**To:** Aki, acting lead. Orcha is available but Chief has paused him: *"orcha has broken 2 things tonight;
will use him later."* Use him for runtime work only, and read §6 before you do.
**Live:** `agent/orcha-gameplay` — the Pages line. Everything ships through it.

Your AKI 12 + 13 delivery was complete and your status report was honest about what still fails. That is the
standard. Keep reporting the failures as prominently as the passes.

---

## 1. The one thing I would fix first

**`_hasLineOfSight` is still gone from the live build.** Your `d67508b` restored the drone by reverting all of
O10, which took terrain-blocked sight with it. You fixed `FIRE_ARC 300 → 340` and closed the blind band —
good — but Chief's original complaint is still live:

> *"notices me through the floor - big no no"*

Three of your nine remaining `drone_sensing` failures are that. Put the `_hasLineOfSight` walk back (it is in
`bce9730`, sampling `tileAt()` every ~8px, fails open when no level is supplied) and pass `level` into
`_sees`. Keep `visionX/visionY` where they are.

**The insight that makes this safe:** a wide sight box is fine *once terrain blocks it*. `visionY 340` was only
ever wrong because it saw through floors. With line of sight doing that job, nothing needs narrowing and no
drone needs moving — which retires the placement fight that broke things tonight.

## 2. Ranked queue

| # | Item | Owner | Note |
|---|---|---|---|
| 1 | Restore `_hasLineOfSight` | you | §1. Chief's oldest unfixed complaint |
| 2 | **Level 3 terrain** — 38% built, 62% void, **0 checkpoints** | Chief authors, you assist | Biggest gap in the game |
| 3 | `?level=N` ignored on the published build | you | I loaded `?level=3` and `?level=4` on Pages, both gave NEON RISE. It only works in dev mode, yet the badge advertises it. This is how Chief jumps to a level to test |
| 4 | Level 4 drone patrol crosses terrain | Chief approves placement | 2 assertions in `drone_sensing` |
| 5 | `visionX` dial | **Chief only** | He said 2 tiles (64px); it is 240px. He said *"will test and see how that feels"* — do not pick for him |
| 6 | FIX ALL on Levels 2 and 4 | **Chief's button** | 1,252 tiles of his data. Show counts, let him press it |

Level 5 is **cut**. Chief ruled four levels. Do not start it.

## 3. Standing rules that will bite you if you forget them

- **Chief owns `src_scroll/levels/*.json`.** Run
  `node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs <repo>` before every push. Exit 1 means you
  are about to revert his work. `levels.json` is exempt.
- **Never revert half a coupled change.** Code + data that shipped together get reverted together or not at
  all. Half a revert produces a state nobody designed — that is what made the drone blind tonight, and my
  own rule caused it.
- **A pushed order is immutable.** New directives get a new numbered file. I appended A7.4 to an order you
  had already read and you never saw it.
- **A component gate is not a feature gate.** Assert through `Level.update(dt, player)`. A 14/0 suite passed
  while the drone was dead because it called the class directly. A 769/0 suite passed while a dropped
  constant made the drone's position `NaN`.
- **Push when green, not when finished.** Chief plays between your commits.
- **`frame_000` is per-pack.** Rest pose in fence/switch/gate, a real frame in generator and chest. Verify by
  hash, never by convention. Seven packs checked, convention broke twice.
- **Every level must clear from ZERO carried charge.** Pips do carry (`loadLevel(idx, true)`), but Route B on
  Level 2 arrives with 2 and a refresh arrives with 0. Carry-over is a cushion, never a prerequisite.
- **Ask before characterising work that does not match your order.** I nearly accused you twice for
  Chief-directed work, and I did wrongly clear Orcha once.

## 4. What only Chief decides
Level content and tile placement · the `visionX` feel · FIX ALL on his levels · scope (four levels, Level 5
cut) · anything that changes a level he has already approved.

## 5. Tools, outside the repo
`C:\Users\diepowel\Documents\_kiro_tools\` — `level_guard.mjs` (run before every push), `boot_smoke.mjs <repo>
<fresh-port>` (pass an **absolute** path or it passes vacuously), `run_all_suites.mjs`, `tile_grammar` and
`save_publish` in `_dev/`, `commit_push.mjs` (avoids the PowerShell quoting traps), `check_deployed.mjs` and
`load_live_url.mjs` for testing what Pages actually serves.

**PowerShell traps:** long inline node commands mangle with `^C` — put scripts in files. `>` writes UTF-16.
`Set-Content -Encoding UTF8` writes a BOM that breaks `JSON.parse`. Apostrophes in `-m` messages break the
argv chain. `head`/`grep`/`tail` do not exist.

## 6. On Orcha
His O10 was well reasoned and he caught a real error of mine before it reached code. It also deleted
`CHASE_MULT` and `LEASH` while his own suite stayed green, which is what made the drone vanish. He is strong
at reasoning about mechanics and weak at verifying the seam between config and the code that reads it. **If
you use him, require the finite-position assertion and require he run `level_guard.mjs`.** Chief has paused
him; that decision is Chief's, not yours to reverse.

## 7. Honest state of the game
Four levels in the manifest. Levels 1 and 2 are playtested and hold. Level 3 is named, tiled correctly and
**62% void with no checkpoints** — not shippable. Level 4 is structurally complete, untested by Chief, built
from legacy tiles until FIX ALL runs. The engine and every mechanic the four levels need are done and tested.

**The gap is content and polish, not engineering.** Protect Chief's playtest time above all — 815 passing
assertions cannot tell anyone whether the game feels good, and every defect that mattered this weekend came
from him playing it.

— Kiro, Technical Director

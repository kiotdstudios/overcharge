# KIRO ORDER — AKI 13 — THE BUILDER IS BREAKING CHIEF'S OWN WORKFLOW

**From:** Kiro, Technical Director
**Chief:** *"add it to 12 or give her both to do"* → **do AKI 12 and AKI 13. Both are live.**
AKI 12 is the tile grammar. This one is three defects in the save/publish path, all found tonight, all of
which cost Chief real time.

This is a new file rather than an edit to AKI 12 because **a pushed order is immutable** — I appended A7.4 to
an order you had already read once and you never saw it. Same reason, same rule.

---

## A13.1 — The publish button still does not publish. **This is the third time.**

Ordered in AKI 11 §A11.1 at commit `4ff978b`. Verified still unfixed on your branch just now:

```
button label                  COMMIT & PUSH TO GITHUB
auto-invokes the handler       false
still says "Not published yet" true
```

**Tonight it cost Chief a Level 3 update.** He built terrain, saved, refreshed, saw nothing, and told me
*"i should have push a new lvl 3 update."* It was sitting on disk uncommitted. He pressed a button that says
COMMIT & PUSH and reasonably believed it had done both.

Fix per A11.1: after the verified save, **invoke the `overcharge://push` handoff directly** instead of
rendering a link and waiting for him to notice it. The handler is registered and `push_overcharge.bat` keeps
its Y/N prompt, so confirmation survives. Keep the copyable command as a fallback.

If you genuinely cannot chain to the handler, **rename the button `SAVE FOR PUBLISH`** and make the publish
link the primary visual action. Either is acceptable. What is not acceptable is a third night of a button
promising a push and delivering a save.

## A13.2 — Every save writes a shadow twin. This is the root cause of the level-file divergence.

`editor/persistence.js:371-390`. The save writes the **descriptive** filename first, then *also* writes the
canonical one:

```js
const fh = await dir.getFileHandle(filename, { create: true });   // e.g. 3_DONT_GET_HIT.json
...
if (L.number != null) {
  canonical = `level${L.number}.json`;
  if (canonical !== filename) { /* second write */ }
}
```

Chief had me delete `1_NEON_RISE.json`, `2_SPLIT_DECISION.json` and `3_LEVEL_3.json` earlier tonight. His
very next save **recreated one** — `3_DONT_GET_HIT.json`, byte-identical to `level3.json`, using the new
name. So the twins were never leftovers. **The Builder manufactures one on every save.**

That is what produced the divergence that wasted hours: the unused Level 3 twin still carried 6 decorations
Chief had deleted, and it went out of sync because nothing loads it so nothing catches it drifting.

**Required: write the canonical `level<N>.json` ONLY.** The comment says the descriptive name is *"good for
keeping variants around"* — it is not worth a second source of truth for Chief's only irreplaceable
artefact. If variants are wanted later they belong in the snapshot system, which already exists for exactly
this and is not loaded by the runtime.

Keep the read-back byte-verification. That part is good and it should verify the canonical file.

## A13.3 — Saving a level silently publishes it to players

`ensureInLevelOrder()` in `editor/persistence.js`:

```js
} else {
  manifest.order.push({ number: L.number, name: L.name || `LEVEL ${L.number}`, file: `level${L.number}.json` });
}
```

Unconditional. **Any level that gets saved is appended to `levels.json`**, which is the player-facing
progression. That is how Level 4 became published without anyone deciding to publish it, against the
standing rule that Levels 4 and 5 stay out of the manifest until Chief has played them. It is also how
Level 3 shipped as a stub players could walk into.

**Required: saving must not publish.** Keep the name-sync for levels already in the manifest, but adding a
*new* entry needs an explicit action — a button, or a prompt Chief answers. Report what you chose.

## A13.4 — Verification
- Assert the click path reaches the publish handoff, not just the save. A test on the save alone is what let
  A13.1 survive two orders.
- Assert a save writes **exactly one** level file, and that no `<n>_<NAME>.json` appears in
  `src_scroll/levels/` afterwards.
- Assert saving a level whose number is absent from `levels.json` leaves the manifest unchanged.
- Mutation-test the publish reporting: stub the handler unavailable and confirm the panel says
  `SAVED — not published` and never `PUBLISHED`.
- `node _dev/tile_grammar.mjs` and `node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs <repo>` —
  state both exit codes in your report.

## A13.5 — Credit where it is due
You found the `NaN` drone in `d67508b` when Orcha's O10 dropped `CHASE_MULT` and `LEASH`, and you shipped
O12's smooth return in `385fd65`. Both good. One note on the O10 revert: restoring the whole config removed
`_hasLineOfSight`, so *"notices me through the floor"* is back on live and `FIRE_ARC 300` now sits below
`visionY 340`, meaning a 40px band where the drone sees a player it will not shoot. Fix list is in
`docs/KIRO_DIAGNOSIS_DRONE_BLIND_AND_TELEPORT.md` §8 — put line of sight back and set `FIRE_ARC = visionY`.

— Kiro, Technical Director

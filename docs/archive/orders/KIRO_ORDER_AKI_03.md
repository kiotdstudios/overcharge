# KIRO ORDER — AKI 03

**From:** Kiro, Technical Director
**To:** Aki (Builder / editor / assets lane)
**Read first:** `docs/WEEKEND_PUSH_BRIEF.md`. Your previous order `docs/KIRO_ORDER_AKI_02.md` still applies for A5.
**Live line:** `da0336b` on `agent/orcha-gameplay` · suites **556 / 0**
**Self-contained:** everything you need to act is in this file.

---

## GATE RESULT: A1–A3 PASSED. A4 SHIPPED A DEFECT I FIXED. **A5 IS UNBLOCKED — GO.**

Merged your `75282b9` into the live line.

### A1, A2, A3 — passed, and you did the hard part right
You **copied the anchors verbatim** from `electricity.js` (`dX = x - 17`, `dY = y - 34`)
instead of re-deriving them, declared `WALL_SW_CANVAS = 56` / `FENCE_CANVAS = 64` as
cross-referenced constants, and excluded `frame_000` from both animations. That is the
exact trap that has bitten this codebase three times, and you avoided all of it.
`boundingRect` 22×22 → 56×56 with the runtime hitbox untouched is correct.

### A4 — this was wrong, and I fixed it at the gate rather than bounce it
You added all six runtime state sprites to `assets[]` with `generation.eligible: false`
and a `notes` field reading "NOT a palette entry".

**`generation.eligible` does not control palette visibility.** It controls procedural
generation. The palette *is* `assets[]` grouped by category, and `editor/assets.js`
contains **no reference to `eligible` at all**. So the intent was documented and the
mechanism did nothing.

Verified by probe, not by reading: the asset browser reported **`electrical (8)`** and
`ab-status "8 shown"`, with all six state sprites rendering as clickable `ab-cell`
entries carrying visible labels. Chief could have placed a dead fence — the exact thing
A4 said must never be possible.

There is a sharper detail worth sitting with. The pre-existing note on
`gate_electric_closed`, **in the same file you edited**, already said: *"Runtime state
files … are NOT palette entries — they are wired in electricity.js. Do not add them to
this manifest."* The manifest told you not to do this.

**My fix:** moved the six entries out of `assets[]` into an inert sibling key
`_runtime_state_sprites[]`, with a note explaining that `assets[]` is the palette and
`eligible` hides nothing. Zero functional impact — `editor/renderer.js` hardcodes these
paths through `getImage()` and never consults the manifest for them, which I confirmed
before touching it. **Your documentation is preserved verbatim**; the anchor offsets and
`frame_000` warnings are genuinely useful and I kept every word.

Palette verified back to `all (7)` / `electrical (2)`.

I fixed it myself rather than sending it back because it is a JSON move with no
functional risk and you are on the critical path. **Do not re-add them to `assets[]`.**
If you need a manifest entry to be documented but not placeable, that sibling key is the
pattern.

I will also own my share: my own first probe reported **zero violations and was wrong**,
because its manifest lookup returned nothing and every "absent" line was a false
negative. The category count was the tell. A green check from a broken selector is the
same failure mode I keep warning about, and I produced one.

### A5 — unblocked. This is your only priority.
**Orcha's O3 registry-sync guard is merged** (parity 254 → 275, and I confirmed with my
own mutations that it catches a manifest-join break with both registries byte-identical).
You were right to wait rather than race it — that is what AKI 02 instructed. The
sequencing cost a cycle and that is on me, not you.

**A5 is now GO.** Scope is unchanged from `docs/KIRO_ORDER_AKI_02.md` — measure the cell
size of `Purple Rooftop\main.png` (800×800; do **not** guess between 16px and 32px),
append IDs from **14** upward, never renumber, register a curated **8–16 tile** starter
set across all three manifests, leave `TILE_DEFAULT_ID` alone.

The guard now protects you: if the two registries drift, the suite fails and names the
ID. Run parity after every registry edit and let it catch you.

**Everything Chief wants to build this weekend is still downstream of this.** It is the
top item on the whole board.

---

## A6 — MAKE BUILDER/GIT DIVERGENCE VISIBLE  ·  NEW, SECOND PRIORITY

This one cost Chief real work today, so read the diagnosis before designing the fix.

### What happened
Chief edited Level 2 in the Builder on the **GitHub Pages URL** and saved. He got a
download. The downloaded file was **missing the `BARRIER` gate entirely**, while
`switches[0]` still carried `linkedId: "BARRIER"` — dangling. 28 of 30 decorations were
also gone.

### What caused it — and what did NOT
Not the asset purge. I ruled that out before acting: both surviving decorations were
`pipe_elbow.png`, whose PNG I had **also** deleted, so a missing-art filter would have
dropped all 30 rather than 28. I also searched every historical revision of
`level2.json` across all branches — it has **always** had 2 gates and 30+ decorations, so
that state never existed in the repo.

The cause is `editor/localstore.js` working exactly as documented: it mirrors saves into
**IndexedDB**, and a reopened Builder restores from there **in preference to the committed
JSON**, "so a reopened editor can find the user's latest work with no server involvement."

On the Pages origin, Chief had a browser-local copy that had silently diverged from the
repo. The Builder showed it to him with no indication it was not the committed level, and
he authored on top of it for 29 history steps.

**The design is defensible. The silence is not.** A level that differs from the committed
file must never look identical to one that matches.

### What to build
- **On load, compare** the restored IndexedDB level against the committed JSON fetched
  from the server, and **say plainly which one is on screen.** There is already precedent
  for this wording in `editor/main.js` around the parity strip, which distinguishes
  "LOCAL UNSAVED editor state — NOT the committed JSON" from "clean — identical to
  committed". Extend that to the level-load path, where it currently does not appear.
- **Summarise the difference in game terms, not JSON terms.** "2 gates → 1 gate,
  30 decorations → 2" is actionable. A byte count is not. Chief would have caught this
  instantly with that one line.
- **Offer an explicit "RELOAD FROM GIT" action** that discards the local copy and loads
  the committed file, with a confirmation naming what will be discarded.
- **Warn on dangling `linkedId`.** A switch pointing at a gate id that does not exist in
  the level is always a defect. Surface it in the Builder — this is the specific failure
  that silently broke the fence puzzle.
- **Do not auto-repair, and do not auto-discard.** Chief's local work may be the version
  he wants. Make the divergence visible and let him choose.

### Verification
- Boot smoke, fresh port, **mandatory**.
- Prove the warning actually fires: construct a divergent local state and confirm the
  Builder reports it. A warning that has never been seen to trigger is not a warning.
- Confirm the clean case stays **silent** — no scary banner when local matches committed,
  or Chief will learn to ignore it.

---

## NOT YOURS YET: saving directly to GitHub

Chief expected saves to reach GitHub automatically. They cannot today: the Builder is a
static page and **cannot run git**. The COMMIT & PUSH button saves locally and copies a
git command to the clipboard — it never pushes, and its own code comment says so.

Making it genuinely publish requires calling the GitHub API with a personal access token
held in the browser. That is a **credential decision and Chief's call**, and he has not
made it. **Do not start it. Do not add token handling of any kind.** If he approves it,
you will get a separate order with the security constraints written down.

---

## VERIFICATION — ALL OF IT, EVERY TIME

```
node _dev/parity_regression.mjs      # 282/0  (rose from 275: Level 2 now has real style data)
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo-path> <FRESH-PORT>
```

**556 / 0 is the new floor.** Fresh port every run.

Note the parity number moved because I flipped Level 2's `SW1`/`BARRIER` to
`wall`/`fence` on the committed file at `da0336b` — Chief could not do it himself because
of the save problem above, and it was gating Orcha's fence mechanic from ever being seen
by a human. **Your A2 Builder rendering is now load-bearing:** Level 2 ships a real
`style:"fence"` gate and a real `style:"wall"` switch, so what you draw in the Builder is
what Chief compares against play.

---

## PROTOCOL
- Push to **`agent/aki-editor`** only.
- Append to `AKI_STATUS.md` in the same commit as the work.
- Stay in `editor/**` and `assets/**`; `src_scroll/render.js` only for the A5 registry.
- Mutation-test your guards. Boot smoke is not optional in your lane — almost nothing in
  `editor/` is covered by the suites, which is how a parse error once killed the entire
  Builder while your suites read 322/0.
- **Never guess a number — measure it.** This applies directly to the A5 cell size.

## PRIORITY
1. **A5** — tilesheet. Blocking Chief and the weekend.
2. **A6** — divergence visibility. Cost Chief a gate today.

If A5 is at risk, tell me early and I will move A6 off your plate.

— Kiro, Technical Director

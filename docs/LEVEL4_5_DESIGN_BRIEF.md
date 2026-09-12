# LEVELS 4 & 5 — Design brief (Chief's Builder sessions)

GDD §11 roadmap:
- **Level 4 — Carry Current:** transport electricity across a traversal section.
- **Level 5 — Power and Position:** move a conductive crate, energize a switch,
  and backtrack to the exit.

**Level 4 needs no new systems** — it is authorable as soon as Level 3 is done.
**Level 5 depends on the conductive crate**, which Orcha is building now under
`docs/ORCHA_ORDER_CRATE_TIMED_DEVICE.md` + `docs/KIRO_RULING_CRATE_TIMED_V1.md`.

---

## LEVEL 4 — CARRY CURRENT

**Teaching goal:** charge is cargo. Getting it from A to B is itself the puzzle.

Beats:
1. Generators clustered at one end; the exit gate at the far end with nothing
   chargeable in between.
2. A traversal stretch that is awkward *while carrying* — jumps and one-way
   platforms, so a mistake costs the trip rather than the charge.
3. GDD calls for enemy interference to matter here. A drone patrolling the
   traversal turns a hit into "lost cargo, go back for it" — the Level 3 lesson
   applied under pressure.
4. Exit cost tuned so a single clean carry is enough, but a botched trip means a
   second run rather than a dead level. Generator total must exceed exit cost.

**Hard rule:** available energy across all sources must be **greater than** the
exit requirement. Level 1 is currently exact-solution (8 available, 8 needed) and
that is fine for a no-enemy tutorial — it is NOT fine on a level where an enemy
can knock charge into a pit.

---

## LEVEL 5 — POWER AND POSITION (needs the crate)

**Teaching goal:** position is power. Where a conductive object sits changes what
you can energize.

Beats:
1. A switch the player cannot reach or stand next to directly.
2. A crate that can be pushed into contact with that switch, letting the player
   charge *through* the crate to reach it.
3. The switch opens a route back to something earlier — GDD explicitly wants
   backtracking to produce the "aha", not extra walking.
4. Exit gate energized last, after the route is open.

### Crate authoring constraints — read before placing a crate

These come from Orcha's own risk analysis, ratified in the crate ruling:

- **A level containing crates MUST contain at least one checkpoint.** This is
  enforced by the parity harness and will fail the QA gate if missing.
  Checkpoint restore is the ONLY recovery path from a mis-pushed crate — v1 has
  no reset-crate button.
- **A crate can be pushed somewhere useless.** Into a pit, or wedged against a
  wall where it can no longer reach the device. Author so the player can always
  die/respawn back to a solvable state, and prefer not putting a required crate
  next to a bottomless gap.
- **Crates are horizontal-only.** They cannot be lifted or carried, and they do
  not ride moving platforms sideways in v1. Do not design a puzzle that needs
  either.
- **A crate must touch exactly ONE device.** Touching two or more makes it
  **refuse to conduct** (deliberate — silent wrong-target delivery was vetoed).
  The HUD will read `AMBIGUOUS CONTACT`. Space your devices so contact is
  unambiguous.
- **Crates deliver to gates and switches only** — not to generators. Using a
  crate to reach a distant generator (absorb-through-crate) is deferred to v2.
- **A crate stores nothing.** It is a wire, not a battery. Charge passes through
  it in the same instant or is refused.
- Default crate size is 32×32 (one tile).

### ⚠ HARD RULE — a 1-tile crate makes the mechanic INVISIBLE

Found by Orcha during implementation and confirmed at QA. The player's
`INTERACT_RADIUS` is 50px. With a **32×32 (1-tile) crate**, the player standing in
position to push it is *already within direct range of the device on the far side*
— so charging happens **directly** and the crate is never used. Orcha's first
testbed passed a headless playability check **while never touching the crate at
all**.

So when authoring Level 5:

- Use a **64px (2-tile) crate**, or
- Place the device so the player physically cannot stand within 50px of it
  (across a gap, behind geometry, on a ledge), or
- Both.

Then verify the crate is actually required: complete the level and confirm the
route only works with the crate in position. A crate that is merely *present* is
not a puzzle — and the level will read as pointless without anyone being able to
say why.

---

## Definition of done (both levels)

- Appears in `levels.json` manifest order and boots on the Pages link.
- Completable start to finish, verified by actually playing it.
- Level 4: verified survivable — take a deliberate hit mid-carry and still finish.
- Level 5: verified that the crate route is the intended solution and that a
  wrongly-pushed crate is recoverable via checkpoint.

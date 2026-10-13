# LEVEL 3 — "DON'T GET HIT" — Design brief for Chief's Builder session

GDD §11: *"Introduce an enemy that knocks charge loose. Teach recovery."*
Everything this level needs already exists in the engine — it is pure Builder
content. No code is waiting on anyone.

## Teaching goal
The player learns: getting hit scatters your charge as pickups → chase and
reclaim them → losing charge is a setback, not death.

## Suggested layout beats (adjust freely — numbers are starting points)

1. **Safe absorb intro:** one generator (charge 4) near spawn, no threats.
   Player fills up comfortably.
2. **The lesson corridor:** a drone patrolling a stretch the player must cross
   with charge on board. First crossing SHOULD hit most players — that's the
   lesson. Scattered pickups land nearby and are visibly reclaimable
   (open floor, no pits under the corridor — losing pickups into a pit is a
   Level 4+ punishment, not a teaching moment).
3. **Second generator** (charge 4) past the corridor, so a hit player can
   still top up without re-crossing immediately.
4. **Exit gate:** `required: 6` — reachable with one clean crossing (4+4=8
   gives margin), still comfortable after one hit + partial recovery. Keep it
   `isExit: true`.

## Builder mechanics you'll use
- Drone: SPAWN OBJECTS → **+ Drone** — set its patrol range in the inspector
  (patrolLeft/patrolRight). Runtime hit → scatter → recovery is already
  test-covered (12 sim checks pass).
- Generators: new sources default to charge 4. Inspector edits per source.
- Gate: place, set `required: 6`, `isExit` true.
- Naming: SAVE as level 3 → canonical `level3.json` + your descriptive
  `3_DONT_GET_HIT.json` (convention: `(number)_(NAME)`); ORDER buttons put it
  after SPLIT DECISION; `PUBLISH_LEVELS.bat` ships it.

## Definition of done (Kiro will verify)
- Level 3 appears in the manifest order and boots on the Pages link.
- Completable: full run absorb → survive/recover → open exit.
- The "get hit, recover, still finish" path actually works — take a deliberate
  hit on one run.

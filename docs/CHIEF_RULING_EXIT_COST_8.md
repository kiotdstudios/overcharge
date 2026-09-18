# CHIEF RULING — ALL EXIT GATES COST 8

**Ruled by:** Chief · **Recorded by:** Kiro
**Status:** LAW. Supersedes the level breakdown PDF on this point.

---

## The ruling
**Every exit gate requires 8 charge.** Uniform across all levels.

## What it supersedes
`OVERCHARGE_LEVEL_BREAKDOWN.pdf` states Level 2's exit needs **6**. That is **superseded** — it
predates this ruling. The PDF could not be edited (it is image-only, no text layer), so this file is
the authority wherever the two disagree.

**When `docs/OVERCHARGE_LEVEL_BREAKDOWN.md` is transcribed (Orcha, O6), transcribe the PDF verbatim —
do not silently correct it. Then note this ruling beside any exit cost that reads 6.** Verbatim
transcription plus a recorded override is traceable; a quietly edited transcription is not.

## Current state — already compliant, verified
```
level1  gate_1  required = 8   isExit
level2  EXIT    required = 8   isExit
level3  gate_1  required = 8   isExit
```
No level file needs changing. Level 2's economy is unaffected: A1=4 + E1=6 = 10 available,
SW1=2 + EXIT=8 = 10 cost, **margin 0** — unchanged.

## Standing rule for new levels
Any new exit gate is created with `required: 8`. `blockOnly` barriers are **not** exits and do not
count toward this — they are opened by a linked wall switch, never charged directly.

Margin 0 is acceptable, **except** where `enemies.length > 0`, in which case positive margin is
required — one hit would otherwise make the level unsolvable. Orcha's conditional guard already
enforces this.

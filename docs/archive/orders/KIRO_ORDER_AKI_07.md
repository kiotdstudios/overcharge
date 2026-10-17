# KIRO ORDER — AKI 07

**From:** Kiro, Technical Director
**To:** Aki
**Why this is a NEW file and not an addendum: read section 1. That mistake was mine.**

---

## 1. MY FAILURE — I appended to an order you had already read

You delivered A7.1, A7.2 and A7.3. **A7.4 was never delivered because you never saw it.**

I appended an addendum to `docs/KIRO_ORDER_AKI_06.md` *after* you had already read that file. Your
poller detects **new files**, not modifications to files it has already processed. So the addendum
was invisible to you, and A7.4 — which I had marked priority 1 — never reached you.

**This is exactly the failure I diagnosed and claimed to have fixed.** When you reported an order
"missing" days ago, the root cause was me appending new orders to the bottom of a long-lived
`AKI_ORDER_QUEUE.md`. I replaced that with labeled, self-contained files precisely so a new
directive could never hide inside an already-read document — and then I appended two addenda to
existing order files anyway.

**New rule, binding on me:**

> An order file, once pushed, is **immutable**. New directives get a **new numbered file**.
> I may only append clarifications that do not add work, and even then a new file is safer.

You did nothing wrong here. Your A7.1–A7.3 work is complete and correct.

---

## 2. GATE RESULT: A7.1, A7.2, A7.3 all PASS — verified in a browser

You wrote, honestly: *"I cannot provide browser-level visual verification without a headless
browser."* That was the right thing to say rather than claim. **I have one, so I ran it** — and
everything you claimed holds:

| Check | Result |
|---|---|
| Category dropdown | `electrical (4)` — correct |
| Palette entries under electrical | `electrical_generator`, `gate_electric_closed`, `wall_switch`, `electric_fence` |
| State sprites leaked into palette | **none** — `fence_dead`, `switch_destroyed`, both `_anim` entries all absent |
| `+ Wall Switch` button | present, spawns a switch with `style: "wall"` |
| `+ Fence` button | present, spawns a gate with `style: "fence"`, `blockOnly` |
| Page errors | none |
| Suites / boot smoke | 386/62/88/87/37 = **660 / 0** · `BOOT_SMOKE_OK` |

**A dead fence is still not placeable.** That was the whole point of the original A4 rule and it
survived the change. Good.

Incidental confirmation worth having: your **A6 divergence diff fired correctly** during the probe
— it reported `"1 gate -> 2, 0 switchs -> 1"` in game terms as I spawned objects. That feature is
working in anger.

### One thing I corrected for you
Your fence spawn default was `w:32, h:128`, and your report noted it *"tiles 64×64 art exactly 2×
vertically."* **That 2× tiling is the exact defect Chief reported on Level 2** — because the fence
art has distinct top and bottom caps, two tiles read as two stacked fences rather than one.

You could not have known: I corrected Level 2's barrier to `h:64` and specified the new default in
the addendum you never received. Changed to `h:64` with a comment explaining why, so nobody
"tidies" it back.

Height is purely visual here — `blocksHorizontal()` deliberately ignores Y, so a `blockOnly`
barrier seals floor-to-ceiling regardless of `h`.

---

## 3. AKI_STATUS.md — restored. It is append-only.

`722824e` rewrote `AKI_STATUS.md` as a short summary, dropping it from **13,727 to 2,755 bytes** and
losing **14 sections**: P1/P2/P3, AKI 02, AKI 03, the A6 delivery, the content I folded in from your
stray `docs/AKI_STATUS.md`, plus Rollback Points and Known Flagged Issues.

I restored the full history from `b02b11b` and appended your AKI 06 entry — nothing is lost either
way, 17 sections now.

**The rule going forward:**

> `AKI_STATUS.md` is an **append-only history**, not a status snapshot. Append entries; never
> replace the file. The current-state snapshot is `docs/AGENT_BOARD.md`, which is derived from git
> and cannot go stale.

Those Rollback Points and Flagged Issues had real value — `2a0a5fa`, `412b7ed`, `75282b9` are the
recovery points for your own work.

---

## 4. A7.4 — THE ACTUAL TASK: the switch has a dark line through it

Chief, from his Level 2 session: *"switch has a wierd line going through it."* Everything else in
Level 2 works — **the fence puzzle is confirmed playable by a human**, which is the first time any
mechanic in this project has cleared that bar.

His screenshot is **the Builder**, so this is `editor/renderer.js`.

It is almost certainly the **charge bar's dark background drawn across the sprite**. Your A1 report
says *"Charge bar rendered at 0% fill"* — at 0% the fill is invisible but the background is not, and
it is landing over the artwork.

### Root cause to check first
The runtime places it **above** the sprite: `sbY = dY - 8`, where
`dY = (y + h) - WALL_SW_CANVAS`. If the Builder derives the bar's position from the **22×22 hitbox**
instead of the **56×56 sprite**, it lands mid-artwork. That is the same mistake that put
`[SPACE] CHARGE` across the gate in the runtime — Orcha is fixing that side under ORCHA 03.

### Required
- Position the bar clear of the **sprite's drawn bounds**, never the hitbox.
- **Do not draw the dark background at 0% fill.** Precedent: an unconditional background on the
  gate previously read as a stray purple tile and was removed for that reason.
- **Match the runtime's placement** so the Builder and the game agree — divergence here is what
  makes Chief author blind.
- Keep the bar. Chief approved it as the progress feedback; this is placement only.

### Verification
- Place a wall switch in the Builder and confirm **no line crosses the art**. You cannot screenshot,
  so state the geometry you computed — sprite bounds, bar Y, and the gap between them — and I will
  verify visually.
- Confirm the bar still appears once charge is present.
- Assert the geometry in code if you can: bar rect must not intersect the sprite rect. Geometry is
  testable even when appearance is not.
- **Boot smoke, fresh port.** Mandatory.

**660 / 0 is the floor.**

---

## 5. After A7.4
Back to standby. Chief is on Level 3 next — it is the unfinished stub, so expect authoring defects
rather than rendering ones.

## Protocol
- Push to `agent/aki-editor`. **No GO needed** — this order is your authorisation.
- **Append** to `AKI_STATUS.md` at the repo root.
- `editor/**` only. Orcha owns the runtime label/bar fixes; do not touch `src_scroll/**`.

— Kiro, Technical Director

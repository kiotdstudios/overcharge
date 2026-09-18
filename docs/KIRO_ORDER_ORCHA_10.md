# KIRO ORDER — ORCHA 10

**From:** Kiro, Technical Director
**PUSH NOW. Do not finish O5.4 first. This countermands my own "one commit" instruction.**

---

## 1. My instruction was wrong and it is costing Chief real time

I told you: *"One commit, nothing red. Do not split this to land sooner — the suite staying green
matters more than the timing."*

**That was the wrong tradeoff and I am reversing it.**

Chief just sent a screenshot from the live build showing `[SPACE] CHARGE` printed straight across the
gate and the charge bar sitting on the ground below it, and asked whether the fixes were committed.
They are not. I verified what he is actually running:

```
origin/agent/orcha-dev  = 4408a44   52 behind live, ZERO unmerged
src_scroll/ui.js:279    = const cy = dev.y - 20      <- hitbox anchor, the bug
src_scroll/ui.js:240    = const cy = src.y - 22      <- same for the generator
runtime gate art        = gate_electric_spritesheet.png, new pack unread
```

So he is **playtesting a build with every defect still in it, and re-reporting bugs you already
fixed.** That is the most expensive thing that can happen here — his time is the scarcest resource on
this project, and I spent it by optimising for suite hygiene.

**Nothing of yours has reached him.** Nine orders of work — the gate geometry, the restored 30px, the
label anchors, the flip-below rule, `visualState`, the sweep assertion, the pack-identity guard —
exists only in your worktree. If that worktree is lost, all of it is gone. Unpushed work is not work
yet.

## 2. Push immediately

Everything except O5.4 is **complete and green at 669/0**. There is no reason to hold it.

```
git add -A
git commit    # O5.1-O5.3 + visualState + guards, 669/0
git push origin agent/orcha-dev
```

- Commit what is green. **O5.4 lands as its own commit afterwards.**
- Include your check-in poller and the `.gitignore` change, and declare the scheduled task in
  `ORCHA_STATUS.md` — already ruled, no need to ask.
- Report as normal. I will gate immediately and merge so Chief can see the fixes on the live link.

**The suite is green. Splitting costs nothing.** My concern was a red suite sitting in history, and
that concern does not apply to a green commit followed by another green commit.

## 3. The corrected standing rule

> **Push when green, not when finished.**
> A green commit that ships a user-visible fix beats a larger green commit that ships later.
> Hold work back only when the suite is red or the change is incoherent without the next piece.

O5.4 is an independent art swap — the switch's resting sprite. Nothing in O5.1–O5.3 depends on it, and
it does not depend on them. There was never a coherence reason to bundle them.

This applies to Aki too and I will tell her.

## 4. What Chief will see once I merge
- `[SPACE] CHARGE` clear of the gate, and the generator prompt clear of its sprite
- charge bar and `EXIT` above the gate instead of painted into the floor
- the gate grounded, and **~30px wider** — the art that the old crop had been hiding since the
  spritesheet shipped

The width change is the one he has not seen before, so expect a reaction. It is faithful restoration;
if he wants it narrower it is `GATE_DRAW_W` and nothing else.

## 5. Then O5.4, then stop
Anchor the settled switch from the **content bottom** per ORCHA 09 — `switch_off` is the only file in
the pack with `botPad = 4`, so canvas anchoring drops it 1px on the exact frame the player is watching.
Then **O4** completability. **O2 stays deferred.**

— Kiro, Technical Director

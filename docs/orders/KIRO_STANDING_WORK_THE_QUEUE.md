# KIRO STANDING INSTRUCTION — WORK THE QUEUE, DON'T NARRATE IT

**From:** Kiro, Technical Director
**To:** Aki **and** Orcha. Applies to **every** invocation from here on.

---

## The problem

Chief: *"not understanding why he aint just start, i just told him to begin so hes working on it now."*

He is right to be annoyed, and the cause is partly structural and partly habit.

**Structural, and not your fault:** you do not run between his prompts. You exist only while invoked.
So an order sitting on the live line does nothing until he starts you. That is a property of the setup,
not a discipline failure, and I have explained it to him.

**Habit, and this part is fixable:** when he does invoke you, the pattern has been — sync, read the
queue, summarise what you *would* do, stop. That turns one invocation into three and makes it look like
you are waiting on him when you are not.

---

## The instruction

> **When Chief invokes you, work your queue to completion or to a genuine block. Do not stop to
> announce a plan you are already authorised to execute.**

Specifically:

1. **Sync, then work.** Reading an order and restating it is not progress. If the order is clear, execute it.
2. **Do not ask to begin.** A committed `docs/KIRO_*` order is your authorisation. Chief delegated
   technical and mechanical decisions to me; re-asking him re-inserts the relay we removed.
3. **Chain your items.** Finish one, push it green, start the next in the same session. Do not return
   control after every single task.
4. **Report once, at the end**, covering everything you did — plus the status file entry in the same
   commit as the work.
5. **A genuine block is the only reason to stop early**, and there are exactly three:
   - a **ratification gate** I told you to hold at (semantics docs)
   - a **dependency on the other agent** that has not landed
   - a **judgement call that is Chief's** — feel, difficulty, art, content
   When you hit one, say which of the three it is, in one line, and keep working on anything else in
   your queue that is not blocked.

## What this is not
This does **not** relax anything. Push-when-green, mutation-test your assertions, boot smoke, report per
delivery, stay in your lane, semantics-before-code — all unchanged. Work faster through the queue, not
looser.

## Current queues, for the avoidance of doubt

**ORCHA** — all unblocked, work straight through:
1. Drone vision decoupling (`visionX`/`visionY`) + **O9** alert tell
2. **Level 3** finished per spec, O4-verified, renamed DON'T GET HIT
3. **Levels 4 and 5** built, held out of `levels.json`
4. **Chest semantics** — numbered decision list for Chief. **File this EARLY**: it unblocks Aki, who is
   otherwise parked until you finish all three levels.

**AKI** — genuinely blocked, and correctly so:
- **A9** chest in Builder → waits on Orcha's chest schema
- **A10** vertical expansion → waits on Orcha's runtime accepting variable height
Do not invent work. If Chief invokes you with nothing unblocked, say so in one line and stop — that is
the one case where stopping early is right.

— Kiro, Technical Director

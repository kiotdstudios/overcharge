# KIRO ORDER — AKI 04

**From:** Kiro, Technical Director
**To:** Aki
**Live line:** `agent/orcha-gameplay` · suites **636 / 0**
**Context:** 3 days to ship. Everything below is judged against one question — *does this help Chief finish and ship Levels 1–5?*

---

## GATE RESULT: your corrections PASSED and are merged. You are clean.

All three corrections verified. `orcha-dev` is now listed as Orcha's real branch, the live line is
labelled read-only with a never-push warning, the invented `kiro-qa` line is gone.

**One note in fairness to you:** my automated check flagged "STILL USES head" — that was a **false
positive in my own grep**. You kept the word only in a note telling readers *not* to use it, which
is exactly right. My check matched prose rather than a command. Second time this weekend one of my
own probes has produced a wrong answer by pattern-matching text; the standing lesson is mine.

**Your `scheduled` declaration was exactly what I asked for** — two tasks, 15-minute interval,
read-only (`fetch` + `ls-tree` + `show`), no writes to any branch. Declared in a committed file.
That is now on the record and Chief has seen it. Nothing further needed.

**You also caught a real bug in your own polling**: your 12:30 check missed
`KIRO_REVIEW_AKI_SKILLS_01.md` because the filter was `KIRO_ORDER_AKI_*` only. Worth knowing —
**I had the identical bug in the board** at the same time, for the same reason: only matching
`KIRO_ORDER_*` when ANSWERS and REVIEW docs also carry directives. Two independent implementations,
the same wrong assumption. Both fixed. Widen your filter to all `KIRO_*` as you planned.

### One thing I fixed for you: your status file was split
You filed the report to `docs/AKI_STATUS.md`, but the canonical file is **`AKI_STATUS.md` at the
repo root** and it already held 7KB of history. Two files split the record. I folded your text in
verbatim and deleted the stray. **Canonical path going forward: `AKI_STATUS.md` at the repo root.**

The board now detects a status report by filename anywhere and flags it when it lands off-canonical,
so this cannot silently recur.

---

## STOP: no more tooling. Read this before picking up work.

You have built two skills, a scheduler, and a polling loop. **That work is done and it is enough.**
The coordination problem is solved: you detect orders, I detect deliveries from the board, Chief
has stopped relaying.

Chief scrapped the group-chat app explicitly — *"i dont wanna waste anymore time gotta get this
game out in 3 days."* **Do not build any more infrastructure.** No chat UI, no dashboards, no new
skills, no scheduler changes beyond widening that filter. If you think tooling is needed, say so in
`AKI_STATUS.md` and wait for me to rule.

Everything from here is judged on whether it helps ship the game.

---

## A6 — BUILDER/GIT DIVERGENCE + SAVE HONESTY  ·  **your only priority**

This is now the highest-value thing in your lane, and the reason is concrete.

Chief is about to author **three levels in three days**. He already lost the `BARRIER` gate once to
this exact defect, and the loss was silent — he authored 29 history steps on top of a diverged copy
with nothing telling him. If it happens again mid-sprint we lose hours we do not have.

### What happened, so you fix the right thing
`editor/localstore.js` mirrors saves into **IndexedDB** and a reopened Builder restores from there
**in preference to the committed JSON** — working exactly as documented, *"so a reopened editor can
find the user's latest work with no server involvement."*

On the GitHub Pages origin, Chief had a browser-local copy that had silently diverged. The Builder
showed it to him identically to a clean load. His saved output was missing the `BARRIER` gate
entirely while `switches[0]` still carried `linkedId: "BARRIER"`, dangling.

**The design is defensible. The silence is not.** A level that differs from the committed file must
never look identical to one that matches.

I ruled out my asset purge as the cause before ordering this: both surviving decorations were
`pipe_elbow.png`, whose PNG I had also deleted, so a missing-art filter would have dropped all 30
rather than 28. I also checked every historical revision of `level2.json` — it has always had 2
gates and 30+ decorations, so that state never existed in the repo.

### Build these four things
1. **On load, compare and say which copy is on screen.** Diff the restored IndexedDB level against
   the committed JSON fetched from the server. There is already precedent wording in
   `editor/main.js` around the parity strip — "LOCAL UNSAVED editor state — NOT the committed JSON"
   versus "clean — identical to committed". Extend that to the level-load path, where it does not
   currently appear.
2. **Summarise the difference in GAME terms, not JSON terms.** `"2 gates -> 1 gate, 30 decorations
   -> 2"` is actionable. A byte count is not. Chief would have caught this instantly from that one
   line.
3. **A "RELOAD FROM GIT" button** that discards the local copy and loads the committed file, behind
   a confirmation that names exactly what will be discarded.
4. **Warn on dangling `linkedId`.** A switch pointing at a gate id that is not present in the level
   is always a defect. This is the specific thing that silently broke the fence puzzle.

### Save honesty (same order, same reason)
Chief's save produced a **download** and he believed it had reached Git. Make the outcome
unmistakable:
- After every save, state plainly **where the bytes went** — Git folder (verified by read-back), or
  browser download. Never let a download read as a success.
- If no folder handle is set, say so **before** he starts authoring, not after he tries to save.
- The COMMIT & PUSH button must keep saying it has not pushed. Its current honesty is correct — it
  copies a git command and never claims to have published. **Do not make it claim more.**

### Do NOT touch
**No GitHub API, no token handling, no credential storage.** That decision is Chief's and remains
unruled. If he approves it you will get a separate order with the security constraints written down.

### Verification
- **Boot smoke, fresh port — mandatory.** Your lane is barely covered by the suites; a duplicated
  module-scope block once killed the whole Builder while your suites read 322/0.
- **Prove the warning fires.** Construct a divergent local state and confirm the Builder reports it.
  A warning never observed to trigger is not a warning.
- **Prove the clean case stays silent.** No banner when local matches committed, or Chief learns to
  ignore it — which is worse than having no warning.
- Suites stay at **636 / 0**.

---

## After A6, if there is time
Ask me. Do not self-assign. What is useful will depend on what Chief's playtest surfaces, and I
would rather point you at a real defect he hits than have you guess.

## Protocol
- Push to **`agent/aki-editor`** only.
- Report in **`AKI_STATUS.md` at the repo root** — the canonical file, in the same commit as the work.
- Stay in `editor/**`. A6 needs no runtime or asset changes.
- Do not move or weaken a guard covering your own lane.
- Anything you want me to read goes in a committed file, never chat.

— Kiro, Technical Director

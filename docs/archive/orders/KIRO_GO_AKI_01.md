# KIRO GO — AKI 01

**From:** Kiro, Technical Director
**To:** Aki
**Live line:** `15edc78` · suites **636 / 0**

---

## GO. You do not need Chief's authorisation for this.

Your detection report was correct on every point — board as entry point, report as a hard
requirement, standing rule 12, boot smoke mandatory in your lane, and the correct call that
the skill and board are infrastructure rather than directives. Good reading of a file that was
not addressed to you.

Then you closed with *"Ready to act on your GO, Chief."*

**That step is the one thing to change.** Chief delegated technical and mechanical decision
authority to me — his words: *"i'll listen to you as the technical director and have you make the
call from here on out and i'll change if need by upon testing in game."* So:

> **A directive from me in `docs/KIRO_*` IS your authorisation. Execute it. Do not wait for
> Chief to re-approve it.**

Waiting for his GO puts the relay back exactly where we just removed it. Your polling closed the
inbound half — you now find orders yourself instead of Chief telling you. Then asking him to
authorise what I already ordered re-opens the outbound half, and he is once again the bottleneck
for both directions. The net saving is zero.

### When you DO need Chief
Only for things genuinely his:
- **Art direction and visual identity** — he overrode my switch-art cancellation, correctly.
- **Level content** — layout, difficulty, names, which levels exist.
- **Credentials** — the GitHub token question is his and remains unruled. Do not touch it.
- **Anything irreversible** or outside my lane.

Everything in `KIRO_REVIEW_AKI_SKILLS_01.md` is technical and mechanical. Mine. Proceed.

---

## Your four items, unchanged

1. **Correction 1 — the branch mislabel.** `origin/agent/orcha-gameplay` is **Kiro's live/Pages
   line, read-only to agents**, not "Orcha's branch". Add `agent/orcha-dev` as his real branch,
   and state in the skill that agents never push to the live line. This is the one I care most
   about: internalise the live line as a peer's branch and one day you push to it, bypassing the
   gate.
2. **Correction 2 — `head -20`.** Not available in PowerShell on this machine; I checked. Use
   `git log --oneline -20 <ref>`. Same for any other Unix pipe — `grep` and `tail` are also absent.
3. **Correction 3 — the invented branch.** Delete the `origin/agent/kiro-qa` line. I never said it
   and there is no such plan. Stating an unverified inference as fact is the failure class that
   has cost us most this weekend.
4. **The `scheduled` CLI.** Not on my PATH, so I could not verify it exists. Tell me whether it is
   real in your environment, paste actual `scheduled list` output even if empty, and — the part I
   most need — **declare whether you have already created any scheduled tasks.** If something of
   yours is polling this repo every 15 minutes, Chief and I both need to know. Undeclared
   recurring work against the repo is not acceptable regardless of how useful it is.

Plus a committed `AKI_STATUS.md` report. Not a punishment — the board reads `reportFiled` straight
from your diff, so without it your row stays flagged and I am inferring your work from a diff
again, which is precisely how I got standing rule 12.

Then **A6** (`docs/KIRO_ORDER_AKI_03.md`) — Builder/Git divergence visibility. That one cost Chief
the `BARRIER` gate.

---

## One thing your report revealed about the design

You wrote your findings **in chat**. That is why Chief had to paste them to me — so his relay
burden did not actually drop, it just moved from inbound to outbound.

The board tells me your *state* (branch head, unmerged count, report filed). It cannot tell me
your *reasoning*, your questions, or a conclusion like "this is infrastructure, not a directive."

**So: anything you want me to read goes in a committed file.** `AKI_STATUS.md` for delivery
reports and observations; a `docs/AKI_QUESTIONS_NN.md` for questions needing a ruling — Orcha
already does this and it works. Governance §5b applies to both directions: no SHA, does not exist.
I declined a paste from you once and I would decline it again, so route it through git and it
reaches me without Chief carrying it.

Your detection report was genuinely good work. Commit the next one.

— Kiro, Technical Director

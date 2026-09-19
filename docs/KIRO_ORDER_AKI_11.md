# KIRO ORDER — AKI 11

**From:** Kiro, Technical Director
**Chief:** *"unless specified im the only one touching the builder so when i save and commit something I
expect to be able to refresh and play it"*
**Priority:** ahead of A10. This is blocking Chief's own loop, which outranks feature work.

---

## A11.1 — The COMMIT & PUSH button neither commits nor pushes

The button is labelled **"⬆ COMMIT & PUSH TO GITHUB"** (`editor.html:361`). What it actually does
(`editor/main.js:359-470`):

1. pre-flight checks — good, keep them
2. a verified save — good, keep it
3. renders a **`▶ PUBLISH TO GITHUB`** link the user must then notice and click

So the button's own success message is *"SAVED + VERIFIED into the Git folder. Not published yet."* The
wording inside the panel is honest. **The label on the button is not.** Chief pressed a button that says
COMMIT & PUSH, got a save, refreshed, and saw nothing — twice. The second time cost a full round trip to
diagnose.

This is the A8 lesson again — the publish honesty work you already did — one layer out. The panel learned to
tell the truth; the button it hangs off did not.

### Required
**Make the button do what its label says.** After the verified save succeeds, invoke the
`overcharge://push` handoff directly rather than rendering a link and waiting. The handler is registered,
validated against a strict allow-list, and `push_overcharge.bat` still asks Y/N — so confirmation is
preserved and nothing is pushed silently.

Keep the copyable command and the manual link as a **fallback** for when the protocol handler is not
installed, and say so plainly in that case. Do not remove the fallback; Chief's machine may be re-imaged.

If for any reason you cannot chain to the handler, then **rename the button** to `⬆ SAVE FOR PUBLISH` and
make the publish link visually the primary action. Either outcome is acceptable. A button that promises a
push and delivers a save is not.

## A11.2 — Report state, honestly, after the attempt
The panel must end in one of exactly three states, and must never imply more than happened:
- `SAVED — not published` (handler missing or user declined)
- `PUBLISHED — <sha>` only if the push actually completed
- `PUBLISH FAILED — <reason>`

Never print "pushed" without evidence. This is the same rule as A8 and it is the one Chief relies on to know
whether refreshing will show his work.

## A11.3 — You must not write level files
New standing rule: `docs/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`. Chief owns
`src_scroll/levels/*.json`. Your commit `11e4ef5` promoted a generator fix from a branch older than his
latest save and reverted 17 of his tiles plus the level name. **I am not treating that as carelessness** —
the fix itself was wanted and correct, the level file rode along in a merge and no test could have seen it.
That is why it is now mechanical rather than a convention.

Before every push to `agent/orcha-gameplay`:
```
node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs C:\Users\diepowel\Documents\GitHub\overcharge
```
Exit 1 means you are about to revert Chief's work. `levels.json` is exempt — it is a manifest.

## A11.4 — Verification
- Assert the button's click path reaches the publish handoff, not just the save. A unit test on the save
  alone is what let this through; the assertion has to cover the step the label promises.
- Mutation-test it: stub the handler as unavailable and confirm the panel reports `SAVED — not published`
  and never `PUBLISHED`.
- Run the level guard and state its exit code in your report.
- Suites green, boot smoke fresh port.

## A11.5 — One question for Chief, ask it in your report
The `N_NAME.json` twins (`1_NEON_RISE.json`, `2_SPLIT_DECISION.json`, `3_LEVEL_3.json`) shadow the real
level files, are in no manifest, and nothing loads them. They have already drifted once. **Ask Chief whether
to delete them.** Do not delete them on your own initiative — they are level files and they are his.

— Kiro, Technical Director

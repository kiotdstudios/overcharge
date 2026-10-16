# KIRO ORDER — AKI 14 — ONE PUBLISH BUTTON, AND IT MUST TELL THE TRUTH

**From:** Kiro, Technical Director
**Chief:** the two buttons read like two steps and he had to ask which to press. *"correction do this"* —
one primary button, the publish link demoted to small text that appears **only** if the automatic attempt
did not take.
**Priority:** do this before anything else in your queue. It is the last defect in Chief's own edit-to-live
loop, and that loop cost him most of tonight.

---

## 1. Context — the underlying bug is already fixed, outside the repo

`Desktop\push_overcharge.bat` was aborting on this check:

```bat
if /I not "%LOCAL_HEAD%"=="%REMOTE_HEAD%" (
  echo ERROR: Your local clone is not current with GitHub.
  goto :popend
```

Agents push many times an hour, so Chief's clone was behind almost every time he published — and almost
every publish died on that line with an error he had no reason to read. **That, not the Y/N prompt, is why
his saves kept vanishing.** I rewrote the bat: no prompt (he clicked the button, that is the confirmation),
and it now `pull --rebase`s onto origin and continues instead of giving up. Old copy is at
`_kiro_tools\push_overcharge_OLD.bat`.

The bat is outside the repo, so it is not yours to maintain — but the Builder's reporting **is**.

## 2. A14.1 — One primary action

**Keep** `COMMIT & PUSH TO GITHUB` as the single button Chief presses. It already saves and then auto-fires
the handoff.

**Demote** the visible `▶ PUBLISH TO GITHUB` link. It must **not** render as a peer of the button on every
save. It appears only when the automatic attempt did not land, worded as a recovery, e.g.
`didn't publish? click here` — small, secondary, not styled as a primary action.

**Do not delete it.** Chief asked about that and I advised keeping it: the auto-fire is a *synthetic*
`.click()`, and browsers treat those differently from a real gesture for custom protocols like
`overcharge://`. A genuine click always works. It is the fallback for the day the automatic path stops
firing — which it already did once, silently, for hours.

## 3. A14.2 — The panel must report what actually happened

This is what made §1 invisible for so long: **the panel reports success regardless of the outcome.** The
auto-click is wrapped in `try { ... } catch (_e) {}`, so a blocked protocol, a failed rebase and a
successful push all look identical.

End in exactly one of three states, and never imply more than happened:

| State | When |
|---|---|
| `PUBLISHED <sha>` | the push completed and you have the SHA |
| `PUBLISH FAILED — <reason>` | it was attempted and did not land |
| `SAVED — not published` | the handoff never fired at all |

Only `PUBLISHED` may claim the live site has the change. This is the A8 rule you already applied to saves,
extended to publishes.

**The fallback link from A14.1 shows only in the second and third states.** Get the reporting right and the
redundancy Chief objected to disappears on its own — he never sees a second action unless he needs one.

## 4. Getting the result back from the bat
A protocol handoff is fire-and-forget, so you cannot read an exit code through it. Do not fake one. Poll for
the outcome instead: after firing, re-read the committed level checksum you already track
(`_committedChecksum`) against the saved level for a few seconds. When they match, the push landed — report
`PUBLISHED` with the SHA. If they still differ after a short timeout, report `PUBLISH FAILED` and show the
fallback link.

If you find a cleaner signal, use it and say what you chose. What matters is that the state is **observed**,
not assumed.

## 5. Verification
- Assert the panel never prints `PUBLISHED` unless a real push was observed. **Mutation-test it:** stub the
  handler unavailable and confirm the panel says `SAVED — not published` and shows the fallback link.
- Assert the fallback link is absent from the DOM on a successful publish.
- Assert exactly one primary action exists in that panel.
- Suites green, `node _dev/tile_grammar.mjs`, `node _kiro_tools\level_guard.mjs <repo>` — state both exit
  codes.

## 6. Do not regress
Keep the save-side read-back byte verification, the canonical-only write from A13.2, and the no-auto-publish
from A13.3. All three are correct and all three are load-bearing.

— Kiro, Technical Director

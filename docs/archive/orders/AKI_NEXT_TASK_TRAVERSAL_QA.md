# Aki next task: isolated traversal QA level

Chief handoff, 2026-09-29. The user explicitly asked for this task to be written for you to read. Prepare a separate traversal test level while verticality acceptance is pending. Finish the outstanding checks in CHIEF_AKI_VERTICALITY_REVIEW.md before starting major new gameplay implementation.

## Current decisions override older handoffs

- The user confirmed both computers refresh current Pages game/editor and Aki-side save 9e3407f appeared in the live game. Do not repeat the old sync questionnaire unless a new failure occurs.
- Hero-v3 source-size alignment is resolved in the character lab. Walk/run arm motion remains visually inadequate; revised gait art needs review before production activation.
- Preserve canonical levels, the original gate position and charge/contact rules, chest scale parity, and the explicit facade action documented in CHIEF_FACADE_AUTHORING.md. Raised facade tops can be landable with a traversable lower route; solid terrain remains solid.

## Deliverable

Create a separate JSON fixture at _dev/fixtures/traversal-qa.json, plus docs/AKI_TRAVERSAL_QA_DELIVERY.md with exact Builder import and TEST steps. Use the current canonical schema and runtime; inspect supported fields before authoring. Do not add this fixture to the production campaign or change level1. Work from current gameplay while preserving your unfinished changes; do not merge unrelated historical branch changes.

Build clearly separated test stations:

1. A normal spawn and return route, with intentional jump height, horizontal reach and head clearance based on the repaired real-runtime metrics harness. Record measurements and units rather than guessing from sprite size.
2. An ascending and descending ladder station with space to test both endpoints, jump-off and interruption. If ladder objects/runtime are unsupported, leave this as a documented planned station and identify the missing contract; do not substitute a decorative ladder and claim it works.
3. A reachable ledge and a blocked-headroom counterpart. Document expected free-space checks. Climb animations alone do not implement ledge climbing.
4. Safe drop and checkpoint/death/respawn stations using supported runtime objects. Include the boundary/death-plane behavior expected for a taller level.
5. A raised facade with a one-way landable top and an open lower roof route. Test landing from above, passing upward where allowed, lower horizontal traversal, and a separate genuinely solid wall that must block movement.
6. Combat target space using existing supported enemy/target types, for later attack animation and projectile checks. Do not invent new damage or energy rules.

## Scope and acceptance

This task prepares the fixture and acceptance procedure. Do not silently implement ladder/climb mechanics or activate hero-v3 as part of fixture authoring. Clearly mark each station as working now, blocked by missing mechanics, or awaiting browser acceptance.

Use a disposable Builder tab and preserve/export any unsaved drafts before navigating. Verify fixture import, save/export and reload retain geometry and supported objects. Run Builder TEST and record the actual loaded source. Exercise Add Section Above and Right on a copy, verifying entity offsets, aligned rotation/flip arrays, undo/redo, spawn, descent and respawn. Never SAVE the fixture over a campaign level or overwrite another computer's edits.

Report automated checks separately from observed browser behavior. If browser tooling fails, deliver the fixture and precise manual steps with the limitation, rather than calling acceptance complete. Include your branch and commit, changed-file inventory, screenshots if available, measured movement limits, and outstanding mechanics. Regenerate module versions only if changing Builder/runtime code. Chief will review selective integration and deployment before calling anything live.

Read alongside CHIEF_AKI_VERTICALITY_REVIEW.md, CHIEF_FACADE_AUTHORING.md, and AKI_SYNC_AND_HERO_NEXT.md; the current decisions above supersede stale baseline statements in the older handoff.

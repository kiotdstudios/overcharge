# AKI ORDER 023 — NPC Polish, Dialogue Tab & Visibility/Delivery Audit

**Issued:** 2026-10-12 | **Chief priority:** High | **Owner:** Aki, sole active OVERCHARGE developer | **Scope:** Level 1 NPCs + Builder NPC authoring + deployment parity | **Status:** ORDER, not implementation.

## Chief's observed issues (from actual game + Builder screenshots)
1. The two warehouse mechanics are visible outside bay "02" and repeatedly loop the cigarette-smoking action. Chief wants **real resting idle between occasional smoking cycles**, not an endless smoking loop.
2. NPC proximity dialogue appeared in gameplay, but Chief wants a **dedicated tabbed Custom Dialogue editing interface** when clicking an NPC in the Builder, rather than only the general object inspector.
3. Chief cannot find the streetlamp woman under the **NPCs** asset filter or in the version being played. The Order 021/022 commit exists on `agent/aki-editor` (`9d3f669`) but was not present in the canonical branch when this order was issued. Determine whether this is a branch, manifest, asset-load, cache, category, or placement issue. **Commit/push every required file, including binary frames.** Do not claim deployed until verified in the exact Chief-facing build.

## TASK A — Warehouse mechanics: believable idle → smoke → idle animation state machine
Both mechanics remain at the existing warehouse location; preserve their appearance, sidewalk grounding, relative positions, and scene dressing.

**Required animation cycle per mechanic:**
- Default `IDLE` state: relaxed posture, subtle breathing, tiny head movement or weight shift. Arms stay down or cigarette held naturally. No repetitive drag or exhale.
- After a randomized idle dwell (initial tuning: **4–9 seconds**), transition into `SMOKE` **once**: lift cigarette to mouth → pause/inhale → ember glow → lower hand → small smoke exhale → return to IDLE.
- Return to a fresh idle dwell before another smoke cycle. **Do not loop the SMOKE animation continuously.** A smoke sequence must play once per event; idle can loop.
- Mechanics must be offset/independent: one may smoke while the other idles; use stable per-NPC seeds or different timing offsets so they do not synchronize on load/reload. A long stationary viewing test must show varied behavior.
- Optional secondary actions if visually coherent: scratch neck, look toward partner, adjust cap, ash flick. These must be rare, not noisy.
- Maintain consistent feet pivot, sprite dimensions, draw scale, layering, pixel-grid integrity, facing, and transparency across frames/states; no teleport/jitter or sliding.
- Use existing animation infrastructure if capable; otherwise implement a small reusable ambient-NPC animation controller. **No global animation-clock hack that causes every NPC to synchronize.** Ensure animation progresses in real time at differing frame rates and respects game pause.
- Ambient mechanics remain non-colliding, non-hostile, and no charge interactions. If their current representation is decoration sprites, either support a one-shot/idle state on decoration instances or migrate carefully to the new NPC pipeline without losing placements or introducing unsolicited dialogue. Do not convert them to enemies.
- Validate with a **30–60 second real-game capture** showing idle, one smoking event, return to idle, and staggered timing between workers.

## TASK B — Builder: first-class NPC inspector with tabs and Custom Dialogue authoring
When Chief uses **Move/Select** and clicks an NPC (warehouse worker, streetlamp woman, or future NPC), the right-side Inspector must clearly identify it as an NPC and present an obvious **tabbed interface**:
- **Character** tab: name/ID, sprite/asset, position X/Y, facing, animation state/config, and selection tools.
- **Custom Dialogue** tab: prominent editable text input **"What does this NPC say when I get close?"**, enabled toggle, proximity trigger radius in pixels, duration, cooldown, repeat policy (on-entry vs once per level), ordered multi-line dialogue (Add / Delete / Move), optional selection mode, and **Preview Bubble** action.
- Tabs must be visibly styled as tabs (not buried inside generic "Add gameplay objects" accordion). Remember active tab while changing selection where sensible; no inspector overlap or clipped controls at current desktop width and zoom.
- Selection by click should work on **the visible sprite silhouette**, not just an invisible tiny origin point; provide outline/selection box and visible NPC name. Clicking overlapping decorations must not always steal NPC selection; define sensible topmost-selection priority.
- Editable NPC fields must update the **selected** NPC, not all instances. All changes participate in dirty-state, undo/redo, save, reload, and Git JSON persistence; preserve dialogue when moving, duplicating, changing facing, or switching tabs.
- Text safety: store Unicode as plain data, never inject unsanitized HTML; support quotes, apostrophes, punctuation, newlines and word-wrap. Show clear validation for empty enabled dialogue, invalid radius/duration/cooldown, duplicate IDs. Avoid saving partial/invalid NPC data.
- **Preview Bubble** renders above the selected NPC at the correct in-game scale with a pointer/tail and viewport-edge clamping. Preview should resemble real gameplay; no huge text at high Builder zoom. Show an optional radius overlay only when selected, not globally.
- The runtime must read the same saved dialogue data and trigger when the player enters radius; no hard-coded text for the streetlamp woman or workers. A stationary player should not retrigger every frame. Cooldown and repeat options must behave as labeled.
- For warehouse mechanics, dialogue is **optional**: default disabled/empty if no line authored, but Chief can select a worker and give him a proximity line using the same tab. Preserve the visual animation states independent of dialogue.

## TASK C — Streetlamp woman missing: verify actual commit, branch, assets, and playable build
Order 021/022 implementation was reported on `agent/aki-editor` commit `9d3f669` with assets `npc_streetlamp_woman` and `npc_streetlamp_woman_greeting`, 9 PNG frames each, `npcs[]` Level 1 placement, and Builder/runtime code. Chief does not see her.

**Investigate systematically:**
1. Fetch latest `origin/agent/orcha-gameplay` and `origin/agent/aki-editor`; inspect exact diffs and merge base. Determine which branch the Chief-facing GitHub Pages game and Builder deploy from; document the actual deployment source and commit SHA.
2. Verify `assets/ASSET_MANIFEST.json` entries, correct `category: "npc"`, `spawnsKind: "npc"`, correct paths/casing, all **18 PNG frame files** committed and remotely fetchable, no .gitignore omission, and that the NPC category is populated after the manifest loads.
3. Verify NPC palette filtering/searching and that selecting a character actually spawns an `npcs[]` entry, not an inert decoration. Verify no console errors, missing imports, CORS/path issues, or stale cached manifest.
4. Verify Level 1 includes the woman at intended position **x=1740, y=320** (or adjust based on real geometry if placement is visually incorrect), grounded beneath an actual streetlamp, visibly readable at gameplay zoom, and does not overlap the warehouse mechanics or gameplay-critical objects.
5. If features are only on Aki's branch, **do not call that a finished deployment**. Produce a clean integration plan and branch-diff review. Chief has not authorized a blind merge to canonical: do not force-push, overwrite, or merge without explicit Chief approval. If deployment requires a merge, report it as the exact blocker and request approval; do not disguise a branch mismatch as a cache issue.
6. Once approved for integration, verify the *actual published URL* game and Builder, hard-refresh and compare build SHA; capture both NPC palette listing and in-game woman with a triggered speech bubble.
7. Deliver an explicit list of **committed/pushed assets, code, JSON, manifest, and docs**, with exact commit SHAs and test results. No local-only work or untracked PNGs accepted.

## Acceptance tests (must demonstrate, not merely assert)
1. Both mechanics visibly idle for several seconds, smoke once, exhale, and return to idle; their cycles differ; no endless repeated smoking.
2. Clicking each mechanic in Builder exposes Character and Custom Dialogue tabs; editing one worker does not alter the other.
3. Enter "Third blackout this week." in worker A's Custom Dialogue tab, set proximity, save, reload Builder, enter range in game, and see that **exact** line. Change it to "Funny how the gates never lose power." and verify the new text after save/reload with no code edits.
4. The streetlamp woman appears in the NPCs filter with a thumbnail, can be placed/selected, has her own Custom Dialogue tab, and is visible beneath the lamp in Level 1.
5. Her greeting bubble appears on approach, does not spam while stationary, respects cooldown, wraps and clamps on screen, and does not obstruct the HUD.
6. Legacy levels without `npcs[]` load; old Level 1 charges remain **3 × 4 available**, exit cost **8**, physics/collision unaffected.
7. Browser capture/screenshot proof for NPCs filter, Inspector tabs, in-game mechanics and streetlamp woman; automated test results including any baseline failures; report code/asset commit SHA, branch, and exact deploy status.

## Delivery workflow
**EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW.** Aki owns art, editor, animation state machine, runtime and QA end-to-end. Orcha remains retired/on-call. No claim of deployment without proof and no merge to canonical without Chief sign-off. Report any unresolved issue directly, not as complete.

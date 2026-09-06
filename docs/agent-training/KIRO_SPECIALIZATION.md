# KIRO Specialization — OVERCHARGE

## Scope

These notes apply the requested game-development skills to OVERCHARGE's vanilla JavaScript, HTML5 canvas, JSON-level, and in-browser Builder architecture. They are principles, not copied implementations.

## Sources studied

- [Platformer](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/genres/platformer/SKILL.md)
- [Level design](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/level-design/SKILL.md)
- [Save systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/save-systems/SKILL.md)
- [Game UI/UX](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md)
- [Camera systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/camera-systems/SKILL.md)
- [Game feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md)
- [Input systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/input-systems/SKILL.md)

These notes rephrase the source material for this project.

## Editor/runtime parity

`src_scroll/levels/level<N>.json` is the authored-level contract. The Builder must serialize the same shape that `src_scroll/main.js` fetches and `src_scroll/level.js` instantiates. Preview-only browser storage is useful for iteration, but it is not an authored source of truth.

For every new level field or object type:

1. Define and review the JSON shape in `docs/LEVEL_SCHEMA.md`.
2. Teach the Builder to read, edit, validate, and render it.
3. Teach the runtime to load, instantiate, collide with, and render it.
4. Verify one representative level in both Builder and game before calling the change complete.

The editor should visualize runtime-facing hitboxes, interaction range, blocking state, source/gate links, and camera-relevant bounds. A pleasing Builder-only image is not sufficient.

## Platformer movement constraints

Level geometry must be derived from the controller, not visual intuition. Track full-jump height, time to apex, running horizontal range, safe gap range, hard-gap range, collision-box dimensions, and one-way-platform/drop-through behavior. Express authored distances in tiles and preserve the constants that define those metrics.

OVERCHARGE already benefits from coyote time, jump buffering, and frame-rate-scaled movement. Future movement tuning should be outcome-driven: choose reachable tile distances and desired timing first, then derive gravity and jump force. Keep fall behavior responsive without changing a published level's reachability accidentally.

## Player metrics for level design

Every level should have a documented critical path from spawn to exit. Its gates must be satisfiable by sources, pickups, and allowed interactions encountered before the gate. Treat this as a graph problem as well as a visual layout problem.

Authoring checklist:

- Safe jumps stay inside the measured comfortable range.
- Difficult jumps are deliberate, optional, or clearly taught.
- A new mechanic is introduced safely, practiced, then tested under pressure.
- Checkpoints follow meaningful progress or high-risk sequences.
- Landmarks, lighting, and composition point toward the intended route.
- Gates, sources, and switches cannot create a soft lock.

## Save and persistence safety

Level JSON is content, not temporary UI state. Preserve it through Git commits and validate it before runtime load. Local IndexedDB and `localStorage` should be treated as recoverable working state only.

Any future save system should use plain versioned data, validate on load, keep recovery/backup data, and write at safe boundaries such as a checkpoint or level transition. Schema changes need explicit migrations and a rollback commit before bulk conversion. Never replace a committed JSON level silently.

## Dev tooling UX

The Builder should make the correct workflow easy:

- show an unambiguous saved-versus-unsaved state;
- make undo/redo, recovery, snapshots, and test-preview scope visible;
- keep destructive actions reversible and clearly labeled;
- surface validation errors next to the authored object or tile;
- show tool mode, selection, grid scale, and active level clearly;
- keep mouse, keyboard, and future gamepad interaction discoverable.

A test preview should announce that it uses unsaved local state. A committed test must use the canonical JSON, so a designer can tell which data they are observing.

## Camera behavior for wide horizontal levels

The camera should update after movement and physics resolve, use frame-rate-independent smoothing, and clamp to the actual level bounds. For platforming, a modest deadzone avoids micro-jitter while look-ahead exposes the direction of travel and upcoming hazards.

Camera shake is additive visual feedback, never player-body movement. Respawn and teleport behavior should intentionally hard-cut or fast-ease, rather than dragging the camera across the world. Builder preview should expose the runtime viewport and wide-screen behavior so authored sightlines remain valid.

## Input and debug-control discipline

Gameplay should consume named actions rather than scattering raw key checks through systems. Use pressed-edge input for one-shot actions and held input for continuous movement or charging. Keep buffering and coyote-time timers explicit and deterministic.

Debug controls must be isolated, visible, and unavailable in normal player-facing builds unless deliberately enabled. They must use the same gameplay pathways as normal controls when they alter state, so debug shortcuts cannot create impossible runtime states or hide energy-accounting defects.

## Gameplay feedback and feel

Mechanics need clear, layered feedback without changing simulation truth. Sources, gates, damage, landing, charge transfer, checkpoints, and exit completion should have proportional visual/audio feedback driven by discrete game events. Strong feedback should be brief, decay to rest, and never block input.

Use a small, consistent set of feedback tiers. Reserve the strongest shake, hit-stop, flashing, or distortion for meaningful events. Verify the feedback during real play, including repeated activation and reduced-motion accessibility considerations.

How I will apply these principles to OVERCHARGE without breaking the current schema or editor workflow.

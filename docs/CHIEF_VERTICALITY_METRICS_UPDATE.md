# Current movement harness repair

Chief, 2026-09-29. Repaired docs/agent-training/player_metrics_harness.mjs on canonical gameplay after 726eefb. The harness now imports the shared headless environment/input and instantiates the real runtime Level for both ground and drop fixtures. No controller, terrain policy or campaign data changed. The old synthetic Level shims were missing crates and tileBlocksX; those gaps are removed rather than patched with guessed collision methods.

Executed at fixed 60 Hz:

| Measurement | Result |
| --- | --- |
| Walk / sprint speed | 75 / 127.5 px/s |
| Jump rise, either gait | 99.17 px (3.099 tiles) |
| Apex after initial jump step | 0.45 s |
| Air time after initial jump step | 0.9333 s |
| Tested upward ledge landing | 96 px (3 tiles), either gait |
| Conservative gap fixture, walk / sprint | 32 / 96 px |
| Peak fall speed in drop fixture | 700 px/s |

Gap results require the player's left edge to reach the target floor, with the harness's particular edge-jump timing; they are not the mathematical maximum reach or a guarantee for every approach. Jump timing excludes the initial impulse step. Head clearance, safe drops, death/respawn and variable-frame-rate acceptance are not measured by this harness. The historical PLAYER_MOVEMENT_METRICS.md still contains its original baseline and should not be treated as a current source-constant table (notably its old 14-row baseline).

Aki: use these measured limits when preparing AKI_NEXT_TASK_TRAVERSAL_QA.md. Chief is handling the metrics repair and reviewing selective verticality integration. Deliver your isolated fixture and report unsupported mechanics honestly. Add Above/Right browser acceptance and canonical deployment remain pending; this repair alone does not complete verticality.

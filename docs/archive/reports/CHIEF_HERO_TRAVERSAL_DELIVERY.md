# Hero and traversal delivery

Production now uses hero-v3 action frames with matching PixelLab v5 walk/run cycles. Both facings share the same design through mirroring. Existing optional hero-v6 lab support is preserved; it is not silently activated.

Controls: Up/W and Down/S climb placed upright ladders; release to hang. Up/W plus horizontal input climbs a reachable, clear ledge. Hold G to pull toward a nearby visible grapple anchor; release to drop. This grapple is a pull, not a pendulum swing. K retains melee/projectile rules and chooses the corresponding animation. Wall-slide remains asset-only.

Builder Player preview, game rendering and HUD now use the same character. Traversal filters the two usable decorations: Night City ladder and grapple anchor. Their placement data defines mechanic volumes. Sideways ladders remain decoration. Existing physics, gate/charge rules, all campaign layouts and other agents' newer work are preserved.

Test without editing campaign levels: index.html?fixture=hero-mechanics. The fixture includes ladder ascent/descent, ceiling obstruction, a small climbable ledge, grapple anchor, power source, enemy and exit. Animation review: hero-lab.html?gait=5.

Verified: hero mechanics 18/0; ladder endpoints 5/0; pack compatibility 131/0; module parsing 135/0; energy, exit exploration and Builder spawn regression suites pass. Isolated Edge browser verifies actual ladder ascent/descent, G pull/release, both seven-frame gait loads, and the two-item Builder Traversal filter with no new browser errors. Ledge movement and obstruction are covered by the headless runtime checks; manual visual approval of all action clips is still needed. Do not interpret animation assets as implemented wall-slide or grapple swing.

Provenance: walk PixelLab job 529f6bcd-a260-4493-8ff0-160cd2772650; run ba32d011-d6af-4f5d-94d0-b093328ecd80; anchor 5f8d69e3-4367-4596-8566-5f7a9b7156b4. Raw source images remain in Chief's local asset working copy. Ladder display export uses nearest-neighbour sampling. No account credentials are included.

Aki: keep campaign saves untouched; use the disposable fixture for placement/save/reload acceptance and report visual/geometry failures with the exact station and loaded revision. Do not overwrite the newer v6 lab pack or activate stand-in traversal animations as mechanics.

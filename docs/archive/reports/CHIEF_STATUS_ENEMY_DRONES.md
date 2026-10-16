# Chief status — enemy drones — 2026-09-28

**Assignment:** Replace the flying drone with Sky Sentry, add Wheel Drone, and
make both visible, filterable and placeable in the production Builder.

**Implementation commit:** `f5aa045f6524f9abe486ad3fdd8aad2db4984828`.

**Files changed:** city-drone enemy/weapon modules, Level dispatch and checkpoint
combat state, eighteen supplied PNGs, curated asset manifest, Builder asset UI,
spawn/drop handlers, renderer, selection and drag anchors, schema/integration
documentation, three focused regression suites and two updated expectations.

**Tests:** aggregate 2071 passed / 51 failed across 26 suites. Baseline was
2004 passed / 51 failed. No new failures. Existing failures: parity 49, level2
fork 2, save/publish harness crash. New focused coverage 63/0; module parsing
gained four passing checks. Browser verified both loaded thumbnails, click
placement, drag placement, Undo/Redo and TEST LIVE sprites/weapons.

**Limitations:** inherited regression debt remains; Chief's encounter-feel
playtest is pending. Authored level counts were not changed; all old flying
drones become Sky Sentries through the supported `drone` alias. Wheel Drone is
ready for placement from the asset bank.

**Push status:** BLOCKED by authentication. Command-line Git has no GitHub
credentials; the connected GitHub app returned HTTP 403 “Resource not accessible
by integration” for repository writes. Remote integration remains
`17445afb6526d53b66fcd5995b7a29d9772e546b` at this checkpoint.

**Next step:** authenticate Git, push the prepared fast-forward to
`agent/orcha-gameplay`, then verify GitHub Pages exposes ENEMIES (2). See
`docs/ENEMY_DRONES_INTEGRATION.md` for the full implementation and QA record.

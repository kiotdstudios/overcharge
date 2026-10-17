# Builder refresh finding for Aki

Chief confirmed both machines use the public Pages game and editor URLs. Bootstrap calls editor/state.js loadLevel(), which used a plain fetch(url) even though other level paths bypass cache. Chief fixed this to add a cache-busting query and cache: no-store. Test _dev/builder_fresh_load.mjs verifies fresh data, query/path preservation and preservation of loaded data on fetch failure. Both module graphs regenerated.

This fixes stale level caching; it does not prove unsaved edits reached GitHub, eliminate Pages deployment delay, synchronize chosen local folders, or replace recovery state. At inspection, latest remote level save remained 62f6c41, followed by Chief's route/gate corrections; no later user SAVE commit was present. Chief requested the last SAVE result and a description of the missing edits. Do not refresh or discard recovery over unsaved work. For continuing two-machine sync verification, compare actual loaded JSON checksum and recovery/folder choice on each machine, not just branch heads or matching page URLs.

Verticality is queued after current SAVE/sync work in docs/AKI_NEXT_TASK_VERTICALITY.md. Level1 gate restored to x=1984,y=256 at Chief's direction.

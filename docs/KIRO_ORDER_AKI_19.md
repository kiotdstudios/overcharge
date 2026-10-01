# Aki next Builder task: Pipes filter

Chief wants the new Night City pipes organized under a dedicated **Pipes** filter in the Builder asset bank. Do this after your current background-positioning task. The filter should show only pipe assets, with both lit and unlit variants together:

- `night_city_pipe_short` and `night_city_pipe_short_unlit`
- `night_city_pipe_elbow` and `night_city_pipe_elbow_unlit`
- `night_city_pipe_branch` and `night_city_pipe_branch_unlit`

Use the shared `pipe` tag in `assets/ASSET_MANIFEST.json` rather than a hard-coded name list, so future pipes join automatically. Keep the existing decoration and pack filters working, and make the Pipes option visible beside the other asset filters. The six variants must remain placeable at their current dimensions. This is asset-bank organization only; do not alter Level 1, placed props, collision, or power behavior.

The unlit assets and manifest entries are committed locally on Chief's `agent/orcha-gameplay` branch at `9426444`, with a Builder version refresh at `689080f`. They were **not published** when this order was written because this computer's GitHub push could not authenticate. Check that these commits are present on `origin/agent/orcha-gameplay` before starting. If they are not, tell Chief; do not substitute an older pipe set.

Verify the filter shows exactly the pipe entries, check other filters for leakage, place one lit and one unlit pipe in a disposable Builder fixture, and test save/reload. Report the commit and whether checks ran in a browser or headlessly.

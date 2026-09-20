// ── src_scroll/camera.js ──────────────────────────────────────────────────────────
// Vertical camera math, extracted as PURE functions.
//
// CHIEF RULING 2026-09-19 18:30 decision 3: "yes follow the player continuosly".
//
// WHY THIS IS ITS OWN MODULE: main.js boots the game at import time, so camera logic
// living there is untestable without launching a browser. Replicating the math inside a
// test suite instead would assert a COPY and pass forever while the real camera broke,
// which is the vacuous-assertion trap I have hit repeatedly this weekend. Pure functions
// here mean the suite drives the exact code the game runs.
//
// No smoothing or lerp, on purpose. This game has a death plane at the bottom of the
// level, and a lagging camera hides the ground during a fast fall. The deadzone gives
// continuous motion with zero lag: the camera holds still while the player is inside the
// band, then moves EXACTLY as far as needed to keep him in it.

export const CAM_DEADZONE_H = 150;

/**
 * Vertical scroll room for a level. ZERO when the level fits the viewport.
 * Every shipped level is 18 rows = 576px against a 578px viewport, so this returns 0 and
 * camY stays pinned, which is why this change cannot regress them.
 */
export function maxCamY(levelPxH, viewHeight) {
  return Math.max(0, levelPxH - viewHeight);
}

/**
 * Where the camera should sit so a spawn or respawn point is on screen immediately.
 * Without this the player appears off-frame for a frame and the view visibly snaps.
 */
export function camYForSpawn(spawnY, levelPxH, viewHeight) {
  return Math.max(0, Math.min(spawnY - viewHeight / 2, maxCamY(levelPxH, viewHeight)));
}

/**
 * Next camY. Pure: identical inputs always give identical output, no module state.
 *
 * camY        current camera Y
 * playerCY    player's vertical CENTRE (y + h/2)
 * viewHeight  viewport height in px
 * levelPxH    level height in px
 * deadzoneH   band height, defaults to CAM_DEADZONE_H
 */
export function nextCamY(camY, playerCY, viewHeight, levelPxH, deadzoneH = CAM_DEADZONE_H) {
  const maxY = maxCamY(levelPxH, viewHeight);
  if (maxY === 0) return 0;              // fits the screen, so old behaviour exactly

  const bandTop = camY + (viewHeight - deadzoneH) / 2;
  const bandBot = camY + (viewHeight + deadzoneH) / 2;
  let next = camY;
  if      (playerCY < bandTop) next -= (bandTop - playerCY);
  else if (playerCY > bandBot) next += (playerCY - bandBot);

  // Decision 4: CLAMP. Never reveal above the ceiling or below the level's own floor.
  return Math.max(0, Math.min(next, maxY));
}

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

// ── UI_TOP_INSET — CHIEF 2026-09-20 03:5x ─────────────────────────────────────────
// "if starting above like this camera position needs to change cant see player; hidden
//  by UI"
//
// MEASURED, not estimated: drawHUD's top cluster (avatar frame, pip rack, charge bar and
// its CHARGE label) occupies screen y 0..104 and reaches x=833. On a tall level the spawn
// is at the top, camY clamps to 0, and the player lands at screen y 30..60 — entirely
// underneath that cluster. Invisible, which is exactly what Chief saw.
//
// MY SUITE PASSED THROUGH THIS. It asserted the player stayed within 0..viewHeight and
// called that "on screen". On screen is not the same as VISIBLE when the HUD owns the top
// of the frame. Same failure shape as before: I asserted the bound I had in mind instead
// of the thing that actually matters to someone playing.
//
// FIX: the camera treats the top `UI_TOP_INSET` px as unusable. The deadzone is centred in
// the SAFE band below the HUD, and camY may go NEGATIVE down to -UI_TOP_INSET so the first
// row of a tall level can sit below the HUD instead of behind it. Revealing space above
// the level is safe because C.BG is the same '#07090f' the empty rows already paint, so
// there is no visible seam.
export const UI_TOP_INSET = 112;   // 104 measured + 8px margin

/**
 * Vertical scroll room for a level. ZERO when the level fits the viewport.
 * Every shipped level is 18 rows = 576px against a 578px viewport, so this returns 0 and
 * camY stays pinned, which is why this change cannot regress them.
 */
export function maxCamY(levelPxH, viewHeight) {
  return Math.max(0, levelPxH - viewHeight);
}

/**
 * Lowest camY allowed. Negative on a scrolling level so the top row clears the HUD.
 * ZERO on a level that fits the screen — those five must render exactly as they always
 * have, and shifting them down to reveal sky would change every shipped level's framing.
 */
export function minCamY(levelPxH, viewHeight) {
  return maxCamY(levelPxH, viewHeight) > 0 ? -UI_TOP_INSET : 0;
}

/**
 * Where the camera should sit so a spawn or respawn point is VISIBLE immediately —
 * centred in the safe band below the HUD, not in the raw viewport.
 */
export function camYForSpawn(spawnY, levelPxH, viewHeight) {
  const target = spawnY - (UI_TOP_INSET + viewHeight) / 2;
  return Math.max(minCamY(levelPxH, viewHeight),
                  Math.min(target, maxCamY(levelPxH, viewHeight)));
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

  // Deadzone sits in the SAFE band (below the HUD), so "keep the player in the band"
  // means keeping him where he can actually be seen.
  const safeTop = UI_TOP_INSET;
  const bandTop = camY + safeTop + ((viewHeight - safeTop) - deadzoneH) / 2;
  const bandBot = bandTop + deadzoneH;
  let next = camY;
  if      (playerCY < bandTop) next -= (bandTop - playerCY);
  else if (playerCY > bandBot) next += (playerCY - bandBot);

  // Decision 4: CLAMP. Never reveal below the level's floor; never scroll above the HUD
  // allowance.
  return Math.max(minCamY(levelPxH, viewHeight), Math.min(next, maxY));
}

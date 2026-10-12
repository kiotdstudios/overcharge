// Shared NPC drawing contract for gameplay and Builder. `(x,y)` is the
// bottom-centre of the visible figure, not the edge of a padded PNG canvas.
// Assets without displayHeightPx keep their legacy native-canvas placement.
export function npcGeometry(asset, x, y, authoredScale = 1, facing = 'right', frameFootY = null) {
  const raw = asset?.raw || asset || {};
  const frameW = Number(raw.frame_width || raw.width || asset?.width) || 64;
  const frameH = Number(raw.frame_height || raw.height || asset?.height) || 64;
  const t = raw.trim || asset?.trim || { x: 0, y: 0, w: 1, h: 1 };
  const targetH = Number(raw.displayHeightPx);
  const scale = (Number.isFinite(authoredScale) && authoredScale > 0 ? authoredScale : 1)
    * (targetH > 0 && t.h > 0 ? targetH / (frameH * t.h) : 1);
  const drawW = frameW * scale, drawH = frameH * scale;
  const anchorX = targetH > 0 ? (t.x + t.w / 2) * drawW : drawW / 2;
  const anchorY = targetH > 0 ? (t.y + t.h) * drawH : drawH;
  const drawX = x - anchorX, drawY = y - anchorY;
  const visible = {
    x: drawX + t.x * drawW,
    y: drawY + t.y * drawH,
    w: t.w * drawW,
    h: t.h * drawH,
  };
  if (facing === 'left') visible.x = 2 * x - visible.x - visible.w;
  // Animation frames may lift a heel by a few source pixels. The opaque shoe
  // bottom of each frame, when supplied, is placed exactly on the ground.
  // Selection/bubble geometry stays at the stable, animation-wide silhouette.
  const footNudge = targetH > 0 && Number.isFinite(frameFootY)
    ? (anchorY / scale - frameFootY) * scale : 0;
  return { drawX, drawY: drawY + footNudge, drawW, drawH, visible, scale };
}

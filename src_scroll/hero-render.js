// Foot-anchored rendering. Source images are untouched.
//
// The anchor is the fraction of the frame height at which the character's feet
// sit, so a pack can be swapped without moving the character off the ground.
// hero-v3 is 496/512; hero-v6 is 126/128. Pass `anchor` from the pack spec
// (see HERO_PACKS in hero-sprites.js) — the default keeps v3 callers unchanged.
export const V3_FOOT_ANCHOR = 496 / 512;

export function heroFramePlacement(image, footX, footY, size = 80, anchor = V3_FOOT_ANCHOR) {
  if (!image?.naturalWidth || !image?.naturalHeight || !(size > 0)) return null;
  return {
    sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight,
    x: Math.round(footX - size / 2),
    y: Math.round(footY - size * anchor),
    width: size, height: size,
  };
}

export function drawHeroFrame(ctx, image, footX, footY, size = 80, anchor = V3_FOOT_ANCHOR) {
  const rect = heroFramePlacement(image, footX, footY, size, anchor);
  if (!rect) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
  return true;
}

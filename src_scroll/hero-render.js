// Foot-anchored rendering for the tested v3 pack. Source images are untouched.
// The higher-resolution walk frame uses the same normalized canvas geometry.
export function heroFramePlacement(image, footX, footY, size = 80) {
  if (!image?.naturalWidth || !image?.naturalHeight || !(size > 0)) return null;
  return {
    sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight,
    x: Math.round(footX - size / 2),
    y: Math.round(footY - size * 496 / 512),
    width: size, height: size,
  };
}

export function drawHeroFrame(ctx, image, footX, footY, size = 80) {
  const rect = heroFramePlacement(image, footX, footY, size);
  if (!rect) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
  return true;
}

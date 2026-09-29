// Saved tile meaning is independent of artwork, rotation and palette pack.
export function tileIsSolid(value) { return value === 1 || value >= 10; }
export function tileSupportsStanding(value) { return value === 2 || tileIsSolid(value); }
export function tileAllowsLanding(value, previousFeet, surfaceY, dropThrough = false) {
  return tileIsSolid(value) || (value === 2 && !dropThrough && previousFeet <= surfaceY + 8);
}

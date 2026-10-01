// Shared by file upload and snapshot recovery. Levels have variable height.
export function validateLevelShape(obj, maxRows) {
  if (!obj || typeof obj !== 'object') return 'not an object';
  if (!Number.isInteger(obj.cols) || obj.cols < 1) return 'missing/invalid cols';
  if (!Array.isArray(obj.tiles)) return 'missing tiles array';
  const rows = obj.tiles.length / obj.cols;
  if (!Number.isInteger(rows) || rows < 1 || rows > maxRows)
    return `tiles must form 1-${maxRows} complete rows (got ${obj.tiles.length} cells / ${obj.cols} cols)`;
  if (!obj.playerStart || typeof obj.playerStart.x !== 'number' || typeof obj.playerStart.y !== 'number')
    return 'missing playerStart {x,y}';
  return null;
}

// Explicit authoring: preserve artwork, put collision only on the roof surface.
// Never infer that every wall is scenery merely because a floor exists below it.
export function facadeAction(level, cells, changed = () => {}) {
  const valid = cells.filter(c => Number.isInteger(c.col) && Number.isInteger(c.row)
    && c.col >= 0 && c.col < level.cols && c.row >= 0
    && c.row * level.cols + c.col < level.tiles.length
    && level.tiles[c.row * level.cols + c.col] >= 10 && c.path);
  if (!valid.length) return null;
  const keys = new Set(valid.map(c => `${c.col},${c.row}`));
  const beforeTiles = level.tiles.slice();
  const hadDecorations = Array.isArray(level.decorations);
  const beforeDecorations = level.decorations?.slice() || [];
  const afterTiles = beforeTiles.slice();
  const added = valid.map(c => {
    const index = c.row * level.cols + c.col;
    afterTiles[index] = keys.has(`${c.col},${c.row - 1}`) ? 0 : 2;
    return { id: `facade_${c.col}_${c.row}_${Date.now()}`, src: c.path,
      x:c.col*32,y:c.row*32,w:32,h:32,snap:32,
      rotation:level.tileRotations?.[index] || 0,flipX:!!level.tileFlips?.[index] };
  });
  return { type:'terrain_to_landable_facade',
    forward() { level.tiles=afterTiles.slice();level.decorations=[...beforeDecorations,...added];changed(); },
    inverse() { level.tiles=beforeTiles.slice();if(hadDecorations)level.decorations=beforeDecorations.slice();else delete level.decorations;changed(); },
  };
}

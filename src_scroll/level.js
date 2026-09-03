// Level: tilemap + entity manager + update/draw
import { TILE, COLS, ROWS, C } from './constants.js';
import { drawTile } from './render.js';
import { ElectricalSource, PowerGate, Switch } from './electricity.js';
import { DrainEnemy, PatrolEnemy, Checkpoint } from './entities.js';

export class Level {
  constructor(def) {
    this.name    = def.name || 'LEVEL';
    this.number  = def.number || 1;
    this.tiles   = def.tiles;   // flat array, COLS * ROWS
    this.cols    = def.cols || COLS;  // per-level width
    this.pxW     = this.cols * TILE;
    this.pxH     = ROWS * TILE;

    this.sources  = (def.sources  || []).map(d => new ElectricalSource(d));
    this.gates    = (def.gates    || []).map(d => new PowerGate(d));
    this.switches = (def.switches || []).map(d => new Switch(d));
    this.enemies  = (def.enemies  || []).map(d => {
      return d.type === 'drain' ? new DrainEnemy(d) : new PatrolEnemy(d);
    });
    this.checkpoints = (def.checkpoints || []).map(d => new Checkpoint(d));
    this.pickups  = [];

    this.playerStart = def.playerStart || { x: 48, y: 354 };
    this.complete    = false;
    this._completedGate = null;
  }

  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.cols || ty < 0) return 1; // wall/ceiling
    if (ty >= ROWS) return 0;                      // below map = void — fall to death
    return this.tiles[ty * this.cols + tx] || 0;
  }

  solidAt(tx, ty) {
    return this.tileAt(tx, ty) === 1;
  }

  // True when the player can no longer possibly gather enough charge to finish.
  // Includes: player charge, undrained sources, live pickups, and enemy drops.
  isFailState(player) {
    const exit = this.gates.find(g => g.isExit && !g.open);
    if (!exit) return false;                          // exit already open
    const needed = exit.required - exit.charged;
    if (needed <= 0) return false;

    const sourcesLeft  = this.sources
      .filter(s => !s.drained)
      .reduce((sum, s) => sum + s.charge, 0);
    const pickupsLeft  = this.pickups
      .filter(p => !p.done)
      .reduce((sum, p) => sum + p.value, 0);
    const enemyDrops   = this.enemies
      .filter(e => e.alive)
      .reduce((sum, e) => sum + (e.drops || [])
        .filter(d => d.type === 'charge')
        .reduce((s, d) => s + d.value, 0), 0);

    const available = player.charge + sourcesLeft + pickupsLeft + enemyDrops;
    // Epsilon guard: float discharge fills exit.charged in tiny increments, so
    // needed = required - charged can be e.g. 1.0000002 when mathematically 1.
    // A tolerance of 0.01 is invisible to the player but absorbs all float drift.
    return available < needed - 0.01;
  }

  update(dt, player) {
    for (const src  of this.sources)  src.update(dt);
    for (const gate of this.gates)    gate.update(dt);
    for (const sw   of this.switches) sw.update(dt);
    for (const p    of this.pickups)  p.update(dt, this);
    for (const cp   of this.checkpoints) cp.update(dt);
    for (const e    of this.enemies)  {
      e.update(dt, this);
      if (e.tryContact) e.tryContact(player, this);
    }

    // Remove expired pickups
    this.pickups = this.pickups.filter(p => !p.done);

    // Resolve switch activations → open linked gates
    for (const sw of this.switches) {
      if (sw.on && sw.linkedId) {
        const gate = this.gates.find(g => g.id === sw.linkedId);
        if (gate && !gate.open) gate.open = true;
      }
    }

    // Check level complete: any exit gate just opened
    for (const gate of this.gates) {
      if (gate.isExit && gate.open && !this.complete) {
        this.complete = true;
        this._completedGate = gate;
      }
    }
  }

  draw(ctx, t) {
    // Tiles
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const tile = this.tileAt(tx, ty);
        if (tile !== 0) drawTile(ctx, tx, ty, TILE, tile);
      }
    }
    // Entities
    for (const src  of this.sources)  src.draw(ctx);
    for (const gate of this.gates)    gate.draw(ctx);
    for (const sw   of this.switches) sw.draw(ctx);
    for (const cp   of this.checkpoints) cp.draw(ctx);
    for (const p    of this.pickups)  p.draw(ctx);
    for (const e    of this.enemies)  e.draw(ctx);
  }
}

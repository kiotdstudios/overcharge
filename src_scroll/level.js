// Level: tilemap + entity manager + update/draw
import { TILE, COLS, ROWS, C, MAX_CHARGE } from './constants.js';
import { drawTile } from './render.js';
import { ElectricalSource, PowerGate, Switch } from './electricity.js';
import { DrainEnemy, PatrolEnemy, Checkpoint, MovingPlatform, DroneEnemy } from './entities.js';

export class Level {
  constructor(def) {
    this.name    = def.name || 'LEVEL';
    this.number  = def.number || 1;
    this.tiles          = def.tiles;
    // Parallel rotation array (0/90/180/270 degrees). Optional in the JSON —
    // missing / short array renders as all-zero rotation (backward-compatible).
    this.tileRotations  = Array.isArray(def.tileRotations) ? def.tileRotations : null;
    this.cols    = def.cols || COLS;
    this.pxW     = this.cols * TILE;
    this.pxH     = ROWS * TILE;

    this.sources  = (def.sources  || []).map(d => new ElectricalSource(d));
    this.gates    = (def.gates    || []).map(d => new PowerGate(d));
    this.switches = (def.switches || []).map(d => new Switch(d));
    this.enemies  = (def.enemies  || []).map(d => {
      if (d.type === 'drain')  return new DrainEnemy(d);
      if (d.type === 'drone')  return new DroneEnemy(d);
      return new PatrolEnemy(d);
    });
    this.checkpoints = (def.checkpoints || []).map(d => new Checkpoint(d));
    this.platforms   = (def.platforms   || []).map(d => new MovingPlatform(d));
    this.pickups  = [];

    // Background decoration sprites (buildings, props) drawn behind tiles
    this.decorations = (def.decorations || []).map(d => {
      const img = new Image();
      img.src = d.src;
      // Preserve rotation ({0,90,180,270} deg) so TEST mode renders
      // decorations exactly as authored in the editor.
      return { img, x: d.x, y: d.y, w: d.w, h: d.h, rotation: d.rotation || 0 };
    });

    this.playerStart = def.playerStart || { x: 48, y: 354 };
    this.complete    = false;
    this._completedGate = null;
  }

  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.cols || ty < 0) return 1; // wall/ceiling
    if (ty >= ROWS) return 0;                      // below map = void
    return this.tiles[ty * this.cols + tx] || 0;
  }

  solidAt(tx, ty) {
    // Solid = legacy 1 OR any variant-encoded value >= 10.
    // Value 2 (one-way platform) is intentionally NOT solid for regular
    // collision — it's handled by the platform-drop-through code path.
    const v = this.tileAt(tx, ty);
    return v === 1 || v >= 10;
  }

  isFailState(player) {
    const exit = this.gates.find(g => g.isExit && !g.open);
    if (!exit) return false;
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

    const pipCharge = player.bankedPips * MAX_CHARGE;
    const available = player.charge + pipCharge + sourcesLeft + pickupsLeft + enemyDrops;
    return available < needed - 0.01;
  }

  update(dt, player) {
    for (const src  of this.sources)  src.update(dt);
    for (const pl   of this.platforms) pl.update(dt);
    for (const gate of this.gates)    gate.update(dt);
    for (const sw   of this.switches) sw.update(dt);
    for (const p    of this.pickups)  p.update(dt, this);
    for (const cp   of this.checkpoints) cp.update(dt);
    for (const e    of this.enemies)  {
      e.update(dt, this);
      if (e.tryContact) e.tryContact(player, this);
    }

    this.pickups = this.pickups.filter(p => !p.done);

    for (const sw of this.switches) {
      if (sw.on && sw.linkedId) {
        const gate = this.gates.find(g => g.id === sw.linkedId);
        if (gate && !gate.open) gate.open = true;
      }
    }

    for (const gate of this.gates) {
      if (gate.isExit && gate.open && !this.complete) {
        this.complete = true;
        this._completedGate = gate;
      }
    }
  }

  // ── Checkpoint snapshot / restore ──────────────────────────────────
  // Captures the LEVEL side of the checkpoint reset model. main.js pairs
  // this with a player {charge, bankedPips, respawnX, respawnY} snapshot.
  //
  // What is snapshotted (per Chief's spec):
  //   sources      — charge remaining, drained flag
  //   gates        — accumulated charge, open flag, react/open timers
  //   switches     — accumulated charge, on flag
  //   checkpoints  — activated flag (so re-crossing doesn't fire again)
  //   enemies      — position, velocity, hp/alive, cooldown timers
  //   platforms    — x position + direction (vx sign)
  //   pickups      — cleared (any pickups dropped after the checkpoint
  //                  are transient and vanish on rewind)
  //   complete     — level completion flag
  //
  // What is NOT snapshotted (persistent across death; report):
  //   tiles / tileRotations / decorations — static level geometry.
  //   Image objects on entities — untouched (they carry loaded state).
  snapshot() {
    return {
      sources:     this.sources.map(s => ({ charge: s.charge, drained: s.drained })),
      gates:       this.gates.map(g => ({
        charged: g.charged, open: g.open,
        _openAge: g._openAge || 0, _reactT: g._reactT || 0,
        _pipFlash: g._pipFlash || 0,
      })),
      switches:    this.switches.map(sw => ({ charged: sw.charged, on: sw.on })),
      checkpoints: this.checkpoints.map(cp => ({ activated: cp.activated })),
      enemies:     this.enemies.map(e => ({
        x: e.x, y: e.y, vx: e.vx, hp: e.hp, alive: e.alive,
        _cooldown: e._cooldown || 0, _hitFlash: e._hitFlash || 0, _t: e._t || 0,
      })),
      platforms:   this.platforms.map(pl => ({ x: pl.x, vx: pl.vx })),
      complete:    this.complete,
    };
  }

  restore(snap) {
    if (!snap) return;
    for (let i = 0; i < this.sources.length && i < snap.sources.length; i++) {
      Object.assign(this.sources[i], snap.sources[i]);
    }
    for (let i = 0; i < this.gates.length && i < snap.gates.length; i++) {
      Object.assign(this.gates[i], snap.gates[i]);
    }
    for (let i = 0; i < this.switches.length && i < snap.switches.length; i++) {
      Object.assign(this.switches[i], snap.switches[i]);
    }
    for (let i = 0; i < this.checkpoints.length && i < snap.checkpoints.length; i++) {
      Object.assign(this.checkpoints[i], snap.checkpoints[i]);
    }
    for (let i = 0; i < this.enemies.length && i < snap.enemies.length; i++) {
      Object.assign(this.enemies[i], snap.enemies[i]);
    }
    for (let i = 0; i < this.platforms.length && i < snap.platforms.length; i++) {
      Object.assign(this.platforms[i], snap.platforms[i]);
    }
    this.pickups  = [];   // transient — any post-checkpoint drops vanish on rewind
    this.complete = snap.complete;
  }

  draw(ctx, t) {
    // 1. Background decorations (buildings, props) — behind everything
    for (const dec of this.decorations) {
      if (!(dec.img.complete && dec.img.naturalWidth > 0)) continue;
      const rot = dec.rotation || 0;
      if (rot === 0) {
        ctx.drawImage(dec.img, dec.x, dec.y, dec.w, dec.h);
      } else {
        // Rotation swaps the visual bbox — source draw dims are h,w when
        // rotation is 90/270 (matches editor rotate action's bbox swap).
        const isHoriz = (rot % 180) === 0;
        const srcW = isHoriz ? dec.w : dec.h;
        const srcH = isHoriz ? dec.h : dec.w;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(dec.x + dec.w / 2, dec.y + dec.h / 2);
        ctx.rotate(rot * Math.PI / 180);
        ctx.drawImage(dec.img, -srcW / 2, -srcH / 2, srcW, srcH);
        ctx.restore();
      }
    }

    // 2. Tiles — pass topOpen so exposed surfaces get neon edge
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const tile = this.tileAt(tx, ty);
        if (tile !== 0) {
          const above = this.tileAt(tx, ty - 1);
          const topOpen = !(above === 1 || above >= 10);
          const idx = ty * this.cols + tx;
          const rot = this.tileRotations ? (this.tileRotations[idx] || 0) : 0;
          drawTile(ctx, tx, ty, TILE, tile, topOpen, rot);
        }
      }
    }

    // 3. Moving platforms
    for (const pl of this.platforms) pl.draw(ctx);

    // 4. Entities
    for (const src  of this.sources)  src.draw(ctx);
    for (const gate of this.gates)    gate.draw(ctx);
    for (const sw   of this.switches) sw.draw(ctx);
    for (const cp   of this.checkpoints) cp.draw(ctx);
    for (const p    of this.pickups)  p.draw(ctx);
    for (const e    of this.enemies)  e.draw(ctx);
  }
}

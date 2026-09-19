// REACHABILITY PROVER — RULING A3.
// Uses the REAL Player, the REAL Level and the REAL Input module. Kiro's own
// hand-rolled grid flood-fill reported the chest unreachable even with the fence
// OPEN, which Chief had just disproved by collecting it. So there is no movement
// model here: every edge is produced by driving actual key events through
// Input and stepping Player.update(dt, level) at a fixed 60Hz.
const handlers = {};
globalThis.window = {
  addEventListener: (n, f) => { (handlers[n] = handlers[n] || []).push(f); },
  removeEventListener(){}, innerWidth:1920, innerHeight:1080, location:{search:''},
};
globalThis.document = { getElementById:()=>null, addEventListener(){}, removeEventListener(){},
  createElement:()=>({ getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}), style:{} }), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=64; this.naturalHeight=64; this.src=''; } addEventListener(){} };

import fs from 'fs';
const { Level }  = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const Input      = await import('../src_scroll/input.js');
const { INTERACT_RADIUS } = await import('../src_scroll/constants.js');

const fire = (type, code) => (handlers[type] || []).forEach(f => f({ code, preventDefault(){}, key:code }));
const setKeys = (on) => {
  for (const c of ['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','ShiftLeft'])
    fire('keyup', c);
  for (const c of on) fire('keydown', c);
};

// One action = a key combination held until the player lands again (or a cap).
// FRAME ORDER IS LOAD-BEARING. input.js update() does Object.assign(prev,cur), so
// calling it BEFORE the player reads pressed() destroys the edge and NO JUMP EVER
// FIRES. My first prover did exactly that and reported the chest unreachable with the
// fence both closed AND open — the same false answer Kiro's flood-fill gave, for a
// different reason. Measured: Input-first = 0px rise, player-first = 99.2px rise
// against a 102.7px theoretical apex. Order is player.update() THEN Input.update().
const ACTIONS = [
  { name:'right',      keys:['ArrowRight'],            jump:false },
  { name:'left',       keys:['ArrowLeft'],             jump:false },
  { name:'runRight',   keys:['ArrowRight','ShiftLeft'],jump:false },
  { name:'runLeft',    keys:['ArrowLeft','ShiftLeft'], jump:false },
  { name:'jumpRight',  keys:['ArrowRight'],            jump:true  },
  { name:'jumpLeft',   keys:['ArrowLeft'],             jump:true  },
  { name:'jumpUp',     keys:[],                        jump:true  },
  { name:'jumpRunR',   keys:['ArrowRight','ShiftLeft'],jump:true  },
  { name:'jumpRunL',   keys:['ArrowLeft','ShiftLeft'], jump:true  },
];

export function reachable(levelDef, targetFn, opts = {}) {
  const maxStates = opts.maxStates || 14000;
  const GRID = 8;
  const key = p => `${Math.round(p.x/GRID)},${Math.round(p.y/GRID)}`;
  const level = new Level(levelDef);
  // PowerGate's constructor hard-sets 	his.open = false and IGNORES any open in
  // the level def, so simulating an opened fence MUST be done on the live object.
  // My first attempt set it in the JSON, which silently ran the CLOSED state twice
  // and looked like a symmetric result. opts.open mutates the constructed level.
  if (opts.open) opts.open(level);
  const probe = new Player(levelDef.playerStart.x, levelDef.playerStart.y);
  const snap  = p => ({ x:p.x, y:p.y, vx:p.vx, vy:p.vy, grounded:p.grounded });
  const load  = (p,s) => { p.x=s.x; p.y=s.y; p.vx=s.vx; p.vy=s.vy; p.grounded=s.grounded; };

  // settle the spawn onto the ground first
  setKeys([]); for (let i=0;i<40;i++){ probe.update(1/60, level); Input.update(); }
  const start = snap(probe);
  const seen = new Set([key(start)]);
  const queue = [start];
  const visited = [start];
  let hit = null;

  while (queue.length && seen.size < maxStates) {
    const st = queue.shift();
    for (const a of ACTIONS) {
      load(probe, st);
      setKeys(a.keys.concat(a.jump ? ['ArrowUp'] : []));
      probe.update(1/60, level); Input.update();
      if (a.jump) { fire('keyup','ArrowUp'); }        // edge-trigger: release after 1 frame
      let frames = 0;
      // run until landed again, or long enough for a full arc / walk segment
      while (frames < 70) {
        probe.update(1/60, level); Input.update();
        frames++;
        if (frames > 6 && probe.grounded) break;
      }
      if (probe.y > 2000 || Number.isNaN(probe.x)) continue;   // fell out of the world
      const ns = snap(probe);
      const k = key(ns);
      if (targetFn(probe)) { hit = { via:a.name, x:probe.x, y:probe.y }; return { reached:true, hit, explored:seen.size }; }
      if (!seen.has(k) && probe.grounded) { seen.add(k); queue.push(ns); visited.push(ns); }
    }
  }
  return { reached:false, explored:seen.size, visited };
}

export function chestTarget(levelDef) {
  const ch = levelDef.chests[0];
  const cx = ch.x + 16, cy = ch.y + 16;
  return (p) => Math.hypot(p.cx - cx, p.cy - cy) < INTERACT_RADIUS;
}

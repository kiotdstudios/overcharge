/**
 * background.js — Procedural parallax city backdrop for OVERCHARGE
 *
 * API:
 *   init(levelWidth)   — call once on game start; creates all DOM layers
 *   update(cameraX)    — call every frame; drives parallax transforms
 *
 * No external images. Pure HTML/CSS divs + a rain canvas.
 * pointer-events: none everywhere — zero gameplay impact.
 */

const GAME_W = 800;
const GAME_H = 450;

// ─── module state ──────────────────────────────────────────────────────────
let _container = null;
let _layers    = [];   // [{el, factor}]
let _ltg       = null; // lightning flash element
let _rainCtx   = null;
let _drops     = [];
let _ltgTimer  = 0;
let _ltgNext   = 5 + Math.random() * 8;

// ─── tiny xorshift RNG (deterministic, seeded) ─────────────────────────────
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967295;
  };
}

// ─── DOM helpers ───────────────────────────────────────────────────────────
function el(tag = 'div', styles = {}, parent = null) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  if (parent) parent.appendChild(e);
  return e;
}
function div(styles = {}, parent = null) { return el('div', styles, parent); }

// ─── SVG window tile (data URI, no external files) ─────────────────────────
// Creates a tiling window pattern: winW×winH window, gapX×gapY spacing.
function winTile(winW, winH, gapX, gapY, color) {
  const tw = winW + gapX, th = winH + gapY;
  const ox = (gapX / 2) | 0, oy = (gapY / 2) | 0;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${tw}' height='${th}'>`
            + `<rect x='${ox}' y='${oy}' width='${winW}' height='${winH}' fill='${color}'/>`
            + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ─── viewport info ─────────────────────────────────────────────────────────
function vp() {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  return { s, vw: window.innerWidth, vh: window.innerHeight };
}

// ─── layer width calculation ────────────────────────────────────────────────
// Layer must cover: full viewport + full parallax travel range + buffer.
function calcLayerW(factor, maxCamX, v) {
  return Math.ceil(v.vw + maxCamX * factor * v.s) + 600;
}

// ══════════════════════════════════════════════════════════════════════════════
// CSS ANIMATIONS (injected once)
// ══════════════════════════════════════════════════════════════════════════════
function injectStyles() {
  if (document.getElementById('_bg_styles')) return;
  const s = document.createElement('style');
  s.id = '_bg_styles';
  s.textContent = `
    @keyframes bgCloud   { from{transform:translateX(0)} to{transform:translateX(180px)} }
    @keyframes bgFlicker { 0%,44%,56%,100%{opacity:1} 45%,55%{opacity:0} }
    @keyframes bgBlink   { 0%,48%,100%{opacity:1} 49%,97%{opacity:0} }
    @keyframes bgSteam   { 0%{transform:translateY(0) scaleX(1);opacity:.5}
                          100%{transform:translateY(-28px) scaleX(2);opacity:0} }
    @keyframes bgPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — SKY
// ══════════════════════════════════════════════════════════════════════════════
function buildSky(parent, lw, v) {
  const vh = v.vh;
  const r  = rng(1);

  // Background gradient
  div({
    position:'absolute', top:'0', left:'0', width:`${lw}px`, height:'100%',
    background:`linear-gradient(180deg,
      #020508 0%,
      #060d1c 22%,
      #091526 50%,
      #0d1c38 75%,
      #112040 100%)`,
  }, parent);

  // Stars — 1px box-shadow cluster on a single pixel div
  const starDiv = div({ position:'absolute', top:'0', left:'0', width:'1px', height:'1px' }, parent);
  const shadows = [];
  for (let i = 0; i < 350; i++) {
    const x = (r() * lw) | 0;
    const y = (r() * vh * 0.7) | 0;
    const a = (0.15 + r() * 0.85).toFixed(2);
    const size = r() > 0.97 ? '1px 1px' : '0 0';
    shadows.push(`${x}px ${y}px ${size} rgba(190,210,255,${a})`);
  }
  starDiv.style.boxShadow = shadows.join(',');

  // Distant moon glow
  div({
    position:'absolute',
    left:`${(lw * 0.14)|0}px`, top:`${(vh * 0.07)|0}px`,
    width:'60px', height:'60px',
    borderRadius:'50%',
    background:'radial-gradient(circle, rgba(200,220,255,0.12) 0%, transparent 65%)',
    boxShadow:'0 0 80px 30px rgba(100,150,230,0.05)',
  }, parent);

  // Slow clouds — blurry shapes that drift
  for (let i = 0; i < 8; i++) {
    const cw = (100 + r() * 280) | 0;
    const ch = (18  + r() * 55)  | 0;
    div({
      position:'absolute',
      left:`${(r() * lw * 0.9)|0}px`,
      top:`${(r() * vh * 0.45)|0}px`,
      width:`${cw}px`, height:`${ch}px`,
      borderRadius:'50%',
      background:`rgba(60,100,160,${(0.03 + r()*0.07).toFixed(3)})`,
      filter:'blur(14px)',
      animation:`bgCloud ${(55+r()*90).toFixed(0)}s linear infinite`,
      animationDelay:`-${(r()*70).toFixed(0)}s`,
    }, parent);
  }

  // Horizon haze
  div({
    position:'absolute', bottom:'0', left:'0', width:`${lw}px`, height:'35%',
    background:'linear-gradient(180deg, transparent 0%, rgba(18,40,80,0.35) 100%)',
  }, parent);

  // Lightning flash element (controlled from JS)
  _ltg = div({
    position:'absolute', top:'0', left:'0', width:`${lw}px`, height:'100%',
    background:'radial-gradient(ellipse 50% 35% at 65% 15%, rgba(160,210,255,0.28) 0%, transparent 70%)',
    opacity:'0',
    transition:'opacity 0.04s',
    pointerEvents:'none',
  }, parent);
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — FAR CITY (silhouettes, barely-visible windows)
// ══════════════════════════════════════════════════════════════════════════════
function buildFarCity(parent, lw, v) {
  const vh = v.vh;
  const r  = rng(2);
  const win = winTile(2, 3, 7, 9, 'rgba(255,200,80,0.045)');

  let x = 0;
  while (x < lw) {
    const bw = (22 + r() * 65) | 0;
    const bh = (vh * (0.07 + r() * 0.26)) | 0;
    const c  = r() > 0.55 ? '#0b1219' : '#0e1622';

    const b = div({
      position:'absolute', left:`${x}px`, bottom:'0',
      width:`${bw}px`, height:`${bh}px`,
      background: c,
      backgroundImage: win,
    }, parent);

    // Simple antenna on tall buildings
    if (bh > vh * 0.18 && r() > 0.6) {
      div({
        position:'absolute', top:`-${(8 + r()*18)|0}px`,
        left:`${(bw*0.5)|0}px`, width:'1px', height:`${(8+r()*18)|0}px`,
        background:'#0c1520',
      }, b);
    }

    x += bw + (r() * 6 | 0);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — MID CITY (more detail, billboards, water towers)
// ══════════════════════════════════════════════════════════════════════════════
function buildMidCity(parent, lw, v) {
  const vh = v.vh;
  const r  = rng(3);

  let x = 0;
  while (x < lw) {
    const bw = (38 + r() * 115) | 0;
    const bh = (vh * (0.16 + r() * 0.40)) | 0;
    const c  = r() > 0.5 ? '#121c2a' : '#172233';
    const winColor = r() > 0.45
      ? 'rgba(255,200,75,0.18)'
      : 'rgba(100,190,255,0.13)';
    const ww = 3 + (r() * 3 | 0), wh = 4 + (r() * 4 | 0);

    const b = div({
      position:'absolute', left:`${x}px`, bottom:'0',
      width:`${bw}px`, height:`${bh}px`,
      background: c,
      backgroundImage: winTile(ww, wh, 6, 9, winColor),
    }, parent);

    // Roof line
    div({ position:'absolute', top:'0', left:'0', right:'0', height:'2px', background:'#1c2f44' }, b);

    // Antenna
    if (r() > 0.5) {
      const aH = (12 + r() * 28) | 0;
      div({
        position:'absolute', top:`-${aH}px`,
        left:`${(bw*0.25 + r()*bw*0.5)|0}px`, width:'1px', height:`${aH}px`,
        background:'#131f2e',
      }, b);
    }

    // Water tower
    if (bh > vh * 0.25 && r() > 0.6) {
      const tw = (14 + r() * 10) | 0;
      const th = (12 + r() * 10) | 0;
      const tx = (bw * 0.2 + r() * bw * 0.5) | 0;
      const tower = div({
        position:'absolute', top:`-${th + 10}px`, left:`${tx}px`,
        width:`${tw}px`, height:`${th}px`,
        background:'#0f1c2c', borderRadius:'2px 2px 0 0',
      }, b);
      div({ position:'absolute', bottom:'-8px', left:'2px',  width:'2px', height:'8px', background:'#0f1c2c' }, tower);
      div({ position:'absolute', bottom:'-8px', right:'2px', width:'2px', height:'8px', background:'#0f1c2c' }, tower);
    }

    // Billboard (occasional)
    if (r() > 0.78) {
      const bboards = [
        'rgba(20,55,100,0.55)',
        'rgba(60,18,80,0.45)',
        'rgba(18,75,55,0.45)',
        'rgba(90,40,10,0.45)',
      ];
      div({
        position:'absolute',
        top:`${(bh * (0.08 + r()*0.15))|0}px`,
        left:`${(bw * 0.08)|0}px`,
        width:`${(bw * 0.65)|0}px`,
        height:`${(bh * 0.16)|0}px`,
        background: bboards[Math.floor(r()*bboards.length)],
        boxShadow:'0 0 10px rgba(80,160,255,0.08)',
      }, b);
    }

    x += bw + (2 + r() * 14 | 0);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 4 — NEAR CITY (large, detailed, neon, fire escapes, flickering)
// ══════════════════════════════════════════════════════════════════════════════
const NEON = [
  { g:'#ff1a55', d:'rgba(255,20,70,0.55)'   },
  { g:'#44ccff', d:'rgba(40,190,255,0.55)'  },
  { g:'#ff8800', d:'rgba(255,120,0,0.55)'   },
  { g:'#cc33ff', d:'rgba(180,40,255,0.50)'  },
  { g:'#33ffaa', d:'rgba(30,220,120,0.45)'  },
  { g:'#ffee00', d:'rgba(255,220,0,0.50)'   },
];

function buildNearCity(parent, lw, v) {
  const vh = v.vh;
  const r  = rng(4);

  let x = 0;
  while (x < lw) {
    const bw   = (65 + r() * 170) | 0;
    const bh   = (vh * (0.35 + r() * 0.45)) | 0;
    const cv   = r();
    const shade = cv < 0.33 ? '#162436' : cv < 0.66 ? '#1b2d42' : '#12202e';

    // Window style — some buildings lean warm, some lean cool
    const winColor = r() > 0.5 ? 'rgba(255,200,75,0.38)' : 'rgba(100,200,255,0.25)';
    const ww = 4 + (r()*3|0), wh = 5 + (r()*4|0);
    const wgx = 5+(r()*4|0), wgy = 6+(r()*5|0);

    const b = div({
      position:'absolute', left:`${x}px`, bottom:'0',
      width:`${bw}px`, height:`${bh}px`,
      background: shade,
      backgroundImage: winTile(ww, wh, wgx, wgy, winColor),
      boxShadow:'inset 0 0 40px rgba(0,0,0,0.55)',
    }, parent);

    // Roof trim
    div({ position:'absolute', top:'0', left:'0', right:'0', height:'3px', background:'#1f3a56' }, b);

    // Non-rectangular silhouette — setback upper portion on 45% of buildings
    if (r() > 0.55 && bw > 80) {
      const sw = (bw * (0.45 + r() * 0.4)) | 0;
      const sh = (bh * (0.25 + r() * 0.25)) | 0;
      div({
        position:'absolute', top:'0', left:`${bw - sw}px`,
        width:`${sw}px`, height:`${sh}px`,
        background: shade, zIndex:'2',
      }, b);
    }

    // Rooftop equipment
    _rooftopDetail(b, bw, bh, r);

    // Neon sign
    if (r() > 0.48) {
      const nc = NEON[Math.floor(r() * NEON.length)];
      const sw = (18 + r() * bw * 0.45) | 0;
      const sh = (5  + r() * 10) | 0;
      const sy = (bh * (0.08 + r() * 0.5)) | 0;
      const sx = (bw * 0.04 + r() * bw * 0.45) | 0;
      div({
        position:'absolute', left:`${sx}px`, top:`${sy}px`,
        width:`${sw}px`, height:`${sh}px`,
        background: nc.d,
        boxShadow:`0 0 8px 2px ${nc.g}, 0 0 18px 4px ${nc.g}55`,
        borderRadius:'1px',
        animation:`bgPulse ${(2 + r()*4).toFixed(1)}s ease-in-out infinite`,
        animationDelay:`-${(r()*4).toFixed(1)}s`,
      }, b);
    }

    // Fire escape (partial — just horizontal bars down one side)
    if (bw > 90 && r() > 0.62) {
      const fex = r() > 0.5 ? 4 : bw - 12;
      const startY = (bh * 0.35) | 0;
      for (let fy = startY; fy < bh; fy += 13) {
        div({
          position:'absolute', left:`${fex}px`, top:`${fy}px`,
          width:'9px', height:'2px',
          background:'rgba(25,55,80,0.95)',
        }, b);
      }
      // Vertical rail
      div({
        position:'absolute', left:`${fex + 4}px`, top:`${startY}px`,
        width:'1px', height:`${bh - startY}px`,
        background:'rgba(25,55,80,0.7)',
      }, b);
    }

    // Flickering window (3-5 per tall building)
    const fwCount = bh > vh * 0.5 ? (2 + (r()*3|0)) : (r() > 0.6 ? 1 : 0);
    for (let fw = 0; fw < fwCount; fw++) {
      div({
        position:'absolute',
        left:`${(r() * (bw - ww - 6) + 3)|0}px`,
        top:`${(bh * 0.1 + r() * bh * 0.7)|0}px`,
        width:`${ww + 2}px`, height:`${wh + 2}px`,
        background:'rgba(255,225,110,0.92)',
        boxShadow:`0 0 5px 2px rgba(255,200,80,0.7)`,
        animation:`bgFlicker ${(1.5 + r()*7).toFixed(1)}s step-start infinite`,
        animationDelay:`-${(r()*10).toFixed(1)}s`,
        zIndex:'3',
      }, b);
    }

    x += bw + (6 + r() * 20 | 0);
  }
}

// Rooftop equipment factory
function _rooftopDetail(b, bw, bh, r) {
  const t = r();
  if (t < 0.28) {
    // Antenna cluster
    const count = 1 + (r()*3|0);
    for (let i = 0; i < count; i++) {
      const aH = (16 + r() * 35) | 0;
      const aX = (bw * 0.1 + r() * bw * 0.75) | 0;
      const ant = div({
        position:'absolute', top:`-${aH}px`, left:`${aX}px`,
        width:'1px', height:`${aH}px`,
        background:'#1c2e40',
      }, b);
      if (r() > 0.35) {
        div({
          position:'absolute', top:'0', left:'-1px',
          width:'3px', height:'3px', borderRadius:'50%',
          background:'rgba(255,50,50,0.9)',
          boxShadow:'0 0 5px 2px rgba(255,30,30,0.7)',
          animation:`bgBlink ${(0.8+r()*1.8).toFixed(1)}s step-start infinite`,
          animationDelay:`-${(r()*2).toFixed(1)}s`,
        }, ant);
      }
    }
  } else if (t < 0.52) {
    // Water tower
    const tw = (18 + r() * 14) | 0;
    const th = (16 + r() * 12) | 0;
    const tx = (bw * 0.1 + r() * bw * 0.65) | 0;
    const tower = div({
      position:'absolute', top:`-${th + 12}px`, left:`${tx}px`,
      width:`${tw}px`, height:`${th}px`,
      background:'#0d1b2b', borderRadius:'2px 2px 0 0',
    }, b);
    div({ position:'absolute', bottom:'-12px', left:'3px',    width:'3px', height:'12px', background:'#0d1b2b' }, tower);
    div({ position:'absolute', bottom:'-12px', right:'3px',   width:'3px', height:'12px', background:'#0d1b2b' }, tower);
    div({ position:'absolute', top:'-5px',     left:`${tw/2-6|0}px`, width:'12px', height:'5px', background:'#0d1b2b', borderRadius:'2px' }, tower);
  } else if (t < 0.72) {
    // HVAC + vent stack
    const hw = (22 + r() * 35) | 0;
    div({
      position:'absolute', top:'-11px', left:`${(bw*0.08 + r()*bw*0.55)|0}px`,
      width:`${hw}px`, height:'11px',
      background:'#0f1e2e', borderRadius:'1px',
    }, b);
    // Steam puff above vent
    const vent = div({
      position:'absolute', top:'-22px', left:`${(bw*0.08 + r()*bw*0.55 + hw*0.4)|0}px`,
      width:'7px', height:'7px', borderRadius:'50%',
      background:'rgba(100,160,210,0.2)', filter:'blur(4px)',
      animation:`bgSteam ${(2.5+r()*4).toFixed(1)}s ease-out infinite`,
      animationDelay:`-${(r()*4).toFixed(1)}s`,
    }, b);
  } else if (t < 0.86) {
    // Billboard on roof
    const nc = NEON[Math.floor(r() * NEON.length)];
    const bw2 = (25 + r() * bw * 0.4) | 0;
    div({
      position:'absolute', top:`-${(20 + r()*18)|0}px`,
      left:`${(bw*0.15 + r()*bw*0.45)|0}px`,
      width:`${bw2}px`, height:`${(16 + r()*10)|0}px`,
      background:`rgba(10,20,35,0.9)`,
      border:`1px solid ${nc.g}88`,
      boxShadow:`0 0 10px 2px ${nc.g}44`,
    }, b);
  }
  // else: flat roof
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 5 — FOREGROUND (large silhouettes, power lines, steam)
// ══════════════════════════════════════════════════════════════════════════════
function buildForeground(parent, lw, v) {
  const vh = v.vh;
  const r  = rng(5);

  // Power cables — two horizontal lines across full width
  [0.13, 0.20].forEach(yFrac => {
    div({
      position:'absolute', top:`${(vh * yFrac)|0}px`, left:'0',
      width:`${lw}px`, height:'1px',
      background:'rgba(12,22,38,0.9)',
      boxShadow:'0 1px 0 rgba(12,22,38,0.4)',
    }, parent);
  });

  // Utility poles along the cable lines
  for (let px = 60; px < lw; px += (160 + r() * 180) | 0) {
    const poleH = (vh * 0.17) | 0;
    const pole = div({
      position:'absolute', left:`${px}px`, top:`${(vh*0.07)|0}px`,
      width:'3px', height:`${poleH}px`,
      background:'#0a141e',
    }, parent);
    // Crossbar
    div({ position:'absolute', top:'8px', left:'-11px', width:'25px', height:'2px', background:'#0a141e' }, pole);
    // Insulators (tiny nubs)
    [-8, 8].forEach(ox => {
      div({ position:'absolute', top:'5px', left:`${ox}px`, width:'3px', height:'4px', background:'#0c1828', borderRadius:'1px' }, pole);
    });
  }

  // Large foreground building silhouettes (partial, cropped by viewport)
  let x = 0;
  while (x < lw) {
    const bw   = (90 + r() * 220) | 0;
    const bh   = (vh * (0.38 + r() * 0.55)) | 0;
    const gap  = r() * 50;     // occasional alley gap
    const skip = r() < 0.28;   // ~28% chance of gap instead of building

    if (!skip) {
      const shade = r() > 0.5 ? '#08111a' : '#0a1620';
      const b = div({
        position:'absolute', left:`${x}px`, bottom:'0',
        width:`${bw}px`, height:`${bh}px`,
        background: shade,
      }, parent);

      // Roof ledge
      div({ position:'absolute', top:'0', left:'0', right:'0', height:'3px', background:'#0e1e2e' }, b);

      // Vent + steam
      if (r() > 0.45) {
        const vx = (r() * bw * 0.65) | 0;
        const ventEl = div({
          position:'absolute', top:'-9px', left:`${vx}px`,
          width:'9px', height:'9px', background:'#0a1520', borderRadius:'1px',
        }, b);
        div({
          position:'absolute', top:'-20px', left:'1px',
          width:'7px', height:'8px', borderRadius:'50%',
          background:'rgba(80,130,180,0.18)', filter:'blur(5px)',
          animation:`bgSteam ${(2+r()*5).toFixed(1)}s ease-out infinite`,
          animationDelay:`-${(r()*5).toFixed(1)}s`,
        }, ventEl);
      }

      // Occasional neon edge light on very near buildings
      if (r() > 0.72) {
        const nc = NEON[Math.floor(r() * NEON.length)];
        div({
          position:'absolute', top:'3px', left:'0', right:'0', height:'2px',
          background: nc.d,
          boxShadow:`0 0 10px 3px ${nc.g}, 0 0 20px 6px ${nc.g}44`,
        }, b);
      }
    }

    x += bw + gap + (r() * 10 | 0);
  }

  // Ground-level fog strip
  div({
    position:'absolute', bottom:'0', left:'0',
    width:`${lw}px`, height:`${(vh*0.12)|0}px`,
    background:'linear-gradient(180deg, transparent, rgba(8,18,35,0.45))',
  }, parent);
}

// ══════════════════════════════════════════════════════════════════════════════
// RAIN
// ══════════════════════════════════════════════════════════════════════════════
function initRain(vw, vh) {
  _drops = [];
  for (let i = 0; i < 140; i++) {
    _drops.push({
      x: Math.random() * vw,
      y: Math.random() * vh,
      len:   9  + Math.random() * 15,
      speed: 300 + Math.random() * 220,
      alpha: 0.06 + Math.random() * 0.10,
    });
  }
}

function drawRain(dt, vw, vh) {
  if (!_rainCtx) return;
  _rainCtx.clearRect(0, 0, vw, vh);
  _rainCtx.lineWidth = 0.6;
  for (const d of _drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.12 * dt;
    if (d.y > vh + d.len) { d.y = -d.len; d.x = Math.random() * vw; }
    if (d.x < 0)          { d.x = vw + 5; }
    _rainCtx.globalAlpha = d.alpha;
    _rainCtx.strokeStyle = `rgba(130,175,225,1)`;
    _rainCtx.beginPath();
    _rainCtx.moveTo(d.x, d.y);
    _rainCtx.lineTo(d.x - d.len * 0.12, d.y + d.len);
    _rainCtx.stroke();
  }
  _rainCtx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════════════════════
// LIGHTNING
// ══════════════════════════════════════════════════════════════════════════════
function tickLightning(dt) {
  if (!_ltg) return;
  _ltgTimer += dt;
  if (_ltgTimer < _ltgNext) return;
  _ltgTimer = 0;
  _ltgNext  = 4 + Math.random() * 12;
  // Double-flash
  _ltg.style.opacity = '1';
  setTimeout(() => { _ltg.style.opacity = '0';   },  55);
  setTimeout(() => { _ltg.style.opacity = '0.45'; },  80);
  setTimeout(() => { _ltg.style.opacity = '0';   }, 140);
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * init(levelWidth)
 * Creates all parallax layers and inserts the container before the canvas.
 * Call once when the game starts.
 */
export function init(levelWidth = 3200) {
  injectStyles();

  const v       = vp();
  const maxCamX = levelWidth - GAME_W;

  // Root container — fixed, full viewport, behind everything
  _container = div({
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '0',
    overflow:      'hidden',
  });
  document.body.insertBefore(_container, document.body.firstChild);

  // Layer config
  const defs = [
    { factor: 0.03, build: buildSky        },
    { factor: 0.12, build: buildFarCity    },
    { factor: 0.28, build: buildMidCity    },
    { factor: 0.50, build: buildNearCity   },
    { factor: 0.75, build: buildForeground },
  ];

  _layers = [];
  for (const d of defs) {
    const lw   = calcLayerW(d.factor, maxCamX, v);
    const layer = div({
      position:    'absolute',
      top:         '0',
      left:        '0',
      width:       `${lw}px`,
      height:      '100%',
      willChange:  'transform',
    }, _container);
    d.build(layer, lw, v);
    _layers.push({ el: layer, factor: d.factor });
  }

  // Rain canvas — floats above all layers, covers full viewport
  const rc = el('canvas', {
    position:      'absolute',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
  }, _container);
  rc.width  = v.vw;
  rc.height = v.vh;
  _rainCtx  = rc.getContext('2d');
  initRain(v.vw, v.vh);

  // Atmospheric RAF loop (rain + lightning — lightweight, independent)
  let last = 0;
  (function atmoLoop(now) {
    requestAnimationFrame(atmoLoop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    drawRain(dt, v.vw, v.vh);
    tickLightning(dt);
  })(0);
}

/**
 * update(cameraX)
 * Drive the parallax. Call every frame from the game render loop.
 * cameraX is the game's horizontal camera position in game-world pixels.
 */
export function update(cameraX) {
  const { s } = vp();
  for (const layer of _layers) {
    const offset = (cameraX * layer.factor * s) | 0;
    layer.el.style.transform = `translate3d(${-offset}px,0,0)`;
  }
}

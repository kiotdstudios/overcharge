// TITLE STORM — CHIEF 2026-09-19 17:17 "add lighting flashing; lets make this more
// dynamic". Asserts the storm's TIMING and DETERMINISM, and that the draw path
// actually executes against a recording canvas. A visual effect nobody can assert is
// a visual effect that silently dies in a refactor.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,location:{search:''}};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},body:{style:{}},
  createElement:()=>({getContext:()=>null,style:{}})};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(){}};

const UI = await import('../src_scroll/ui.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

// Recording canvas: counts calls and captures what was asked for, so "did it draw a
// bolt" is a measurement rather than an opinion.
function recCtx() {
  const r = { strokes:0, fills:0, gradients:0, texts:[], placed:[], lineWidths:[], shadowPeak:0, alphas:[], pts:[], paths:[], cur:null };
  const g = { addColorStop(){} };
  return { rec:r,
    set shadowBlur(v){ if(v>r.shadowPeak) r.shadowPeak=v; }, get shadowBlur(){ return 0; },
    set globalAlpha(v){ r.alphas.push(v); }, get globalAlpha(){ return 1; },
    set lineWidth(v){ r.lineWidths.push(v); }, get lineWidth(){ return 1; },
    shadowColor:'', fillStyle:'', strokeStyle:'', font:'', textAlign:'',
    fillRect(){ r.fills++; },
    beginPath(){ r.cur=[]; r.paths.push(r.cur); },
    moveTo(x,y){ if(r.cur) r.cur.push({x,y}); r.pts.push({x,y}); },
    lineTo(x,y){ if(r.cur) r.cur.push({x,y}); r.pts.push({x,y}); },
    stroke(){ r.strokes++; }, fill(){ r.fills++; },
    fillText(s,x,y){ r.texts.push(s); r.placed.push({s,x,y}); },
    createLinearGradient(){ r.gradients++; return g; },
    createRadialGradient(){ r.gradients++; return g; },
    save(){}, restore(){}, measureText:()=>({width:100}), arc(){}, closePath(){},
  };
}

sec('Determinism — the same t always gives the same storm');
{
  for (const t of [0, 1.234, 7.77, 61.5, 900.25]) {
    const a = UI.titleStormState(t), b = UI.titleStormState(t);
    ok(JSON.stringify(a)===JSON.stringify(b), `t=${t} is reproducible`, `flash=${a.flash.toFixed(3)} near=${a.near}`);
  }
}

sec('Lightning actually fires, and is DARK most of the time');
{
  // Sampled over 5 minutes of title idling at 60fps.
  let bright=0, total=0, peaks=0, prev=0;
  const gaps=[]; let lastPeakT=null;
  for (let i=0;i<18000;i++) {
    const t = i/60;
    const f = UI.titleStormState(t).flash;
    total++;
    if (f > 0.5) bright++;
    if (f >= 0.999 && prev < 0.999) { peaks++; if(lastPeakT!==null) gaps.push(t-lastPeakT); lastPeakT=t; }
    prev = f;
  }
  ok(peaks > 40, 'full-brightness strikes occur repeatedly over 5 minutes', `${peaks} strikes`);
  const brightPct = 100*bright/total;
  ok(brightPct < 12, 'but the screen is dark the great majority of the time', `${brightPct.toFixed(1)}% above half brightness — a strobe would read as broken, not dramatic`);
  const min=Math.min(...gaps), max=Math.max(...gaps), avg=gaps.reduce((a,b)=>a+b,0)/gaps.length;
  ok(max - min > 0.5, 'gaps between strikes are IRREGULAR, not metronomic',
    `min ${min.toFixed(2)}s, avg ${avg.toFixed(2)}s, max ${max.toFixed(2)}s`);
  ok(min > 0.3, 'and never so close together that it strobes', `closest pair ${min.toFixed(2)}s apart`);
}

sec('The double-flash shape is intact (reused from background.js tickLightning)');
{
  // Find a near strike and walk its envelope.
  let t0=null;
  for (let i=0;i<4000;i++){ const t=i/60; const s=UI.titleStormState(t); if(s.near && s.flash>=0.999){ t0=t; break; } }
  ok(t0!==null, 'a near strike exists to measure');
  if (t0!==null) {
    const at = x => UI.titleStormState(t0 + x).flash;
    ok(at(0) >= 0.999,            'strike frame is full brightness');
    ok(at(0.07) < 0.2,            'then a brief dark gap', `${at(0.07).toFixed(2)} at +70ms — this is the double-flash beat`);
    ok(at(0.12) > 0.3,            'then a weaker second hit', `${at(0.12).toFixed(2)} at +120ms`);
    ok(at(0.30) > 0 && at(0.30) < 0.3, 'then a soft afterglow', `${at(0.30).toFixed(2)} at +300ms`);
    ok(at(0.60) === 0,            'fully dark within 600ms', 'no lingering wash');
  }
}

sec('INVARIANT: a flash can never be truncated by the cycle boundary');
{
  // STRIKE_JITTER + FLASH_DUR must stay under STRIKE_PERIOD, or a late strike is cut
  // off mid-flash when the cycle rolls over. Read from the REAL dial rather than
  // hard-coded here, so a tuning change cannot pass by drifting away from the copy.
  const D = UI.STORM_DIAL;
  const margin = D.STRIKE_PERIOD - (D.STRIKE_JITTER + D.FLASH_DUR);
  ok(margin > 0.1,
    'the dial leaves real headroom for a late strike to finish',
    `period ${D.STRIKE_PERIOD} - (jitter ${D.STRIKE_JITTER} + flash ${D.FLASH_DUR}) = ${margin.toFixed(2)}s margin`);
  let truncated = 0;
  for (let c=0;c<500;c++) {
    const endT = (c+1)*D.STRIKE_PERIOD - 1/60;
    const s = UI.titleStormState(endT);
    if (s.flash > 0.001 && UI.titleStormState(endT + 1/60).cycle !== s.cycle) truncated++;
  }
  ok(truncated === 0, 'and no strike is actually still lit when its cycle ends', `${truncated} truncated of 500 cycles`);
}

sec('DYNAMIC ENOUGH — Chief asked for "more dynamic", so this is measured');
{
  let peaks=0, prev=0, darkRun=0, maxDark=0, last=null;
  const gaps=[];
  for (let i=0;i<18000;i++) {
    const t=i/60, s=UI.titleStormState(t);
    if (s.flash>=0.999 && prev<0.999) { peaks++; if(last!==null) gaps.push(t-last); last=t; }
    prev=s.flash;
    if (s.flash < 0.02) { darkRun++; if (darkRun>maxDark) maxDark=darkRun; } else darkRun=0;
  }
  const maxGap = Math.max(...gaps), minGap = Math.min(...gaps);
  ok(peaks >= 100, 'at least 100 bolts in 5 minutes of idling', `${peaks} — the first pass managed 75`);
  ok(maxGap < 7, 'no dead stretch longer than 7s between bolts', `worst gap ${maxGap.toFixed(2)}s — the first pass left 14.50s`);
  ok(maxDark/60 < 3, 'and never more than 3s of completely unlit screen', `longest dark run ${(maxDark/60).toFixed(2)}s`);
  ok(minGap > 0.8, 'still not close enough together to strobe', `closest pair ${minGap.toFixed(2)}s`);
}

sec('Distant rumble variation — not every cycle is a bolt');
{
  let near=0, far=0;
  for (let c=0;c<300;c++){ const s=UI.titleStormState(c*UI.STORM_DIAL.STRIKE_PERIOD + UI.STORM_DIAL.STRIKE_JITTER + 0.9); s.near ? near++ : far++; }
  ok(near>0 && far>0, 'both near strikes and distant rumbles occur', `${near} near / ${far} distant of 300`);
  ok(far/300 > 0.15 && far/300 < 0.55, 'and the mix is balanced, not lopsided', `${(100*far/300).toFixed(0)}% distant`);
}

sec('The draw path executes and reacts to the flash');
{
  // A dark frame vs a strike frame, through the REAL drawTitleScreen.
  let darkT=null, litT=null;
  for (let i=0;i<4000;i++){ const t=i/60; const s=UI.titleStormState(t);
    if (litT===null && s.near && s.flash>=0.999) litT=t;
    if (darkT===null && s.flash===0) darkT=t; }
  const dark = recCtx(), lit = recCtx();
  UI.drawTitleScreen(dark, darkT);
  UI.drawTitleScreen(lit,  litT);
  ok(dark.rec.texts.includes('OVERCHARGE'), 'the logo still draws');
  ok(dark.rec.texts.includes('[SPACE] to start'), 'the start prompt still draws');
  ok(dark.rec.texts.includes('KIOTD STUDIOS'), 'the studio credit still draws');
  ok(dark.rec.strokes === 0,
    'a dark frame strokes NOTHING — rain is gone per Chief 17:45',
    `${dark.rec.strokes} strokes on an unlit frame`);
  ok(lit.rec.strokes > 0, 'a strike frame strokes the bolt geometry', `${lit.rec.strokes} strokes`);
  ok(lit.rec.gradients > dark.rec.gradients, 'and the sky-lift gradient only appears on a flash',
    `${lit.rec.gradients} lit vs ${dark.rec.gradients} dark`);
  ok(lit.rec.shadowPeak > dark.rec.shadowPeak, 'the logo glow spikes on the flash',
    `peak blur ${lit.rec.shadowPeak} lit vs ${dark.rec.shadowPeak} dark`);
}

sec('Bolts vary between strikes (not the same zigzag every time)');
{
  const sigs = new Set();
  let found = 0;
  for (let c=0;c<60 && found<8;c++){
    const s = UI.titleStormState(c*UI.STORM_DIAL.STRIKE_PERIOD + 1e-9);
    // sample the bolt indirectly: its stroke count varies with fork count
    const r = recCtx();
    const st = UI.titleStormState(c*UI.STORM_DIAL.STRIKE_PERIOD);
    if (!st.near) continue;
  }
  // Direct: fork count and start x are seed-driven, so two different seeds should
  // produce different line geometry. Compare recorded lineWidths length as a proxy.
  const a = recCtx(), b = recCtx();
  let ta=null, tb=null;
  for (let i=0;i<8000;i++){ const t=i/60; const s=UI.titleStormState(t);
    if (s.near && s.flash>=0.999){ if(ta===null) ta=t; else if (UI.titleStormState(ta).seed !== s.seed){ tb=t; break; } } }
  ok(ta!==null && tb!==null, 'two different strikes found to compare', `seeds ${UI.titleStormState(ta).seed} and ${UI.titleStormState(tb).seed}`);
  if (ta!==null && tb!==null) {
    UI.drawTitleScreen(a, ta); UI.drawTitleScreen(b, tb);
    ok(JSON.stringify(a.rec.pts) !== JSON.stringify(b.rec.pts),
      'the two bolts differ in geometry', `${a.rec.strokes} vs ${b.rec.strokes} strokes`);
  }
}

sec('The logo GLITCH reacts to the storm (not a constant amplitude)');
{
  // The previous version of this suite asserted the glow spike but NOT the chromatic
  // split, so a mutation pinning `split` to a constant passed 32/32. Measuring the
  // actual x positions of the three OVERCHARGE passes closes that hole.
  let darkT=null, litT=null;
  for (let i=0;i<8000;i++){ const t=i/60, s=UI.titleStormState(t);
    if (litT===null  && s.near && s.flash>=0.999) litT=t;
    if (darkT===null && s.flash===0)              darkT=t; }
  const spread = (t) => {
    const c = recCtx(); UI.drawTitleScreen(c, t);
    const xs = c.rec.placed.filter(p=>p.s==='OVERCHARGE').map(p=>p.x);
    return { n: xs.length, span: Math.max(...xs) - Math.min(...xs) };
  };
  const d = spread(darkT), l = spread(litT);
  ok(d.n === 3 && l.n === 3, 'the logo draws as three chromatic passes', `${d.n} passes`);
  ok(l.span > d.span,
    'the chromatic split WIDENS on a strike',
    `span ${d.span.toFixed(1)}px dark -> ${l.span.toFixed(1)}px lit — the glitch is driven by the lightning`);
  ok(l.span - d.span > 3, 'and the widening is large enough to actually see', `+${(l.span-d.span).toFixed(1)}px`);
}
sec('CHIEF 17:45 — bolts reach the TOP of the screen to the BOTTOM');
{
  // Measured from the recorded path coordinates, not asserted from the constant. The
  // first version stopped at y 150..270 and I would not have caught that by reading
  // the code, because the code looked deliberate.
  const H_SCREEN = 578;
  let checked = 0, tooShort = [], offFrame = 0;
  for (let c = 0; c < 400; c++) {
    const t = c * UI.STORM_DIAL.STRIKE_PERIOD + UI.titleStormState(c * UI.STORM_DIAL.STRIKE_PERIOD).age * 0;
    // land exactly on this cycle's strike frame
    let strikeT = null;
    for (let k = 0; k < 130; k++) {
      const tt = c * UI.STORM_DIAL.STRIKE_PERIOD + k / 60;
      const s = UI.titleStormState(tt);
      if (s.near && s.flash >= 0.999) { strikeT = tt; break; }
    }
    if (strikeT === null) continue;
    const r = recCtx(); UI.drawTitleScreen(r, strikeT);
    // The MAIN bolt paths are the long ones; find the tallest path drawn.
    let best = 0, bestPath = null;
    for (const p of r.rec.paths) {
      if (!p || p.length < 3) continue;
      const ys = p.map(q => q.y), span = Math.max(...ys) - Math.min(...ys);
      if (span > best) { best = span; bestPath = p; }
    }
    checked++;
    if (best < H_SCREEN - 1) tooShort.push({ c, span: best.toFixed(0) });
    if (bestPath) {
      const ys = bestPath.map(q => q.y), xs = bestPath.map(q => q.x);
      if (Math.min(...ys) > 0.5 || Math.max(...ys) < H_SCREEN - 0.5) tooShort.push({ c, span: best.toFixed(0) });
      if (Math.min(...xs) < 0 || Math.max(...xs) > 800) offFrame++;
    }
  }
  ok(checked > 200, 'enough strikes sampled to be meaningful', `${checked} strikes measured`);
  ok(tooShort.length === 0,
    'EVERY near strike draws a bolt spanning the full screen height',
    tooShort.length ? `${tooShort.length} short: ${JSON.stringify(tooShort.slice(0,3))}` : `all ${checked} span 0 -> ${H_SCREEN}px`);
  ok(offFrame === 0, 'and no bolt wanders off the left or right edge (sampled range)', `${offFrame} off-frame`);
}

sec('The edge clamp is load-bearing — anchored on the cycle that actually breaks it');
{
  // My first version of the off-frame check sampled 400 cycles and a mutation removing
  // the clamp PASSED 43/43 — a vacuous assertion. Unclamped, the x math reaches
  // -11.5 .. 810.0 on an 800px frame, but the worst offender is CYCLE 1979 (t ~ 3562s),
  // far outside a 400-cycle window. Sampling wide enough to include it is what gives
  // this assertion teeth. Anchored on the specific cycle so it cannot silently drift.
  const WORST_CYCLE = 1979;
  const P = UI.STORM_DIAL.STRIKE_PERIOD;
  let worstLo = 1e9, worstHi = -1e9, offFrame = 0, sampled = 0;
  const cycles = [WORST_CYCLE];
  for (let c = 1900; c < 2100; c++) if (c !== WORST_CYCLE) cycles.push(c);
  for (const c of cycles) {
    let strikeT = null;
    for (let k = 0; k < 130; k++) {
      const tt = c * P + k / 60;
      const s = UI.titleStormState(tt);
      if (s.near && s.flash >= 0.999) { strikeT = tt; break; }
    }
    if (strikeT === null) continue;
    sampled++;
    const r = recCtx(); UI.drawTitleScreen(r, strikeT);
    for (const p of r.rec.pts) {
      if (p.x < worstLo) worstLo = p.x;
      if (p.x > worstHi) worstHi = p.x;
      if (p.x < 0 || p.x > 800) offFrame++;
    }
  }
  ok(sampled > 100, 'the wide window sampled real strikes', `${sampled} strikes around cycle ${WORST_CYCLE}`);
  ok(offFrame === 0,
    'not one path point escapes the frame, including the known worst cycle',
    `x stayed within ${worstLo.toFixed(1)} .. ${worstHi.toFixed(1)} — unclamped this reaches -11.5 .. 810.0`);
}

sec('One or two bolts per strike — never zero on a near strike');
{
  const counts = {};
  let zero = 0, sampled = 0;
  for (let c = 0; c < 300; c++) {
    let strikeT = null;
    for (let k = 0; k < 130; k++) {
      const tt = c * UI.STORM_DIAL.STRIKE_PERIOD + k / 60;
      const s = UI.titleStormState(tt);
      if (s.near && s.flash >= 0.999) { strikeT = tt; break; }
    }
    if (strikeT === null) continue;
    sampled++;
    const r = recCtx(); UI.drawTitleScreen(r, strikeT);
    // Each full-height bolt is drawn as 3 stacked strokes (halo/mid/core), so count
    // paths that actually span the screen.
    const full = r.rec.paths.filter(p => p && p.length >= 3 &&
      (Math.max(...p.map(q=>q.y)) - Math.min(...p.map(q=>q.y))) > 570).length;
    const bolts = Math.round(full / 3);
    counts[bolts] = (counts[bolts] || 0) + 1;
    if (bolts === 0) zero++;
  }
  ok(zero === 0, 'no near strike is ever boltless', `${sampled} strikes, ${zero} boltless`);
  const keys = Object.keys(counts).map(Number).sort();
  ok(keys.every(k => k === 1 || k === 2), 'bolt count is always 1 or 2, exactly as asked',
    `distribution ${JSON.stringify(counts)}`);
  ok(keys.length === 2, 'and BOTH counts actually occur (singles and pairs)', `saw counts: ${keys.join(' and ')}`);
}

sec('RAIN IS GONE — asserted as absence so it cannot creep back');
{
  // Sample many unlit frames; if any strokes anything, something is drawing per-frame
  // ambience again.
  let strokedFrames = 0, sampled = 0;
  for (let i = 0; i < 3000; i++) {
    const t = i / 60;
    if (UI.titleStormState(t).flash !== 0) continue;
    sampled++;
    const r = recCtx(); UI.drawTitleScreen(r, t);
    if (r.rec.strokes > 0) strokedFrames++;
    if (sampled > 400) break;
  }
  ok(sampled > 100, 'plenty of unlit frames sampled', `${sampled} frames`);
  ok(strokedFrames === 0, 'not one unlit frame draws a single stroke', `${strokedFrames} of ${sampled} frames stroked`);
}
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
import fs from 'node:fs';
const sim = fs.readFileSync(new URL('./economy_sim.js', import.meta.url), 'utf8');
const out = process.argv[2] || new URL('../../../docs/design/OVERCHARGE_Level1_Charge_Economy.html', import.meta.url);

const html = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OVERCHARGE - Level 1 Charge Economy</title>
<style>
:root{--bg:#0b1020;--panel:#121a33;--panel2:#18234a;--line:#2a3a6e;--text:#e8eefc;--dim:#9fb0d8;--cyan:#44ddff;--yel:#ffcc00;--red:#ff4444;--violet:#b66cff;--ok:#5cf2a0;--warn:#ffb000}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 "Segoe UI",system-ui,sans-serif}
main{max-width:1060px;margin:0 auto;padding:28px 20px 80px}
h1{font-size:28px;margin:0 0 4px;letter-spacing:.5px}
h2{font-size:20px;margin:36px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.sub{color:var(--dim);margin:0 0 14px}
.chip{display:inline-block;padding:1px 9px;border-radius:99px;font-size:12px;font-weight:700;border:1px solid;margin-right:4px;vertical-align:1px}
.c-ok{color:var(--ok);border-color:var(--ok)}.c-rec{color:var(--yel);border-color:var(--yel)}.c-open{color:var(--red);border-color:var(--red)}.c-built{color:var(--cyan);border-color:var(--cyan)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.card b{display:block;font-size:26px;color:var(--cyan);line-height:1.1}
.card span{color:var(--dim);font-size:13px}
table{border-collapse:collapse;width:100%;margin:8px 0;background:var(--panel);border-radius:8px;overflow:hidden}
th,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--panel2);font-size:13px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.note{background:var(--panel);border-left:4px solid var(--cyan);padding:10px 14px;border-radius:6px;margin:12px 0}
.note.warn{border-color:var(--warn)}.note.bad{border-color:var(--red)}
.sim{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;margin:10px 0}
.row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;align-items:center}
button,select{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 12px;cursor:pointer}
button:hover:not(:disabled){border-color:var(--cyan)}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
button:disabled{opacity:.4;cursor:not-allowed}
button.go{border-color:var(--cyan)}button.q{border-color:var(--violet)}button.rs{border-color:var(--red)}button.zap{border-color:var(--warn)}
.meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:12px 0}
.meter label{display:flex;justify-content:space-between;font-size:13px;color:var(--dim);margin-bottom:3px}
.track{height:16px;background:#070b18;border:1px solid var(--line);border-radius:5px;overflow:hidden}
.fill{height:100%;width:0;transition:width .25s}
.cells{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;height:22px}
.cell{background:#070b18;border:1px solid var(--line);border-radius:2px;position:relative;overflow:hidden}
.cell i{position:absolute;inset:0;width:0}
.slots{display:flex;gap:6px;margin-top:4px}
.slot{width:30px;height:30px;border-radius:7px;border:2px solid var(--line);display:grid;place-items:center;font-size:12px;color:var(--dim)}
.slot.open{border-color:var(--violet)}.slot.has{background:var(--violet);color:#fff;border-color:var(--violet);box-shadow:0 0 8px var(--violet)}.slot.locked{opacity:.3;border-style:dashed}
#log{list-style:none;margin:10px 0 0;padding:0;max-height:260px;overflow:auto;font-size:13.5px}
#log li{padding:4px 8px;border-bottom:1px solid var(--line)}#log li b{color:var(--cyan);font-variant-numeric:tabular-nums}
#log li.fin{color:var(--ok);font-weight:700}#log li.ach{color:var(--yel);font-weight:700}
.big{font-variant-numeric:tabular-nums;font-size:22px;font-weight:700}
.tenant{display:inline-block;padding:2px 10px;border-radius:99px;font-weight:700;border:1px solid var(--line)}
.t-hot{color:var(--red);border-color:var(--red)}.t-ok{color:var(--ok);border-color:var(--ok)}
svg text{fill:var(--dim);font-size:12px}
.bar{display:inline-block;height:10px;border-radius:3px;background:var(--cyan);vertical-align:middle}
footer{margin-top:40px;color:var(--dim);font-size:13px}
.legend span{margin-right:14px}
.new{background:rgba(255,204,0,.12)}
@media (prefers-reduced-motion:reduce){.fill{transition:none}}
</style></head>
<body><main>
<h1>OVERCHARGE: Level 1 Charge Economy</h1>
<p class="sub">Level "NEON RISE". Updated October 16, 2026 with your new values (round 15). Everything here is computed by one small model of the rules in <code>GAME_DESIGN_V2.md</code> sections 3.1 to 3.9. Play with it in section 4.</p>
<p class="legend"><span class="chip c-ok">CONFIRMED</span>Chief decided it &nbsp; <span class="chip c-rec">RECOMMENDED</span>Kiro's pick, needs your yes &nbsp; <span class="chip c-built">BUILT</span>in the game today &nbsp; <span class="chip c-open">OPEN</span>needs a decision</p>

<h2>1. The rules in one minute</h2>
<div class="cards">
 <div class="card"><b>10</b><span>The bar holds 10 charge</span></div>
 <div class="card"><b>10</b><span>One pip is always 10</span></div>
 <div class="card"><b>1 slot</b><span>You start with one pip slot, so you can hold 20 (10 bar + 1 pip)</span></div>
 <div class="card"><b>8</b><span>Every exit gate costs 8</span></div>
 <div class="card"><b>1.2 to 3</b><span>Units per second: slow on an empty bar, fast on a full one</span></div>
 <div class="card"><b>Q</b><span>Spends a pip: pays the gate's 8, the other 2 returns to the bar</span></div>
</div>
<ul>
 <li><span class="chip c-ok">CONFIRMED</span> When the bar fills and a slot is free it banks a pip and starts again at 0, carrying any overflow. If the bar and every slot are full, absorbing is refused and the source keeps its charge.</li>
 <li><span class="chip c-ok">CONFIRMED</span> Every charged object works both ways: you can absorb from it and charge it. Its charge is its capacity.</li>
 <li><span class="chip c-ok">CONFIRMED</span> <b>The AC takes its whole 4 (rounds 15 and 15c):</b> it is an ordinary charged prop with no switch, and it only turns on when it is full (4 of 4). Charge it with Space, zap it with E. 3 of 4 is not enough: the fan stays still and she stays hot. Zap even a little out and it is off again. The tenant is relieved while it is on and hot again when it is off, but <b>the achievement stays.</b></li>
 <li><span class="chip c-ok">CONFIRMED</span> Pips come only from chests or from filling the bar. No prop gives a pip. Each Capacitor Module (later, not Level 1) adds one slot, up to 5 slots (60 charge).</li>
 <li><span class="chip c-ok">CONFIRMED</span> Every level must be completable from zero charge. Hits cost 1; the bolt (hidden in Level 1) costs 0.25.</li>
 <li><span class="chip c-built">BUILT</span> Today's code is still on the old 25-unit bar. The 10-unit bar, slots and the new speed are Codex's order <code>CODEX 02</code>, which follows <code>CODEX 03</code>.</li>
</ul>

<h2>2. Level 1 ledger</h2>
<p class="sub">Yellow rows changed in round 15. The three lamps in <code>level1.json</code> are already set to 3; everything below them is waiting for you to place it in the Builder.</p>
<table>
 <tr><th>Object</th><th class="n">Charge</th><th>Where</th><th>Status</th><th>What it does to the budget</th></tr>
 <tr class="new"><td>Streetlamp 1</td><td class="n">3 <small>(was 4)</small></td><td>x 451, the street</td><td><span class="chip c-built">BUILT</span></td><td>+3</td></tr>
 <tr class="new"><td>Streetlamp 2</td><td class="n">3 <small>(was 4)</small></td><td>x 933</td><td><span class="chip c-built">BUILT</span></td><td>+3</td></tr>
 <tr class="new"><td>Streetlamp 3</td><td class="n">3 <small>(was 4)</small></td><td>x 1664</td><td><span class="chip c-built">BUILT</span></td><td>+3</td></tr>
 <tr><td><b>Lamps only</b></td><td class="n"><b>9</b></td><td></td><td></td><td>Exit 8, so the lamps alone leave <b>1</b></td></tr>
<tr class="new"><td>Vending machine at the 24/7 market</td><td class="n">2</td><td>x 2035, in the QuickMart</td><td><span class="chip c-built">BUILT</span></td><td>+2. Lamps 9 + vending machine 2 = <b>11 in the level now</b>; the exit takes 8, so 3 are spare.</td></tr>
<tr class="new"><td>One more charged prop (Kiro suggests the <b>fuse box, 4</b>)</td><td class="n">+4</td><td>You choose</td><td><span class="chip c-open">OPEN</span></td><td>Needed: with only 11, a player who fills the AC (4) and leaves it on has 7 and cannot open the exit (8). Any prop worth 1 or more fixes it; the fuse box would make 15.</td></tr>
 <tr><td>Exit gate</td><td class="n">&minus;8</td><td>x 3136</td><td><span class="chip c-built">BUILT</span></td><td>Mandatory</td></tr>
 <tr class="new"><td>AC unit for the tenant</td><td class="n">4 <small>(was 3)</small></td><td>Up the ladder, above the spawn</td><td><span class="chip c-rec">PLANNED</span></td><td>Optional. It turns on only when it holds the full 4, and goes off when any of that is zapped out. The achievement costs 4.</td></tr>
</table>
<div class="note bad"><b>Two things that need your eye.</b>
<br>1. <b>With only the lamps and the vending machine (11 charge), an AC left on strands the player.</b> The tenant costs the full 4, so 11 &minus; 4 = 7, one short of the exit's 8. They can zap it back (the achievement stays), so nobody is trapped for good, but they might not think of it. One more charged prop worth 1 or more fixes it (12 or more); the fuse box (4) would make 15.
 <br>2. <b>The free pip is gone.</b> Three lamps of 3 make 9, which does not fill a 10 bar. The pip now appears only once the player also has the vending machine (11 = 1 pip + 1) or the extra prop. If you liked the lamp 3 pip lesson, keep the total at 10 or more before lamp 3.</div>

<h2>3. Routes, computed</h2>
<div class="row"><label for="extra">Extra prop in the level:</label>
 <select id="extra"><option value="0" selected>None (lamps + vending machine)</option><option value="1">Fuse box, 4</option></select>
 <input type="hidden" id="vend" value="2"></div>
<p class="sub">Each route is run through the same model as the simulator. "Time" is only the time spent transferring charge (walking is not counted). "Usable left" is bar + 10 &times; pips after the exit opens.</p>
<table id="routes"><thead><tr><th>Route</th><th class="n">Charge time</th><th class="n">Usable left</th><th>Ends with</th></tr></thead><tbody></tbody></table>

<h2>4. Play with it</h2>
<div class="sim">
 <div class="row">
  <label for="slots">Pip slots (Capacitor Modules):</label>
  <select id="slots"><option value="1" selected>1 (Level 1)</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select>
  <label for="fuse" style="margin-left:14px"><input type="checkbox" id="fuse"> include an extra fuse box (4)</label>
 </div>
 <div class="row" id="btns"></div>
 <div class="meters">
  <div class="meter"><label><span>Charge bar</span><span id="barv">0 / 10</span></label><div class="cells" id="cells"></div>
   <label style="margin-top:8px"><span>Pip slots</span><span id="pipv">0 banked</span></label><div class="slots" id="slotsrow"></div></div>
  <div class="meter" id="srcs"></div>
  <div class="meter"><label><span>AC unit (tenant)</span><span id="acv"></span></label><div class="track"><div class="fill" id="ac" style="background:var(--cyan)"></div></div>
   <label style="margin-top:6px"><span>Exit gate</span><span id="gatev"></span></label><div class="track"><div class="fill" id="gate" style="background:var(--ok)"></div></div>
   <div style="margin-top:10px">Tenant <span class="tenant" id="tenant"></span> &nbsp; Achievement <b id="ach">locked</b></div>
   <div style="margin-top:8px">Usable <span class="big" id="usable">0</span> &nbsp; Time <span class="big" id="clock">0.0</span> s</div></div>
 </div>
 <ul id="log" aria-live="polite"></ul>
</div>

<h2>5. How fast charge moves</h2>
<p class="sub"><span class="chip c-ok">CONFIRMED</span> slow when the bar is empty and faster as it fills, for absorbing and charging. <span class="chip c-rec">RECOMMENDED</span> numbers: rate = 3 &times; (0.4 + 0.6 &times; bar / 10).</p>
<div id="chart"></div>

<h2>6. The charge table (what each object holds)</h2>
<p class="sub"><span class="chip c-ok">CONFIRMED</span> the more powerful the object, the more charge. Yellow rows are your round 15 changes. Existing levels keep their authored numbers (Level 2 and later lamps stay 4 until you say so); the table sets the defaults for newly placed objects. The largest an object may hold is 10 (one pip).</p>
<table id="ctable"></table>

<h2>7. Open questions for you</h2>
<ol>
 <li><b>Which extra prop for Level 1?</b> The fuse box (now 4) fits: 15 total, and an AC left on still lets the player finish. Anything worth at least 1 works as the minimum (12).</li>
 <li><b>The market on the low or high route?</b> The streetlamp woman and lamp 3 are on the high route (x about 1664 to 1741). A route that skips lamp 3 has only 6 from the lamps, so the vending machine (2) is exactly what makes it 8. Put the market where both routes pass, or keep the low route's total at 8 or more some other way. (I have not checked whether a lamp can be skipped in the Level 1 as built today.)</li>
 <li>The speed floor of 40% (1.2 units/s on an empty bar): too slow, too fast? Tune in play.</li>
 <li>Locked pip slots in the HUD: show them dim (Kiro's pick) or hide them until a Capacitor Module is found?</li>
</ol>
<footer>Model file: <code>docs/GAME_DESIGN_V2.md</code> sections 3.1 to 3.9. It is a planning tool, not the game: the game's own energy code is still on the old 25-unit bar until CODEX 02 lands.</footer>
</main>
<script>
${sim}
(function(){
  var E = EconomySim, st = E.fresh({fuse: false});
  var $ = function(id){ return document.getElementById(id); };
  function colour(f){ return f < 0.3 ? 'var(--red)' : f < 0.6 ? 'var(--yel)' : 'var(--cyan)'; }
  var A = function(id){ return ['absorb', id]; };

  function routeList(fuse){
    var withFuse = function(a){ return fuse ? a.concat([A('fuse')]) : a; };
    return [
      ['A. Lamps only: 1, 2, 3, then the exit by holding Space', [A('lamp1'),A('lamp2'),A('lamp3'),['payExit']]],
      ['B. Lamps + vending machine, exit by Q (instant)', [A('lamp1'),A('lamp2'),A('lamp3'),A('vend'),['pipExit']]],
      ['C. Tenant first, fill the AC completely (4) and leave it ON: lamps 1 and 2, AC, lamp 3, vending machine' + (fuse ? ', fuse box' : ''), withFuse([A('lamp1'),A('lamp2'),['chargeAC'],A('lamp3'),A('vend')]).concat([['payExit']])],
      ['D. Tenant first, give the AC only 3 of 4 and leave (she is NOT relieved; the 3 is wasted unless taken back)', withFuse([A('lamp1'),A('lamp2'),['chargeAC',3],A('lamp3'),A('vend')]).concat([['payExit']])],
      ['E. Fill the AC, then zap it back before the exit (tenant hot again, achievement kept)', [A('lamp1'),A('lamp2'),['chargeAC'],['zapAC'],A('lamp3'),A('vend')].concat(fuse ? [A('fuse')] : []).concat([['payExit']])],
      ['F. Skip lamp 3: lamp 1, lamp 2, vending machine', [A('lamp1'),A('lamp2'),A('vend'),['payExit']]],
      ['G. Skip lamp 3 and the vending machine: lamp 1 and lamp 2 only', [A('lamp1'),A('lamp2'),['payExit']]]
    ];
  }
  function renderRoutes(){
    var fuse = $('extra').value === '1';
    var tb = document.querySelector('#routes tbody'); tb.innerHTML = '';
    routeList(fuse).forEach(function(r){
      var s = E.runRoute(r[1], {fuse: fuse, vend: +$('vend').value});
      var tr = document.createElement('tr');
      var ends = s.done ? 'Exit open' + (s.achievement ? ', achievement' : '') : '<b style="color:var(--red)">Cannot finish</b> (the exit stopped at ' + s.gate.toFixed(0) + ' of 8)';
      var left = s.done ? E.usable(s).toFixed(1) : '-';
      var td = function(t, cls){ var c = document.createElement('td'); if(cls) c.className = cls; c.innerHTML = t; tr.appendChild(c); };
      td(r[0]); td(s.t.toFixed(1) + ' s', 'n'); td(left, 'n'); td(ends);
      tb.appendChild(tr);
    });
  }
  $('extra').addEventListener('change', renderRoutes); $('vend').addEventListener('change', renderRoutes);
  renderRoutes();

  // Simulator UI
  var btns = $('btns'), cells = $('cells');
  for(var i=0;i<10;i++){ var c=document.createElement('div'); c.className='cell'; c.innerHTML='<i></i>'; cells.appendChild(c); }
  function defs(){
    var d = [
      ['Absorb lamp 1', 'go', function(){ E.actions.absorb(st,'lamp1'); }],
      ['Absorb lamp 2', 'go', function(){ E.actions.absorb(st,'lamp2'); }],
      ['Absorb lamp 3', 'go', function(){ E.actions.absorb(st,'lamp3'); }],
      ['Absorb vending machine', 'go', function(){ E.actions.absorb(st,'vend'); }]
    ];
    if('fuse' in st.src) d.push(['Absorb fuse box', 'go', function(){ E.actions.absorb(st,'fuse'); }]);
    d.push(['Charge the AC (Space)', 'go', function(){ E.actions.chargeAC(st); }]);
    d.push(['Charge the AC 3 only', 'go', function(){ E.actions.chargeAC(st, 3); }]);
    d.push(['Zap the AC (E)', 'zap', function(){ E.actions.zapAC(st); }]);
    d.push(['Pay the exit, hold Space', 'go', function(){ E.actions.payExit(st); }]);
    d.push(['Q: pip to the exit', 'q', function(){ E.actions.pipExit(st); }]);
    d.push(['Reset', 'rs', null]);
    return d;
  }
  var cur = [];
  function buildButtons(){
    btns.innerHTML = ''; cur = defs();
    cur.forEach(function(d){
      var b = document.createElement('button'); b.type='button'; b.textContent = d[0]; if(d[1]) b.className = d[1];
      b.addEventListener('click', function(){
        if(d[2]===null){ reset(); return; }
        if(st.done) return;
        d[2](); render();
      });
      btns.appendChild(b);
    });
  }
  function reset(){ st = E.fresh({slots: +$('slots').value, fuse: $('fuse').checked, vend: +$('vend').value}); buildButtons(); render(); }
  $('slots').addEventListener('change', reset);
  $('fuse').addEventListener('change', reset); $('vend').addEventListener('change', reset);
  function setFill(el, frac){ el.style.width = Math.max(0,Math.min(1,frac))*100+'%'; }
  var LABEL = {lamp1:'Lamp 1',lamp2:'Lamp 2',lamp3:'Lamp 3',vend:'Vending machine',fuse:'Fuse box'};
  function render(){
    var cs = cells.children, bar = st.bar;
    for(var i=0;i<10;i++){ var f = Math.max(0, Math.min(1, bar - i)); var el = cs[i].firstChild; el.style.width = f*100+'%'; el.style.background = colour(bar/10); }
    $('barv').textContent = bar.toFixed(1) + ' / 10';
    var row = $('slotsrow'); row.innerHTML = '';
    for(var k=0;k<5;k++){ var s = document.createElement('div'); s.className = 'slot ' + (k >= st.slots ? 'locked' : k < st.pips ? 'has' : 'open'); s.textContent = k >= st.slots ? '' : (k < st.pips ? '10' : ''); s.title = k >= st.slots ? 'Locked: needs a Capacitor Module' : k < st.pips ? 'Banked pip' : 'Empty slot'; row.appendChild(s); }
    $('pipv').textContent = st.pips + ' banked of ' + st.slots + ' slot' + (st.slots>1?'s':'');
    var sr = $('srcs'); sr.innerHTML = '';
    Object.keys(st.src).forEach(function(id, n){
      var l = document.createElement('label'); if(n) l.style.marginTop='6px';
      l.innerHTML = '<span>'+LABEL[id]+'</span><span>'+st.src[id].toFixed(1)+' / '+st.max[id]+'</span>';
      var tr = document.createElement('div'); tr.className='track'; var fl = document.createElement('div'); fl.className='fill'; fl.style.background = id==='vend'||id==='fuse' ? 'var(--violet)' : 'var(--yel)'; setFill(fl, st.src[id]/st.max[id]); tr.appendChild(fl);
      sr.appendChild(l); sr.appendChild(tr);
    });
    $('acv').textContent = st.ac.toFixed(1) + ' / 4' + (st.ac >= 3.999 ? ' ON' : (st.ac > 0.001 ? ' (partly charged, still OFF)' : ' off')); setFill($('ac'), st.ac/4);
    $('gatev').textContent = st.gate.toFixed(1) + ' / 8'; setFill($('gate'), st.gate/8);
    var tn = $('tenant'); tn.textContent = st.tenant; tn.className = 'tenant ' + (st.tenant==='relieved' ? 't-ok' : 't-hot');
    $('ach').textContent = st.achievement ? 'GOOD NEIGHBOR (unlocked)' : 'locked';
    $('usable').textContent = E.usable(st).toFixed(1);
    $('clock').textContent = st.t.toFixed(1);
    var ul = $('log'); ul.innerHTML = '';
    st.log.slice().reverse().forEach(function(e){
      var li = document.createElement('li'); if(/Level complete/.test(e.text)) li.className = 'fin'; else if(/ACHIEVEMENT/.test(e.text)) li.className = 'ach';
      li.innerHTML = '<b>' + e.t.toFixed(1) + ' s</b> &nbsp; ' + e.text + ' &nbsp; <span style="color:var(--dim)">(bar ' + e.bar.toFixed(1) + ', pips ' + e.pips + ')</span>';
      ul.appendChild(li);
    });
    Array.prototype.forEach.call(btns.children, function(b, idx){ b.disabled = st.done && idx < cur.length-1; });
  }
  buildButtons(); render();

  // Speed chart
  var W=640,H=270,L=46,B=50,T=24,R=14;
  var x=function(f){ return L+f*(W-L-R); }, y=function(v){ return H-B-(v/3.4)*(H-B-T); };
  var p=''; for(var f=0;f<=1.0001;f+=0.05){ p += (p?' L':'M') + x(f).toFixed(1)+' '+y(E.rate(f*10)).toFixed(1); }
  var grid=''; [0,1,2,3].forEach(function(v){ grid += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#2a3a6e"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>'; });
  [0,2,4,6,8,10].forEach(function(b){ grid += '<text x="'+x(b/10)+'" y="'+(H-30)+'" text-anchor="middle">'+b+'</text>'; });
  var dots = [0,1].map(function(d){ return '<circle cx="'+x(d)+'" cy="'+y(E.rate(d*10))+'" r="5" fill="#44ddff"/>'; }).join('');
  $('chart').innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Transfer speed in units per second against bar level">'+grid+'<path d="'+p+'" fill="none" stroke="#44ddff" stroke-width="3"/>'+dots+'<text x="'+(L+14)+'" y="'+(y(1.2)+24)+'">empty bar: 1.2 units/s</text><text x="'+(W-R-6)+'" y="'+(y(3)-10)+'" text-anchor="end">full bar: 3 units/s</text><text x="'+(W/2)+'" y="'+(H-8)+'" text-anchor="middle">charge in the bar</text></svg>';

  // Charge table (changed rows marked)
  var rows = [['Security camera',1,'tiny',0],['Vending machine',2,'small',0],['Small shop neon sign',2,'small',0],['ATM',2,'small',0],['Roller shutter motor',2,'small',0],['Charge platform (ferry, lift)',2,'small',0],['Streetlight (Level 1 lamps are 3 now)',3,'medium',1,'was 4'],['Fuse box',4,'medium',1,'was 2'],['AC / HVAC unit',4,'medium',1,'was 3'],['Large neon sign, billboard',4,'medium',0],['Generator',8,'large',0],['Substation or transformer',10,'one pip',0]];
  var t = '<tr><th>Object</th><th class="n">Charge</th><th>Tier</th><th>Size</th></tr>';
  rows.forEach(function(r){ t += '<tr'+(r[3]?' class="new"':'')+'><td>'+r[0]+'</td><td class="n">'+r[1]+(r[3]?' <small>('+r[4]+')</small>':'')+'</td><td>'+r[2]+'</td><td><span class="bar" style="width:'+(r[1]*14)+'px"></span></td></tr>'; });
  $('ctable').innerHTML = t;
})();
</script></body></html>`;
fs.writeFileSync(out, html);
console.log('written', out, html.length);

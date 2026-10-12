// Integration checks for the first prop that is both an absorbable source and
// a moving, chargeable platform.
const listeners = {};
globalThis.window = { addEventListener(name, fn) { listeners[name] = fn; }, removeEventListener(){}, innerWidth:1920, innerHeight:1080 };
globalThis.document = { addEventListener(){}, getElementById:()=>null,
  createElement:()=>({ getContext:()=>({}), style:{} }), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=234; this.src=''; } addEventListener(){} };

const { Level } = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const fs = await import('node:fs');
let pass=0, fail=0;
function ok(condition, message) { (condition ? pass++ : fail++); console.log(`${condition ? '✓' : '✗'} ${message}`); }
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({code,preventDefault(){}});

const cols=20, tiles=Array(cols*18).fill(0);
const level = new Level({name:'CHARGE PLATFORM',cols,tiles,playerStart:{x:128,y:270},
  sources:[],gates:[],switches:[],chests:[],crates:[],enemies:[],checkpoints:[],decorations:[],
  platforms:[{x:128,y:300,w:96,h:20,x1:96,x2:320,speed:60,kind:'charge-platform',charge:2}]});
const p=level.platforms[0];
const player=new Player(128,270);
player.setEnergyState(0,0);
const manifest=JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json','utf8'));
const palette=manifest.assets.find(a=>a.id==='night_city_charge_platform');
ok(palette?.spawnsKind==='platform' && palette?.platformKind==='charge-platform' && fs.existsSync(palette.path),
  'Builder palette offers the powered platform with its Night City sprite');

const startX=p.x;
level.update(0.1,player);
ok(p.x>startX && p.running, 'charged platform moves on its route');
player.x=p.x+15; player.y=p.y-player.h;
player.vy=0; player.grounded=false;
const rideX=player.x;
player._resolvePlatforms(level,p.y,0.1);
ok(player.grounded && player.x>rideX, 'player lands on and rides the powered platform');
player._updateContext(level);
ok(player.nearSource===null, 'proximity is resolved by the absorb pass');
key('KeyE',true);
player._updateAbsorb(0.1,level);
key('KeyE',false);
ok(player.nearSource===p && player.charge>0, 'E transfers platform charge into player');
ok(!p.running && p.vx===0, 'first absorbed charge brakes the platform');
const stoppedX=p.x;
level.update(0.5,player);
ok(p.x===stoppedX, 'stopped platform remains in place');
const saved=level.snapshot();

player.grounded=true;
player._updateContext(level);
ok(player.nearDevice===p, 'partly drained platform is a SPACE-charge target');
const before=player.charge+p.charge;
key('Space',true);
for(let i=0;i<120 && !p.running;i++) player._updateDischarge(1/60,level);
key('Space',false);
ok(p.running && Math.abs(p.charge-2)<1e-9, 'SPACE restores full platform charge and movement');
ok(Math.abs(player.charge+p.charge-before)<1e-8, 'transfer conserves player plus platform charge');
const resumedX=p.x;
level.update(0.1,player);
ok(p.x>resumedX, 'recharged platform resumes in its prior direction');
level.restore(saved);
ok(!p.running && p.x===stoppedX && p.vx===0, 'checkpoint restore returns position and stopped state');
ok(p.charge>0 && p.charge<2, 'checkpoint restore returns partial stored charge');

const pixels=[];
const ctx={save(){},restore(){},drawImage(){},fillRect(x,y,w,h){pixels.push([this.fillStyle,x,y,w,h]);}};
p.draw(ctx);
ok(pixels.length===0, 'stopped platform has no traveling electric pixels');
p.receive(p.max-p.charge);
p.draw(ctx);
const first=JSON.stringify(pixels);
pixels.length=0;
p.update(0.1);
p.draw(ctx);
ok(pixels.length>0 && JSON.stringify(pixels)!==first, 'powered electrical pixels animate across the prop');

console.log(`charge_platform: ${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);

// Night City streetlight environmental light must track source position and charge.
globalThis.window = { addEventListener(){}, removeEventListener(){}, dispatchEvent(){} };
globalThis.document = { addEventListener(){}, getElementById:()=>null,
  createElement:()=>({getContext:()=>({}),style:{}}), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=444; this.src=''; } addEventListener(){} };
const { ElectricalSource } = await import('../src_scroll/electricity.js');
const { Level } = await import('../src_scroll/level.js');
const { drawStreetlightPool, streetlightPoolIntensity } = await import('../src_scroll/source-visuals.js');
let pass=0,fail=0;
function ok(v,msg){ (v?pass++:fail++); console.log(`${v?'✓':'✗'} ${msg}`); }
function recorder(){
  const stops=[], origins=[];
  const gradient=(type,args)=>{ origins.push([type,...args]); return {addColorStop(at,color){stops.push([at,color]);}}; };
  return {stops,origins,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},
    translate(){},scale(){},drawImage(){},createLinearGradient(...a){return gradient('beam',a);},
    createRadialGradient(...a){return gradient('radial',a);} };
}
const def={name:'LAMP TEST',cols:20,tiles:Array(20*18).fill(0),playerStart:{x:64,y:300},
  sources:[{id:'LAMP',x:160,y:320,kind:'prop',sprite:'assets/objects/night-city-props/streetlight/',
    artW:192,artH:192,charge:4,frames:8}],gates:[],switches:[],platforms:[],crates:[],chests:[],
  checkpoints:[],enemies:[],decorations:[]};
const level=new Level(def), lamp=level.sources[0];
const full=recorder(); lamp.draw(full);
ok(full.origins.length===3, 'powered streetlight emits a beam, bulb glow, and ground pool');
ok(streetlightPoolIntensity(lamp)===1, 'full charge gives full light');
const beforeX=full.origins[0][1];
lamp.x+=13;
const moved=recorder(); drawStreetlightPool(moved,lamp);
ok(Math.abs(moved.origins[0][1]-beforeX-13)<1e-9, 'light follows the moved streetlight exactly');
lamp.drain(2); lamp.update(0.1);
const half=recorder(); drawStreetlightPool(half,lamp);
ok(streetlightPoolIntensity(lamp)<1 && streetlightPoolIntensity(lamp)>0,
  'absorbing charge dims the pool continuously');
ok(half.stops[0][1]!==full.stops[0][1], 'beam alpha falls as charge is absorbed');
lamp.drain(2);
ok(lamp.drained, 'last charge switches the lamp to drained state');
const afterDrain=streetlightPoolIntensity(lamp);
lamp.update(0.1);
ok(streetlightPoolIntensity(lamp)<afterDrain && streetlightPoolIntensity(lamp)>0,
  'the final pool fades instead of snapping off');
for(let i=0;i<30;i++) lamp.update(0.1);
const dark=recorder(); drawStreetlightPool(dark,lamp);
ok(dark.origins.length===0, 'a drained streetlight emits no light after the fade');
const saved=level.snapshot();
lamp.charge=4; lamp.drained=false; lamp._lightLevel=1;
level.restore(saved);
ok(streetlightPoolIntensity(lamp)===0, 'checkpoint restore resets glow to restored charge');

console.log(`streetlight_pool: ${pass} passed / ${fail} failed`);
process.exit(fail?1:0);

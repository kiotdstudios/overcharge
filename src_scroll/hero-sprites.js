export const HERO_STATES = {
 idle:[6,true],walk:[10,true],run:[14,true],jump:[10,false],
 'ledge-climb':[10,false],death:[9,false],hurt:[16,false],stunned:[8,true],
 'energy-strike':[18,false],'projectile-cast':[20,false],'wall-slide':[8,true],grapple:[10,false],
 'ladder-up':[10,true],'ladder-down':[8,true],absorb:[10,true],discharge:[10,true],
 // Added with hero-v6, which has dedicated airborne-descent and touchdown clips.
 fall:[8,true],land:[14,false]
};

// Two hero packs exist and they are NOT interchangeable: different canvas size,
// different frame counts, different foot anchors and different state names.
// Everything that varies lives here so callers never hardcode a pack's geometry.
//
//   hero-v3  512px canvas, 8 frames, built-in imagegen, foot anchor 496/512
//   hero-v6  128px canvas, 16 frames, hero-v3 restyled tactical via PixelLab,
//            foot anchor 126/128. 128 is hero-v3's TRUE resolution — v3 is the
//            same art upscaled 4x — so v6 loses nothing by being smaller.
//
// `alias` maps the animator's canonical state names onto a pack's own folders.
// `standIn` lists canonical states the pack does NOT really have: their alias
// points at a different motion so nothing 404s, but a tester must be told the
// frames on screen are a substitute. v6's melee/cast are true renames, not
// stand-ins. v3 predates fall/land; v6 has no grapple or ladder-down.
export const HERO_PACKS = {
 'hero-v3':{
  root:'assets/sprites/hero-v3', frames:8, cell:512, footAnchor:496,
  alias:{fall:'jump',land:'jump'},
  standIn:['fall','land'],
 },
 'hero-v6':{
  // rev is appended to every frame URL. Bump it whenever frames are replaced in
  // place, or browsers keep serving the old PNGs under the same filename.
  // rev 2: run regenerated as a seamless loop.
  root:'assets/sprites/hero-v6', frames:16, cell:128, footAnchor:126, rev:2,
  alias:{
   'energy-strike':'melee','projectile-cast':'cast',
   grapple:'jump','ladder-down':'ladder-up',
  },
  standIn:['grapple','ladder-down'],
 },
};
export function isStandIn(pack,state){return (HERO_PACKS[pack]?.standIn||[]).includes(state);}
export const DEFAULT_PACK='hero-v3';

const cache=new Map();
function framesFor(state,dir,gaitRoot,pack){
 const spec=HERO_PACKS[pack]||HERO_PACKS[DEFAULT_PACK];
 // The gait-v4 override only ever replaced v3's walk/run and does not apply to v6.
 const revised=gaitRoot&&pack===DEFAULT_PACK&&(state==='walk'||state==='run');
 const folder=spec.alias[state]||state;
 const root=revised?gaitRoot:spec.root;
 const count=revised?(state==='walk'?7:8):spec.frames;
 const key=`${root}/${folder}/${dir}/${count}`;
 if(!cache.has(key))cache.set(key,Array.from({length:count},(_,i)=>{
  const rev=!revised&&spec.rev?`?r=${spec.rev}`:'';
  const img=new Image();img.src=`${root}/${folder}/${dir}/frame_${String(i).padStart(3,'0')}.png${rev}`;return img;
 }));return cache.get(key);
}
export class Animator{
 constructor(frames,fps=8,loop=true){this.frames=frames;this.fps=fps;this.loop=loop;this.reset();}
 reset(){this._frame=0;this._t=0;this.done=false;}
 update(dt){
  if(this.done&&!this.loop)return;
  this._t+=Math.max(0,dt);
  while(this._t>=1/this.fps){
   const next=this._frame+1;
   if(next>=this.frames.length&&!this.loop){this.done=true;this._t=0;return;}
   const index=next%this.frames.length;
   if(!this.frames[index].complete||!this.frames[index].naturalWidth){this._t=Math.min(this._t,1/this.fps);return;}
   this._t-=1/this.fps;this._frame=index;if(index===0)this.done=true;
  }
 }
 get image(){return this.frames[this._frame];}
}
export class PlayerSprites{
 constructor({gaitRoot=null,pack=DEFAULT_PACK}={}){
  this.gaitRoot=gaitRoot;
  this.pack=HERO_PACKS[pack]?pack:DEFAULT_PACK;
  this.packSpec=HERO_PACKS[this.pack];
  // HERO_STATES fps values were tuned for 8-frame clips. A 16-frame pack played at
  // the same fps takes twice as long: the climb drags to 1.6s, and walk/run, whose
  // fps follows ground speed, cycle the legs at half the rate the body moves, so
  // the feet slide. Scaling fps by frames/8 keeps every clip's DURATION identical.
  this.fpsScale=this.packSpec.frames/8;
  this.anims={};this.state='idle';this.dir='east';this._current=this.get('idle','east');this._attackHeld=false;
  // Preload movement and attack frames before their first transition.
  for(const state of ['idle','walk','run','jump','projectile-cast','energy-strike'])
   for(const dir of ['east','west'])this.get(state,dir);
 }
 get(state,dir){
  const key=`${state}/${dir}`;
  if(!this.anims[key]){
   const [fps,loop]=HERO_STATES[state];
   this.anims[key]=new Animator(framesFor(state,dir,this.gaitRoot,this.pack),fps*this.fpsScale,loop);
  }
  return this.anims[key];
 }
 setState(state,facingRight=true){
  if(!HERO_STATES[state])throw new Error(`Unknown hero state: ${state}`);
  const dir=facingRight?'east':'west',next=this.get(state,dir);
  if(next!==this._current){
   const gait=state==='walk'||state==='run',wasGait=this.state==='walk'||this.state==='run';
   if(state===this.state||(gait&&wasGait)){
    next._frame=Math.floor(this._current._frame/this._current.frames.length*next.frames.length);
    next._t=this._current._t*this._current.fps/next.fps;
    next.done=state===this.state?this._current.done:false;
   }
   else next.reset();
   this._current=next;this.state=state;this.dir=dir;
  }
 }
 update(dt,moving,right,absorbing,running,airborne,discharging,speed=0,vy=0,wallBlocked=false,status={}){
  let state;const attackStart=status.attacking&&!this._attackHeld;this._attackHeld=!!status.attacking;
  if(status.dead)state='death';
  else if(status.hurt)state='hurt';
  else if(status.stunned)state='stunned';
  else if(status.traversal&&HERO_STATES[status.traversal])state=status.traversal;
  else if(attackStart)state=status.projectile?'projectile-cast':'energy-strike';
  else if(['energy-strike','projectile-cast'].includes(this.state)&&!this._current.done)state=this.state;
  else if(absorbing)state='absorb';
  else if(discharging)state='discharge';
  else if(airborne)state='jump';
  else state=moving?(running?'run':'walk'):'idle';
  this.setState(state,right);
  if(attackStart&&['energy-strike','projectile-cast'].includes(state))this._current.reset();
  if(state==='jump'){
   // Velocity picks the airborne pose rather than a timer. The index is
   // expressed against the original 8-frame pack and scaled to whatever the
   // active pack has, so a 16-frame pack uses the whole arc instead of its
   // first third. Crouch/landing frames stay available to future transitions.
   const slot=vy < -220?1:vy < -50?2:vy<50?4:5;
   const n=this._current.frames.length;
   this._current._frame=Math.min(n-1,Math.round(slot*n/8));
   return;
  }
  // Both gaits advance with traveled distance; sprint acceleration stays in sync.
  const k=this.fpsScale;
  this._current.fps=state==='walk'?Math.max(1,speed/11)*k:state==='run'?Math.max(1,speed/14)*k:HERO_STATES[state][0]*k;
  this._current.update(dt);
 }
 get currentFrame(){
  const img=this._current.image;if(img.complete&&img.naturalWidth)return img;
  return this.get('idle',this.dir).frames.find(f=>f.complete&&f.naturalWidth)||img;
 }
}

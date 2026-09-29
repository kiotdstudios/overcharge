export const HERO_STATES = {
 idle:[6,true],walk:[10,true],run:[14,true],jump:[10,false],
 'ledge-climb':[10,false],death:[9,false],hurt:[16,false],stunned:[8,true],
 'energy-strike':[18,false],'projectile-cast':[20,false],'wall-slide':[8,true],grapple:[10,false],
 'ladder-up':[10,true],'ladder-down':[8,true],absorb:[10,true],discharge:[10,true]
};
const cache=new Map();
function framesFor(state,dir){
 const key=`${state}/${dir}`;
 if(!cache.has(key))cache.set(key,Array.from({length:8},(_,i)=>{
  const img=new Image();img.src=`assets/sprites/hero-v3/${state}/${dir}/frame_${String(i).padStart(3,'0')}.png`;return img;
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
 constructor(){
  this.anims={};this.state='idle';this.dir='east';this._current=this.get('idle','east');this._attackHeld=false;
  // Preload movement and attack frames before their first transition.
  for(const state of ['idle','walk','run','jump','projectile-cast','energy-strike'])
   for(const dir of ['east','west'])this.get(state,dir);
 }
 get(state,dir){const key=`${state}/${dir}`;return this.anims[key]??=new Animator(framesFor(state,dir),...HERO_STATES[state]);}
 setState(state,facingRight=true){
  if(!HERO_STATES[state])throw new Error(`Unknown hero state: ${state}`);
  const dir=facingRight?'east':'west',next=this.get(state,dir);
  if(next!==this._current){
   const gait=state==='walk'||state==='run',wasGait=this.state==='walk'||this.state==='run';
   if(state===this.state||(gait&&wasGait)){
    next._frame=this._current._frame;
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
   // Use airborne poses; crouch/landing frames are available to future transitions.
   this._current._frame=vy < -220?1:vy < -50?2:vy<50?4:5;return;
  }
  // Both gaits advance with traveled distance; sprint acceleration stays in sync.
  this._current.fps=state==='walk'?Math.max(1,speed/11):state==='run'?Math.max(1,speed/14):HERO_STATES[state][0];
  this._current.update(dt);
 }
 get currentFrame(){
  const img=this._current.image;if(img.complete&&img.naturalWidth)return img;
  return this.get('idle',this.dir).frames.find(f=>f.complete&&f.naturalWidth)||img;
 }
}

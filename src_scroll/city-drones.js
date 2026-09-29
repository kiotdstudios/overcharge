import {DroneEnemy, DrainEnemy} from './entities.js';
import {TILE, GRAVITY} from './constants.js';
import {muzzle,sees,ray,damage,beamHits,updatePlasma,drawPlasma,drawLaser} from './drone-weapons.js';

const sprites=new Map();
function frames(type){
 if(!sprites.has(type))sprites.set(type,Array.from({length:8},(_,i)=>{
  const image=new Image();image.src=`assets/sprites/city-drones/${type}/frame_${String(i).padStart(3,'0')}.png`;return image;
 }));
 return sprites.get(type);
}
function drawBody(ctx,e,frame){
 const img=e._cityFrames[frame];
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.translate(Math.round(e.cx),Math.round(e.y+e.h));
 if(e.vx<0)ctx.scale(-1,1);
 if(e._hitFlash>0)ctx.globalAlpha=.55+.45*Math.cos(e._t*40);
 // Native frame feet are at y360/384. Keep wheels on the collision floor.
 if(img.complete&&img.naturalWidth)ctx.drawImage(img,-32,-60,64,64);
 else {ctx.fillStyle='#514467';ctx.fillRect(-e.w/2,-e.h,e.w,e.h);}
 ctx.restore();
 if(e.hp<e.maxHp){ctx.fillStyle='#24162f';ctx.fillRect(e.x,e.y-10,e.w,3);ctx.fillStyle='#e05d93';ctx.fillRect(e.x,e.y-10,e.w*e.hp/e.maxHp,3);}
}

export class SkySentry extends DroneEnemy {
 constructor(def){super(def);this.type='sky-sentry';this._cityFrames=frames(this.type);this._flashT=0;}
 _fire(dir,player){
  if(!player||this._laser)return;
  const o=muzzle(this);this._laser={angle:Math.atan2(player.cy-o.y,player.cx-o.x),time:0,length:0,hit:false};
 }
 _updateBlasts(dt,level,player){
  this._blasts=[];
  if(!this.alive){this._laser=null;return;}
  if(!this._laser)return;
  const b=this._laser,o=muzzle(this);b.time+=dt;b.length=ray(level,o,b.angle,520);
  if(b.time>=.55&&b.time<.79){this._flashT=.2;
   if(!b.hit&&beamHits(o,b.angle,b.length,player)){damage(this,player,level,Math.cos(b.angle)<0?-1:1);b.hit=true;}
  }
  if(b.time>=.79)this._laser=null;
 }
 // Preserve the live flying patrol's tuned sight/chase contract; the weapon ray
 // independently stops at terrain, crates and closed gates.
 _sees(player,level){return super._sees(player,level);}
 update(dt,level,player){this._flashT=Math.max(0,this._flashT-dt);super.update(dt,level,player);}
 draw(ctx){
  drawLaser(ctx,this);if(!this.alive)return;
  const frame=this._flashT>0?4+Math.min(3,Math.floor((.28-this._flashT)/.07)):
   this.alertState==='alert'?4+Math.floor(this._t*12)%2:Math.floor(this._t*8)%4;
  drawBody(ctx,this,frame);this.drawTell(ctx);
 }
 snapshotCombat(){return { _flashT:this._flashT,_frame:this._frame,_baseY:this._baseY,
  _shotCd:this._shotCd??0,_alertT:this._alertT??0,_deaggroT:this._deaggroT??0,
  _aggro:this._aggro??false,_shooting:this._shooting,_laser:this._laser?{...this._laser}:null,_blasts:[]};}
}

export class WheelDrone extends DrainEnemy {
 constructor(def){super(def);this.type='wheel-drone';this.w=38;this.h=34;this.vy=0;this._cityFrames=frames(this.type);this._alert=false;this._plasma=[];this._weaponT=0;this._burst=0;this._charging=false;}
 update(dt,level,player){
  this._cooldown=Math.max(0,this._cooldown-dt);
  updatePlasma(this,dt,level,player);
  if(!this.alive)return;
  this._t+=dt;this._hitFlash=Math.max(0,this._hitFlash-dt);
  this._alert=sees(this,player,level);
  this._weaponT=Math.max(0,this._weaponT-dt);
  if(this._alert){
   this.vx=(player.cx<this.cx?-1:1)*this.speed;
   if(this._weaponT===0){
    if(!this._charging&&!this._burst){this._charging=true;this._weaponT=.5;}
    else {
     if(this._charging){this._charging=false;this._burst=3;}
     const o=muzzle(this),lead=Math.max(-22,Math.min(22,(player.vx||0)*.12));
     const angle=Math.atan2(player.cy-o.y,player.cx+lead-o.x);
     this._plasma.push({x:o.x,y:o.y,vx:Math.cos(angle)*280,vy:Math.sin(angle)*280,life:1.8});
     this._burst--;this._weaponT=this._burst?.18:1.5;
    }
   }
  }else {this._charging=false;this._burst=0;}
  let remaining=Math.min(dt,.25);
  while(remaining>0){const step=Math.min(remaining,1/120);remaining-=step;this._step(step,level);}
 }
 _step(dt,level){
  const solid=(x,y)=>level.solidAt(Math.floor(x/TILE),Math.floor(y/TILE));
  const oldBottom=this.y+this.h;
  this.vy+=GRAVITY*dt;const bottom=oldBottom+this.vy*dt;
  let landed=false;
  for(let row=Math.floor(oldBottom/TILE);row<=Math.floor(bottom/TILE);row++){
   if(row*TILE>=oldBottom-.01&&(solid(this.x+3,row*TILE)||solid(this.x+this.w-3,row*TILE))){
    this.y=row*TILE-this.h;this.vy=0;landed=true;break;
   }
  }
  if(!landed)this.y+=this.vy*dt;
  const dx=this._alert?0:this.vx*dt,next=this.x+dx,edge=dx>0?next+this.w:next;
  const obstacles=[...(level.crates||[]),...(level.gates||[]).filter(g=>!g.open)];
  const blocked=obstacles.some(o=>next<o.x+o.w&&next+this.w>o.x&&this.y<o.y+o.h&&this.y+this.h>o.y);
  if(next<this.patrolLeft||next+this.w>this.patrolRight||blocked||
    solid(edge,this.y+2)||solid(edge,this.y+this.h-2)||
    (landed&&!solid(edge,this.y+this.h+2))){this.vx=-this.vx;}
  else this.x=next;
 }
 tryContact(player,level){if(player)super.tryContact(player,level);}
 draw(ctx){drawPlasma(ctx,this._plasma,this._t);if(this.alive){drawBody(ctx,this,(this._alert?4:0)+Math.floor(this._t*10)%4);
  if(this._charging){const o=muzzle(this);ctx.save();ctx.fillStyle='#ff6a88';ctx.globalAlpha=.5+.5*Math.sin(this._t*30);ctx.fillRect(o.x-3,o.y-3,6,6);ctx.restore();}
 }}
 snapshotCombat(){return {vy:this.vy,_alert:this._alert,_weaponT:this._weaponT,_burst:this._burst,_charging:this._charging,_plasma:this._plasma.map(b=>({...b}))};}
}

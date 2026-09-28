// Shared collision and code-native weapon effects for the city drones.
import {TILE,STUN_DURATION,STUN_COOLDOWN} from './constants.js';
export function muzzle(e){return {x:e.cx+(e.vx<0?-8:8),y:e.y+e.h-22};}
export function blocked(level,x,y){
 if(!level)return false;
 return level.solidAt(Math.floor(x/TILE),Math.floor(y/TILE))||
 [...(level.crates||[]),...(level.gates||[]).filter(g=>!g.open)].some(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h);
}
export function ray(level,origin,angle,length){
 const dx=Math.cos(angle),dy=Math.sin(angle);
 for(let d=0;d<=length;d+=2)if(blocked(level,origin.x+dx*d,origin.y+dy*d))return Math.max(0,d-2);
 return length;
}
export function sees(e,p,level,visionX=280,visionY=220){
 if(!p||p.dead||Math.abs(p.cx-e.cx)>visionX||Math.abs(p.cy-e.cy)>visionY)return false;
 const o=muzzle(e),dx=p.cx-o.x,dy=p.cy-o.y,len=Math.hypot(dx,dy);
 return ray(level,o,Math.atan2(dy,dx),len)>=len;
}
export function damage(e,p,level,dir){
 if(!p||e._cooldown>0)return;
 p.stun(STUN_DURATION,dir*260);p.scatter(level);e._cooldown=STUN_COOLDOWN;
}
export function beamHits(o,a,length,p){
 if(!p)return false;
 // Slab intersection with the actual player box, expanded by beam radius.
 let lo=0,hi=length;
 for(const [start,delta,min,max] of [[o.x,Math.cos(a),p.x-3,p.x+p.w+3],[o.y,Math.sin(a),p.y-3,p.y+p.h+3]]){
  if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue;}
  const u=(min-start)/delta,v=(max-start)/delta;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));
  if(lo>hi)return false;
 }
 return true;
}
export function updatePlasma(e,dt,level,p){
 for(const b of e._plasma){
  b.life-=dt;const distance=Math.hypot(b.vx,b.vy)*dt,steps=Math.max(1,Math.ceil(distance/3));
  for(let i=0;i<steps&&b.life>0;i++){
   b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
   if(blocked(level,b.x,b.y)){b.life=0;break;}
   if(p&&b.x>=p.x-4&&b.x<=p.x+p.w+4&&b.y>=p.y-4&&b.y<=p.y+p.h+4){damage(e,p,level,Math.sign(b.vx)||1);b.life=0;}
  }
 }
 e._plasma=e._plasma.filter(b=>b.life>0);
}
export function drawPlasma(ctx,shots,t){
 for(const b of shots){ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));ctx.rotate(Math.atan2(b.vy,b.vx));
  ctx.shadowColor='#fa397b';ctx.shadowBlur=12;ctx.fillStyle='#ab286b';
  for(let i=0;i<4;i++)ctx.fillRect(-10-i*5,(i+Math.floor(t*24))%2?1:-2,4,2);
  ctx.fillStyle='#ff5369';ctx.fillRect(-7,-3,13,6);ctx.fillRect(-4,-5,6,10);
  ctx.fillStyle='#ffb660';ctx.fillRect(-5,-2,12,4);ctx.fillStyle='#fff1ba';ctx.fillRect(-2,-1,7,2);
  ctx.restore();
 }
}
export function drawLaser(ctx,e){
 const b=e._laser;if(!b||!e.alive)return;const o=muzzle(e),active=b.time>=.55;
 ctx.save();ctx.translate(Math.round(o.x),Math.round(o.y));ctx.rotate(b.angle);
 if(!active){ctx.globalAlpha=.4+.4*Math.sin(e._t*35);ctx.fillStyle='#ff3358';for(let x=0;x<b.length;x+=12)ctx.fillRect(x,0,Math.min(5,b.length-x),1);}
 else {ctx.shadowColor='#ff173e';ctx.shadowBlur=18;ctx.fillStyle='#cf163f';ctx.fillRect(0,-5,b.length,10);ctx.fillStyle='#ff425b';ctx.fillRect(0,-3,b.length,6);ctx.fillStyle='#ffe7e9';ctx.fillRect(0,-1,b.length,2);ctx.fillRect(b.length-2,-5,3,10);}
 ctx.fillStyle=active?'#fff0ed':'#ff294f';ctx.fillRect(-4,-4,8,8);ctx.restore();
}

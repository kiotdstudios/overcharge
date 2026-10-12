import { TILE } from './constants.js';

// Ambient scenery only: a loose receipt, newspaper scrap, or paper cup skims
// across an exposed rooftop. It never changes collisions or the saved level.
export function exposedRoof(level, tx, ty){
  return tx>=0&&tx<level.cols&&ty>0&&ty<level.rows&&
    (level.solidAt(tx,ty)||level.tileAt(tx,ty)===2)&&level.tileAt(tx,ty-1)===0;
}

export class StreetLitter {
  constructor(){this.pieces=[];this.nextSpawn=4+Math.random()*5;}
  update(dt,level,player,viewWidth){
    this.nextSpawn-=dt;
    if(this.nextSpawn<=0){
      this.nextSpawn=7+Math.random()*9;
      if(this.pieces.length<2)this.spawn(level,player.x,viewWidth);
    }
    for(const p of this.pieces){
      p.age+=dt;
      const ahead=p.x+p.direction*(p.speed*dt+5);
      if(!exposedRoof(level,Math.floor(ahead/TILE),p.row))p.done=true;
      if(!p.done)p.x+=p.direction*p.speed*dt;
      if(p.age>13||p.x<0||p.x>=level.pxW)p.done=true;
    }
    this.pieces=this.pieces.filter(p=>!p.done);
  }
  spawn(level,playerX,viewWidth){
    const direction=Math.random()<0.5?-1:1;
    const nearEdge=Math.min(viewWidth*0.38,280);
    const x=playerX-direction*nearEdge;
    const tx=Math.floor(x/TILE);
    // Highest visible solid rooftop at this column, with open sky directly above.
    for(let ty=1;ty<level.rows;ty++){
      if(!exposedRoof(level,tx,ty))continue;
      const span=direction>0?1:-1;
      if(!exposedRoof(level,tx+span,ty))continue;
      this.pieces.push({x,y:ty*TILE,row:ty,direction,speed:17+Math.random()*13,
        age:0,kind:Math.floor(Math.random()*3),phase:Math.random()*6.28,done:false});
      break;
    }
  }
  draw(ctx){
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const p of this.pieces){
      const x=Math.round(p.x),y=Math.round(p.y);
      const flip=Math.sin(p.age*10+p.phase)>0;
      // A one-pixel ground shadow keeps the scrap visually attached to the roof.
      ctx.fillStyle='#080e1d';ctx.fillRect(x-4,y-1,9,1);
      if(p.kind===0){ // folded newspaper
        ctx.fillStyle='#8f9aab';ctx.fillRect(x-4,y-(flip?6:4),8,3);
        ctx.fillStyle='#33465d';ctx.fillRect(x-2,y-(flip?5:3),5,1);
      }else if(p.kind===1){ // pale receipt
        ctx.fillStyle='#b3a7a2';ctx.fillRect(x-3,y-(flip?6:5),6,4);
        ctx.fillStyle='#394859';ctx.fillRect(x-2,y-3,3,1);
      }else{ // tipped takeaway cup
        ctx.fillStyle='#788597';ctx.fillRect(x-3,y-5,6,4);
        ctx.fillStyle='#b9a39b';ctx.fillRect(x-4,y-5,1,4);
        ctx.fillStyle='#302d47';ctx.fillRect(x+3,y-5,1,4);
      }
    }
    ctx.restore();
  }
}

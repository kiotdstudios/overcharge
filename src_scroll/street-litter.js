import { TILE } from './constants.js';

// Ambient scenery only: a loose receipt, newspaper scrap, or paper cup skims
// across an exposed rooftop. It never changes collisions or the saved level.
export function exposedRoof(level, tx, ty){
  return tx>=0&&tx<level.cols&&ty>0&&ty<level.rows&&
    (level.solidAt(tx,ty)||level.tileAt(tx,ty)===2)&&level.tileAt(tx,ty-1)===0;
}

// Each piece is drawn pixel-by-pixel from a small jagged-silhouette sprite so
// it reads as debris (torn paper / curled receipt / tipped cup), not as a
// flat colored block. Two frames per kind give the tumble its animation.
// originX/originY are the grid cell that lands exactly on the piece's (x,y)
// ground anchor, so position/footprint matches the physics unchanged.
const LITTER_SPRITES = [
  { // kind 0: folded newspaper scrap
    originX: 2, originY: 4,
    palette: { A: '#8f9aab', B: '#33465d' },
    a: [
      '.AA..',
      'AAAAB',
      '.BBB.',
    ],
    b: [
      '.BBB.',
      'AAAAB',
      '.AA..',
    ],
  },
  { // kind 1: pale curled receipt
    originX: 1, originY: 5,
    palette: { A: '#b3a7a2', B: '#394859' },
    a: [
      '.A.',
      'AAB',
      'AAB',
      '.B.',
    ],
    b: [
      '.B.',
      'BAA',
      'BAA',
      '.A.',
    ],
  },
  { // kind 2: tipped takeaway cup
    originX: 1, originY: 5,
    palette: { A: '#788597', C: '#b9a39b', D: '#302d47' },
    a: [
      'CDA',
      'AAA',
      'AAA',
      '.A.',
    ],
    b: [
      'ADC',
      'AAA',
      'AAA',
      '.A.',
    ],
  },
];

function drawLitterSprite(ctx, def, rows, baseX, baseY){
  for(let ry=0; ry<rows.length; ry++){
    const row = rows[ry];
    for(let rx=0; rx<row.length; rx++){
      const ch = row[rx];
      if(ch==='.')continue;
      ctx.fillStyle = def.palette[ch];
      ctx.fillRect(baseX+rx-def.originX, baseY+ry-def.originY, 1, 1);
    }
  }
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
      const def=LITTER_SPRITES[p.kind];
      drawLitterSprite(ctx,def,flip?def.b:def.a,x,y);
    }
    ctx.restore();
  }
}

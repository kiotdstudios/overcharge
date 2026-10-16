from pathlib import Path
from collections import Counter
from PIL import Image, ImageDraw, ImageColor
ROOT = Path(__file__).resolve().parents[1]/"assets/objects"
BASE = ROOT/"night-city-props"/"secret-room"
PIP = ROOT/"pip-pickup"
BASE.mkdir(parents=True,exist_ok=True); PIP.mkdir(parents=True,exist_ok=True)
C = {"void":"#03010c","dark":"#0b091e","navy":"#171932","steel":"#232450","rim":"#3d3d6d","blue":"#5e8baa","lav":"#868fc8","cyan":"#72bdce","ice":"#b0e1e5"}
def sprite(w,h):
    im=Image.new("RGBA",(w,h)); return im,ImageDraw.Draw(im)
def rect(d,xy,col): d.rectangle(xy,fill=C[col])
def lines(d,points,col,width=1): d.line(points,fill=C[col],width=width)
def save(name,im):
    p=BASE/(name+".png"); im.save(p); return p
# A horizontal hatch is built as a 64x32 frame; open shows the dark access throat and swung panel.
a,d=sprite(64,32)
rect(d,(3,13,60,26),"void");rect(d,(3,13,60,15),"rim");rect(d,(3,25,60,27),"rim")
rect(d,(5,16,58,23),"steel");rect(d,(7,17,56,20),"navy")
rect(d,(7,22,55,23),"blue");rect(d,(9,16,10,20),"cyan");rect(d,(51,16,52,20),"cyan")
for x in (6,55): rect(d,(x,13,x+2,15),"lav")
save("hatch_closed",a)
a,d=sprite(64,32)
rect(d,(3,13,60,27),"rim");rect(d,(6,16,57,25),"void")
for x in (10,16,22,28,34,40,46,52): rect(d,(x,22,x+1,24),"steel")
rect(d,(3,3,59,12),"navy");rect(d,(3,3,59,4),"lav");rect(d,(4,11,58,12),"blue")
rect(d,(8,6,10,8),"cyan");rect(d,(53,6,55,8),"cyan")
save("hatch_open",a)
# Four story-neutral independent props; no unapproved lore text is baked in.
a,d=sprite(32,48)
rect(d,(3,4,28,44),"void");rect(d,(4,5,27,43),"rim");rect(d,(6,7,25,40),"navy")
rect(d,(9,9,22,11),"cyan"); rect(d,(9,14,21,16),"blue")
rect(d,(9,19,18,21),"lav");rect(d,(9,25,23,26),"steel");rect(d,(9,29,19,30),"steel")
for x,y in ((3,4),(27,4),(3,43),(27,43)): d.point((x,y),fill=C["ice"])
save("archive_poster",a)
a,d=sprite(48,40)
rect(d,(4,8,43,33),"void");rect(d,(5,9,42,31),"rim");rect(d,(7,11,40,28),"navy")
rect(d,(10,14,37,23),"steel");rect(d,(11,15,36,22),"void")
lines(d,[(12,21),(17,21),(20,17),(23,24),(26,19),(36,19)],"cyan",2)
rect(d,(11,26,15,27),"blue");rect(d,(37,25,39,27),"ice")
rect(d,(14,32,33,34),"rim");rect(d,(19,35,29,36),"steel")
save("archive_monitor",a)
a,d=sprite(32,24)
rect(d,(3,4,28,19),"void");rect(d,(4,5,27,18),"steel")
rect(d,(7,8,24,15),"navy");rect(d,(11,8,20,15),"rim");rect(d,(14,9,17,14),"cyan")
for x in (5,24): rect(d,(x,9,x+2,14),"lav")
rect(d,(6,17,25,18),"blue")
save("signal_cassette",a)
a,d=sprite(24,32)
rect(d,(7,3,16,6),"steel");rect(d,(5,6,18,25),"void");rect(d,(7,8,16,22),"blue")
rect(d,(8,9,15,20),"navy");rect(d,(9,10,14,18),"cyan")
rect(d,(10,12,13,16),"ice");rect(d,(4,25,19,27),"rim");rect(d,(7,28,16,29),"steel")
save("memory_cell",a)
# Borrow the actual charged pip silhouette; keep pixel edges via nearest-neighbor.
source=Image.open(ROOT/"pip"/"charged.png").convert("RGBA")
bbox=source.getchannel("A").getbbox(); core=source.crop(bbox).resize((10,11),Image.Resampling.NEAREST)
pixels=core.load()
for y in range(core.height):
 for x in range(core.width):
  r,g,b,a=pixels[x,y]
  if not a: continue
  l=(r+g+b)/3
  palette=[C["void"],C["navy"],C["rim"],C["blue"],C["cyan"],C["ice"]]
  import PIL.ImageColor
  nr,ng,nb=PIL.ImageColor.getrgb(palette[min(5,int(l)//43)])
  pixels[x,y]=(nr,ng,nb,a)
for i,offset in enumerate((1,0,1,2)):
 im=Image.new("RGBA",(16,16)); im.alpha_composite(core,(3,2+offset)); im.save(PIP/(f"{i:02}.png"))
# Contact sheets use checkerboard only in QA, never game art.
def sheet(paths,out,title):
 images=[Image.open(p).convert("RGBA") for p in paths]
 scale=3; cell_w=max(im.width for im in images)*scale+24; cell_h=max(im.height for im in images)*scale+46
 sheet=Image.new("RGB",(max(380,cell_w*min(4,len(paths))),48+cell_h*((len(paths)+3)//4)),"#111523")
 draw=ImageDraw.Draw(sheet);draw.text((12,12),title,fill="#b0e1e5")
 for n,(im,p) in enumerate(zip(images,paths)):
  x=(n%4)*cell_w+12;y=48+(n//4)*cell_h
  checker=Image.new("RGBA",im.size,C["navy"]);cd=ImageDraw.Draw(checker)
  for yy in range(0,im.height,8):
   for xx in range(0,im.width,8):
    if (xx//8+yy//8)%2==0: cd.rectangle((xx,yy,xx+7,yy+7),fill=C["steel"])
  checker.alpha_composite(im);sheet.paste(checker.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST),(x,y))
  draw.text((x,y+max(i.height for i in images)*scale+4),p.stem,fill="#72bdce")
 sheet.save(out)
sheet(sorted(p for p in BASE.glob("*.png") if p.name != "contact_sheet.png"),BASE/"contact_sheet.png","AKI 26 | hatch + room dressing | concept review")
sheet(sorted(PIP.glob("[0-9][0-9].png")),PIP/"contact_sheet.png","AKI 26 | pip pickup | 4-frame bob")
for folder in (BASE,PIP):
 for p in sorted(folder.glob("*.png")):
  if p.name=="contact_sheet.png": continue
  im=Image.open(p).convert("RGBA");w,h=im.size
  edge=[im.getpixel((x,0))[3] for x in range(w)]+[im.getpixel((x,h-1))[3] for x in range(w)]+[im.getpixel((0,y))[3] for y in range(h)]+[im.getpixel((w-1,y))[3] for y in range(h)]
  colors=Counter(im.get_flattened_data());used=sorted({"#%02x%02x%02x"%rgb[:3] for rgb,count in colors.items() if rgb[3] and count})
  print(p.relative_to(ROOT),im.size,"border_max_alpha",max(edge),"colors",used)
  assert max(edge)==0, p

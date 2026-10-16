from pathlib import Path
from collections import Counter
from PIL import Image
import subprocess
repo=Path(__file__).resolve().parents[1]
folders=[repo/"assets/objects/night-city-buildings/apartment_hint",repo/"assets/objects/night-city-props/relay-pylon",repo/"assets/objects/night-city-props/light-cable",repo/"assets/objects/night-city-props/beacon-top",repo/"assets/objects/night-city-props/secret-room",repo/"assets/objects/night-city-props/ac-unit",repo/"assets/sprites/npc-window-woman",repo/"assets/objects/pip-pickup"]
print("AKI 26 review asset audit")
for folder in folders:
 if not folder.exists():
  print("PENDING",folder.relative_to(repo));continue
 for file in sorted(folder.rglob("*.png")):
  if "source" in file.parts or "_qa" in file.parts or any(tag in file.stem for tag in ("preview","contact","compare","qa_")):continue
  im=Image.open(file).convert("RGBA")
  w,h=im.size
  edge=[im.getpixel((x,0))[3] for x in range(w)]+[im.getpixel((x,h-1))[3] for x in range(w)]+[im.getpixel((0,y))[3] for y in range(h)]+[im.getpixel((w-1,y))[3] for y in range(h)]
  colors=Counter(im.get_flattened_data()); used={"#%02x%02x%02x"%rgb[:3] for rgb,n in colors.items() if rgb[3] and n}
  bad=[c for c in used if (lambda r,g,b:max(r,b)>70 and r>g*1.3 and b>g*1.3)(*bytes.fromhex(c[1:]))]
  print(str(file.relative_to(repo)),w,h,"border max",max(edge),"colors",len(used),"magenta-like",len(bad))
  if max(edge)>0 and folder.name not in ("light-cable","apartment_hint","ac-unit"): print("  WARN: border not transparent, inspect intentional tiling")
  if bad: print("  WARN: magenta colors",sorted(bad)[:12])
protected=["assets/ASSET_MANIFEST.json","assets/sprites/hero-v3/manifest.json","assets/sprites/hero-v6/manifest.json","src_scroll/levels"]
for args in (["diff","--name-only","d93bb7d","HEAD"],["diff","--name-only"],["diff","--cached","--name-only"]):
 tracked=subprocess.run(["git","-C",str(repo),*args,"--",*protected],capture_output=True,text=True,check=True)
 assert not tracked.stdout.strip(), "Protected file edited (" + " ".join(args) + "): " + tracked.stdout
print("Chief-owned levels and manifests: unchanged against Part 1, unstaged and staged")

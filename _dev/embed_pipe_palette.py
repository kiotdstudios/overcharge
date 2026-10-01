"""Embed the generated pipe thumbnails so the palette works from a Desktop copy."""

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "docs/OVERCHARGE_Electric_City_Palette.html"
ASSETS = ROOT / "assets/objects/night-city-props/pipes"
START = "  <!-- PIPE_PALETTE_START -->"
END = "  <!-- PIPE_PALETTE_END -->"

cards = []
for name, slug, size in (
    ("Short conduit", "short", "160 x 64"),
    ("Elbow conduit", "elbow", "256 x 96"),
    ("Branch conduit", "branch", "384 x 104"),
):
    for state, suffix in (("lit", ""), ("unlit", "-unlit")):
        path = ASSETS / f"pipe-{slug}{suffix}.png"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        cards.append(
            f'  <div class="prop-card"><img class="thumb" '
            f'style="width:160px;height:100px" src="data:image/png;base64,{encoded}" '
            f'alt="{name} ({state})"><div class="prop-meta"><h3>{name} ({state})</h3>'
            f'<p class="note">Placeable rooftop dressing, {size} sprite pixels. '
            f'No collision or power logic.<br><code>assets/objects/night-city-props/pipes/pipe-{slug}{suffix}.png</code>'
            f'</p></div></div>'
        )

content = (
    "\n  <h2>Night City Pipe Variants</h2>\n"
    "  <p class=\"note\">Three Builder-ready sizes, each lit and unlit. Pixel art uses blue-black steel "
    "with violet city reflections; lit versions have amber inspection lamps. These are decorative props; "
    "the purple lightning above is a gameplay effect.</p>\n"
    + "\n".join(cards)
    + "\n  "
)

page = PAGE.read_text(encoding="utf-8")
begin = page.index(START) + len(START)
end = page.index(END, begin)
PAGE.write_text(page[:begin] + content + page[end:], encoding="utf-8")
print("Embedded six pipe previews")

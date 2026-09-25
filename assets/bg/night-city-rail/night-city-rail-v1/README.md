# Night City — isolated dark skyline and light rail

The faded purple rear buildings baked into the former near layer have been removed. `06-dark-front-skyline.png` contains only the darkest front buildings, rooftop machinery, lights and cables on real transparency. It is not a composite with the faded city behind it.

## Recommended stack

1. `01-sky.png` — existing no-rain sky.
2. `04-elevated-track.png` — independent steel railway, horizontally repeating.
3. `05-light-rail-train.png` — independent moving three-car train; transparent canvas.
4. `06-dark-front-skyline.png` — dark city in front of the transit line.

The previous `02-distant-skyline.png` and `03-midground-skyline.png` are retained as optional, unchanged assets. They are **off by default** in the preview so the preferred dark silhouette reads clearly. They can be drawn between sky and track if desired. The removed faded buildings from the old near layer are not included in the active stack.

## Motion and alignment

All six PNGs are 1672 × 941 RGBA. Preserve their common canvas origin. Track top is y=661; train wheels end at y=661, so draw both at the same vertical offset. The train's opaque bounding box is `[561, 536, 1124, 661]` (right/bottom exclusive), 563 × 125 pixels including pantograph. To place the train's left edge at `trainX`, draw its full canvas at x=`trainX-561`.

Keep the track fixed in its parallax plane and advance `trainX` by a world speed times delta time. Round final display coordinates to integers. Wrap the train only once it is fully outside the viewport, leaving a gap before it re-enters. `preview.html` demonstrates this with 95 px/s independent rightward train movement. It includes pause, centering, individual layer views and optional old background layers.

Use point/nearest filtering, no mipmaps, no automatic atlas trim. Repeat the track and skyline horizontally at a period of 1672. No playable terrain, gameplay actors or rain is baked into these PNGs. Train movement is a runtime translation, not an animation baked into a static PNG.

## Validation and provenance

Shared 32-color navy/indigo palette; skyline/train/track alpha contains only 0 and 255. Opposite PNG edge columns are equal, including the train's empty margins. Validation and SHA-256 hashes are in `validation.json`. All original packs remain separate.

The image tool isolated the front skyline and generated the track/train; previously approved scripted cleanup restored palette, hard alpha and wrap edges. The generator returned the front image one pixel narrower, so one edge column was padded to match the common canvas without resampling. The train was translated vertically by -45 pixels without resizing to meet the measured rail height. The smaller train was redrawn by the image tool at the intended distant scale rather than rescaling the export. These are generated, pixel-cleaned assets, not hand-drawn originals. Prompts are included.

This export and its preview are independent from the game; no existing game background has been replaced automatically.

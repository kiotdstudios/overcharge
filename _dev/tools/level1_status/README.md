# level1_status

Builds `docs/design/OVERCHARGE_Level1_Roadmap.pdf` (the Level 1 status and finish list) from the real `src_scroll/levels/level1.json`.
The side-view map is drawn from the level file, so it always shows what is actually on Level 1.

1. `node _dev/tools/level1_status/build_level1_status.mjs` writes `out/OVERCHARGE_Level1_Roadmap.html` (the `out/` folder is not committed).
2. Print it to PDF with Edge or Chrome headless: `msedge --headless=new --no-pdf-header-footer --print-to-pdf=docs/design/OVERCHARGE_Level1_Roadmap.pdf file:///.../out/OVERCHARGE_Level1_Roadmap.html`

Text lives in `content.html` (status words are placeholders such as `{{DONE}}`), styling in `style.css`. Edit the text there, not in the PDF.
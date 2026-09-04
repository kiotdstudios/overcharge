# Editor — Phase 1

**Owner as of Phase 1:** Orcha (foundation).
**Next owner:** Aki (Phase 2+ once foundation stabilizes).

## Run

Start the game's dev server as usual (`start.bat` → `http://localhost:3000`), then open `http://localhost:3000/editor.html`.

## Layout (Phase 1)

- **Top bar:** tool selector (Place / Erase / Pan), zoom controls, level info.
- **Left sidebar:** asset browser with category filter + search.
- **Center:** level canvas with 32×32 grid overlay.
- **Right sidebar:** reserved for object inspector (Phase 3).

## Architecture

Modules are strictly separated by concern:

```
editor.html                 shell
editor/main.js              bootstrap (wire modules, event handlers, RAF loop)
editor/state.js             ★ single source of truth. subscribe/notify pattern.
editor/renderer.js          ★ pure draw fn(state, ctx). never mutates state.
editor/assets.js            asset browser sidebar
editor/tools.js             place / erase / pan tool objects
editor/SCHEMA.md            level JSON schema (authoritative)
editor/MANIFEST.md          manifest schema (authoritative)
```

`state.js` and `renderer.js` are the interfaces Aki should treat as stable. Everything else is scaffolding that can evolve.

## Data flow

1. `main.js` fetches `assets/manifest.json` → stores in `state.manifest`.
2. `main.js` fetches `src_scroll/levels/level1.json` → stores in `state.level`. (Any JSON conforming to `SCHEMA.md` works — no Level-1 assumptions in code.)
3. Canvas listens for mouse events, delegates to the active tool.
4. Tools mutate `state.level` and call `state.notify()`.
5. `renderer.render(ctx)` runs every frame, reads `state.*` only.

## Aki integration guide

### To add a new tool
Create an object in `editor/tools.js` (or a new file) with `{ name, cursor, onMouseDown, onMouseMove, onMouseUp }`. Register it in `TOOLS` at the bottom of that file. Add a button in `editor.html`'s top bar.

### To add asset categories
Do not add them here. Add them to `scripts/build_manifest.mjs::categorize()`, re-run the scanner. The browser UI reads categories dynamically from the manifest.

### To add object types (gates, switches, generators, enemies)
- Level schema: extend `SCHEMA.md`.
- Runtime: coordinate with Orcha on `Level` class in `src_scroll/level.js`.
- Editor placement: Phase 5 work.

### To add layers (background/foreground/etc.)
Phase 3 work. Do not touch until foundation is stable.

### To load a different level file
Change the fetch URL in `editor/main.js::bootstrap()`. In Phase 4 this becomes a File → Open dialog.

## Known Phase 1 limitations

- No save. Editor is read-only for now.
- No undo/redo. (Phase 2.)
- No selection tool. (Phase 2.)
- Place tool only places terrain tiles, not decorations/gameplay objects. (Phase 5.)
- Zoom is uniform; no per-axis stretch.

## Phase progression

Per Chief's roadmap:
- **Phase 1** *(this handoff)*: asset browser + grid + place + erase + pan/zoom.
- **Phase 2**: selection + multi-select + copy/paste + undo/redo.
- **Phase 3**: layers + inspector + collisions.
- **Phase 4**: save/load JSON + level dimensions.
- **Phase 5**: gameplay objects + property editing + puzzle links.
- **Phase 6**: prefabs + section copy.
- **Phase 7**: play from start / play from here.
- **Phase 8**: camera preview + jump overlay + polish.

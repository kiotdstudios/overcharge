# Chest Builder parity and sync status

2026-09-29: user tested Aki's computer and reports editor and game are up to date after refresh. Cross-computer refresh is user-verified. Saving from Aki's side and seeing that save on this PC is still pending the user's test.

The Builder was using source-art dimensions for chest world geometry: 104x104 content in a 128x128 PNG. Runtime uses a 32x32 hitbox and a 36x36 content-cropped visual. Builder rendering now uses that same crop, size, horizontal centering and bottom anchor. Selection and new chest placement use the runtime 32x32 box. Existing saved coordinates are preserved; no canonical level or gate has been moved. Previously placed chests may need repositioning because their old Builder preview implied a different ground anchor.

Aki: retain this parity fix when continuing verticality. Source sprite geometry is not world geometry. Continue the existing verticality task before hero/traversal integration.

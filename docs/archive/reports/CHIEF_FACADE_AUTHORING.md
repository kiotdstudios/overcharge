# Raised facade and landable roof authoring

User clarification 2026-09-29: the new level1 structure must allow walking in front on the lower rooftop and landing on its upper rooftop. Tile appearance alone cannot encode both solid walls and background facades. Do not globally disable horizontal collision based on a floor below: that recreates invisible interior floors.

Builder: select the raised structure's terrain tiles, excluding the lower floor, then under Objects / Arrange selection choose **Walk in front · landable top**. One undoable action preserves their artwork as background decorations, leaves one-way support on the selected top cells and opens the facade beneath. Undo restores the exact terrain/art state. Normal painted terrain remains solid on both axes; the lower roof remains real terrain. No saved gate is relocated.

Applied the same action to the user's new level1 structure, cols67–75 rows12–14. Shared terrain-policy.js distinguishes solid cells, standing support and descending one-way landing. Builder spawn/scenery grounding and placement guards now accept one-way support; preview draws those surfaces as thin ledges.

Tests: new facade route suite covers exact conversion undo/redo, walking across the whole lower front, jumping onto the raised roof and preserving gate/charge rules. Gate-roof, lower-route and exit suites also pass. Aki: retain this action and terrain policy during verticality integration; expansion moves facade decorations and one-way cells together using existing geometry fields.

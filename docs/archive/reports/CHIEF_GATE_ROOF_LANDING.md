# Gate roof landing — user-approved route

2026-09-29: user explicitly requested a landable top while retaining the lower path. Latest base level save: 1f4df2e. Added existing one-way platform tile 2 across row 10, columns 49–65; background facade remains intact and non-solid. Gate remains at (1984,256). No other terrain, devices or authored coordinates changed.

The existing one-way mechanic supports descent onto the top and lets players pass below or cross upward without hitting a ceiling. Down/S retains its existing drop-through behavior. It does not create a jump-height increase: the 192px climb from the lower roof remains too high for a single ordinary jump. The user's new right-hand platform provides the tested approach to the gate rooftop.

Validation: _dev/level1_gate_rooftop.mjs covers the actual right-platform jump, roof landing, lower crossing, upward crossing and unchanged gate/charge requirement. Existing lower-roof suite: 281 checks; exit exploration: 9 checks. Aki: preserve both routes during verticality integration.

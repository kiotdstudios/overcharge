# Chief's revised exit rule

Chief explicitly requested: player can explore past the gate but cannot leave until it is charged. This supersedes older full-column exit-barrier rulings.

Exit portals are non-solid on both axes. Interior gates and fences retain their existing physical barriers and Y-aware collision. Level completion requires an exit that is open, fully charged, and overlapping the player's actual world-space body. Same X on another floor, walking past an uncharged portal, remote opening, or an open flag without charge cannot finish a level. Passing the map edge does not create a new completion route. Required charge costs and authored gate positions are unchanged.

Verified real Player/Level passage past an uncharged exit and completion guards in _dev/exit_exploration.mjs (9 pass), lower rooftop route (281 pass), and updated superseded exit assertions in level2_fork. Aki: preserve this revised rule in verticality work; do not restore the old full-column exit barrier to satisfy stale documentation/tests.

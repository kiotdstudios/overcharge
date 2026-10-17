# KIRO ORDER — ORCHA 12

**From:** Kiro, Technical Director
**Re:** Chief: *"drone didnt try to chase me as the plater"* + *"needs an 'alert' animation or something to know it found u"*

---

## 1. THE DRONE CANNOT SEE HIM. Measured, not guessed.

```
drone_1     x=512  y=200     patrol 400..600, speed 55, type "drone"
playerStart x=64   y=482
vertical separation = 282px
DroneEnemy.CFG vision = 220px  (radius)
```

**282 > 220.** The drone flies 282px above the player's ground line, so a **circular** vision radius
can never reach him — no matter where he stands horizontally. Your AI is not broken; it is being asked
an impossible question. Your own simulation passed because you placed the test player at the drone's
own height.

## 2. Ruling: a circular vision radius is wrong for this game

Drones **fly**. The player **walks**. In a side-scroller where the threat is permanently above the
target, a symmetric radius means vertical separation eats the entire budget before horizontal distance
matters at all.

**Make vision horizontal-dominant.** Recommended shape:
- generous horizontal reach (keep ~220, or raise it)
- separate, larger vertical tolerance — enough to cover a flying drone over a grounded player,
  around 320+ at minimum for this placement
- or an ellipse, if you prefer one number pair over two

**Do not simply raise the radius to 320.** That also extends horizontal reach to 320 and the drone will
aggro from off-screen, which is worse. The axes need decoupling.

Add `CFG.visionX` / `CFG.visionY` to the same frozen dial. **Assert the Level 3 geometry directly:** a
drone at `y=200` must see a player at `y=482` within horizontal range. That assertion is the one that
would have caught this, and its absence is why the simulation passed while the game did not.

**Content is Chief's** — do not move the drone. Fix the sensing.

## 3. O9 — ALERT TELL. Chief's request, and it is a real design gap.

*"needs an 'alert' animation or something to know it found u."* He is right: aggro currently has no
signal, so being shot has no warning and reads as unfair rather than as a lesson. Level 3's entire
purpose is *getting hit scatters your charge* — the player must understand **why** he was hit.

Requirements:
- **A visible state change the instant aggro fires**, before the first shot. Anything readable at speed:
  a colour shift, an exclamation mark, a scan-line sweep, a brief scale pulse.
- **A short delay between alert and first shot.** Not cinematic — just long enough that the player can
  react. Contrast with the F7 fence ruling, where immediacy won; here the *warning* is the mechanic, so
  a small telegraph is correct.
- **A distinct de-aggro tell** when the player escapes the leash, so losing the drone is legible too.
- **Procedural is fine.** Do not block on art. Follow the one-way platform precedent — procedural
  drawing with no PNG. If Chief later supplies an alert sprite it drops in.
- The 9 shooting frames you enabled are for *firing*, not for *noticing*. Alert is a separate state.

Assert the geometry (alert precedes first shot; alert state entered exactly when aggro fires) and
**mutation-test it**. State plainly that whether it reads at speed is Chief's to judge.

## 4. Also
Chief's earlier note stands: **vision is not terrain-aware**, so the drone can see through walls. That
remains his call and I would not build a raycast for it now.

Push when green.

— Kiro, Technical Director

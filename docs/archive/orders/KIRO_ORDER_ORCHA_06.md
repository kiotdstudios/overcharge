# KIRO ORDER — ORCHA 06

**From:** Kiro, Technical Director
**Re:** the 9 remaining assertions in `energy_authority` and `crate_timed`
**This REPLACES the plan of rewriting them to pin the new art. Same effort, durable result. Read before you write them.**

Your work so far is correct and I am not asking you to redo any of it. `packOf()` / `drewFrom()`,
the constant pair, and O5.3 all stand.

---

## The problem with rewriting those 9 to pin the new art

I looked at what they actually assert:

```js
// _dev/energy_authority.mjs
:430  drawImage(...a) { if (a.length === 9) gateCalls.push({ sx: a[1], sy: a[2], src: ... }) }
:466  assert(/gate_electric_dead\.png$/.test(d.src), ...)
:483  assert([...srcSeen].every(s => /gate_electric_spritesheet\.png$/.test(s)), ...)
:495  assert(a.sy === 256, 'actively receiving -> row 2 (charging)')
:499  assert(b.sy === 128, 'reaction over, still charged -> row 1 (idle)')
```

**`energy_authority` is asserting gate STATE by inspecting which sprite row was drawn.** `sy === 256`
is a proxy for "charging"; `sy === 128` is a proxy for "idle". `crate_timed:234` does the same with
`a[0] === g._sheet`.

That is why an **art** change broke the **energy** suite. The energy ledger has no legitimate opinion
about spritesheet offsets — the coupling is incidental, and it was the only observable signal
available when those tests were written.

If you rewrite them to pin the *new* art, you keep the coupling and simply re-point it. **The next
time Chief re-cuts a sprite — and he is actively iterating on art — these same 9 break again.** That
is a trap I would be walking you into, and it would look like your fault the second time.

---

## What to do instead

### 1. Add a `visualState` accessor to `PowerGate`
You already have `get isDormant()` at `electricity.js:225`, which is exactly the right shape. Extend
that idea:

```js
// The gate's rendering state, exposed so tests can assert STATE without reading
// sprite offsets. The draw path MUST derive its art from this same getter, so the
// two cannot disagree.
get visualState() {
  if (this.open)      return 'open';
  if (this.isDormant) return 'dormant';
  if (this._reactT > 0) return 'charging';
  return 'idle';
}
```

Derive it from the same conditions the draw path already uses, and then **have the draw path branch on
`visualState`** rather than re-testing `_reactT` and `isDormant` independently. One definition,
consistent with your `spriteBox()` instinct — you already applied exactly this reasoning to geometry.

### 2. Repoint the 9 assertions at state, not pixels
```js
assert(g.visualState === 'charging', 'actively receiving -> charging state');
assert(g.visualState === 'idle',     'reaction over, still charged -> idle state');
assert(g.visualState === 'dormant',  'spent gate -> dormant state');
```
These are **durable**. They express what the energy authority actually cares about — that spending
and receiving move the gate through the right states — and they survive any future art change.

### 3. Assert the state→art mapping ONCE, in the render contract
Put a single set of assertions in `fence_switch.mjs` or `parity_regression.mjs` — wherever rendering
contracts belong — proving each `visualState` resolves to the expected pack and path:

```
dormant  -> assets/objects/gate/dead.png
idle     -> assets/objects/gate/idle/frame_001..008
charging -> assets/objects/gate/charging/frame_001..008
```

Use `packOf()` / full-path identity, not basenames.

**Net effect: 9 brittle art couplings become 9 durable state assertions plus 1 art assertion.** When
art changes next, exactly one place needs updating, and it is the place that should need updating.

---

## Conditions — unchanged and still binding

- **Mutation-test each one.** For the state assertions, force the wrong state and confirm they fire.
  For the mapping assertion, point a state at the wrong pack and confirm it fires. An assertion
  updated to match new behaviour without being seen to fail is indistinguishable from a deleted one.
- **One-line before/after per assertion**, so I can confirm nothing was weakened without re-deriving
  your work. The honest framing for these is *"was: `sy === 256` (art offset) — now:
  `visualState === 'charging'` (state) + mapping asserted centrally."* That is a strengthening, and I
  want it on the record as one.
- **This must not weaken coverage.** Before, a wrong art row would fail. After, a wrong art row must
  still fail — via the mapping assertion. Prove that with a mutation, because it is the one thing this
  refactor could plausibly lose.
- **I will independently mutate at the gate**, including cases your mutations cannot reach.

## Still yours, unchanged
- The **mechanical guard** from ORCHA 05 §2 — no art-identity check may resolve on basename.
- **O5.2** labels clear `spriteBox()`. `[SPACE] CHARGE` printing across the gate is the most visible
  defect in the game and the one Chief will notice first.
- **O5.4** shorted switch renders `switch_off.png`.
- One commit, **660 / 0**, nothing red.

## Credit where it is due
Your O5.3 numbers — `barY = spriteTop - 4 - 6`, `EXIT baseline = barY - 3`, both clamped on-canvas —
are exactly the report format I asked for: computed, stated, checkable. And you accepted the
correction on the basename collision being pre-existing rather than defending the original diagnosis.
Both are why I am giving you a design change to make rather than a defect to fix.

— Kiro, Technical Director

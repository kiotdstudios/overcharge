// history.js — undo/redo via a stack of Action objects.
//
// Every mutation to the level goes through history.apply(action). Actions
// are plain objects with forward() and inverse(). Undo pops and runs inverse.
// Redo pushes back and re-runs forward.
//
// Composite actions (multi-tile drag, paste-of-N-items, group-move) wrap
// several primitives so Ctrl+Z rolls back the whole gesture in one press.
//
// Architecture: this module knows nothing about tiles/decorations/selection.
// It only calls .forward() and .inverse() on action objects. Action types
// live in actions.js and can grow independently through Phase 3-7 (layers,
// inspector edits, collision, links) without touching this file.

import { state, notify } from './state.js';

// Mark the level as having unsaved changes. Called on every history mutation.
// state.dirty is checked by persistence.js before switching/discarding levels.
function _markDirty() { state.dirty = true; }

const MAX_DEPTH = 200;   // spec asks for at least 100; 200 gives headroom

const _undo = [];   // stack of actions applied
const _redo = [];   // stack of actions rolled back (cleared on any new apply)

// Apply a fresh action: run its forward(), push onto undo, clear redo.
export function apply(action) {
  if (!action) return;
  action.forward();
  _undo.push(action);
  if (_undo.length > MAX_DEPTH) _undo.shift();   // drop oldest
  _redo.length = 0;                              // any new action invalidates redo
  _markDirty();
  notify();
}

// Push an already-applied action onto history WITHOUT re-running forward().
// Used when a tool has already mutated state and just wants to record it —
// e.g. drag-move: state was mutated live for user feedback, but we push one
// action at mouseUp that records the net delta.
export function record(action) {
  if (!action) return;
  _undo.push(action);
  if (_undo.length > MAX_DEPTH) _undo.shift();
  _redo.length = 0;
  _markDirty();
  notify();
}

export function undo() {
  const a = _undo.pop();
  if (!a) return false;
  a.inverse();
  _redo.push(a);
  _markDirty();
  notify();
  return true;
}

export function redo() {
  const a = _redo.pop();
  if (!a) return false;
  a.forward();
  _undo.push(a);
  _markDirty();
  notify();
  return true;
}

export function canUndo() { return _undo.length > 0; }
export function canRedo() { return _redo.length > 0; }
export function depth()   { return _undo.length; }

// Wipe the entire history — call this on level load so undo can't roll back
// PAST the initial state (which would leave the level in an undefined shape).
export function clearAll() {
  _undo.length = 0;
  _redo.length = 0;
  notify();
}

// ── CompositeAction: wraps N primitives into one undo/redo unit ──────────
// Applying a composite runs its children forward in order. Undoing runs
// them inverse in REVERSE order. Used for multi-tile drags, group moves,
// paste-of-N, delete-of-N.
export function makeComposite(actions, label = 'composite') {
  return {
    type:    'composite',
    label:   label,
    actions: actions.slice(),
    forward() { for (let i = 0; i < this.actions.length; i++) this.actions[i].forward(); },
    inverse() { for (let i = this.actions.length - 1; i >= 0; i--) this.actions[i].inverse(); },
  };
}

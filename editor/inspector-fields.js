// Pure, DOM-free field-spec builders for the generic Inspector panel renderer
// in main.js. Pulled out so Order AKI_26 (and future orders) can unit-test
// "what fields does this object kind expose, with what labels/keys" without
// a browser or DOM shim. main.js owns rendering; this module owns the specs.
//
// Field shape: { label, key, text?, num?, min?, bool?, sel?, opts?, ro? }
// — identical contract the renderer in main.js already consumes.

// AKI_26 item 1.1: "Uncharged" checkbox on every charged source.
// Default unticked (ref.uncharged undefined/false) = charged as today —
// the `charge` KEY is unchanged (shared data contract with Codex), only the
// on-screen LABEL changes to "Capacity" so Chief reads it as a capacity, not
// a starting charge.
export function sourceFields(ref) {
  return [
    { label: 'label',     key: 'label',     text: true },
    { label: 'Capacity',  key: 'charge',    num: true, min: 1 },
    { label: 'Uncharged', key: 'uncharged', bool: true },
    { label: 'x', key: 'x', num: true },
    { label: 'y', key: 'y', num: true },
  ];
}

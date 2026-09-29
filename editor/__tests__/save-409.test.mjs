// Mocked-fetch test for pushLevelToGitHub — verifies AKI_SAVE_409_HANDOFF.md
// checklist items 2, 3, 4, 5 without touching a real GitHub token or repo.
// Run: node editor/__tests__/save-409.test.mjs

// --- minimal browser shims persistence.js's imports need at module load ---
globalThis.window = globalThis.window || {};
globalThis.localStorage = (() => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
})();
globalThis.btoa = globalThis.btoa || (s => Buffer.from(s, 'binary').toString('base64'));
globalThis.document = globalThis.document || { getElementById: () => null };

let calls = [];
let scriptedResponses = [];
function mockFetch(url, opts) {
  calls.push({ url, opts });
  const next = scriptedResponses.shift();
  if (!next) throw new Error('mockFetch: no scripted response left for ' + url);
  if (typeof next === 'function') return next(url, opts);
  return Promise.resolve(next);
}
function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

globalThis.fetch = (...args) => mockFetch(...args);

const { pushLevelToGitHub, setGitHubPat, isPublishing } =
  await import('../persistence.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  -', name); }
  else      { fail++; console.log('  FAIL -', name); }
}
function reset() { calls = []; scriptedResponses = []; }

setGitHubPat('fake-pat-for-test');

// ── Scenario 1: happy path — GET returns sha, PUT succeeds ────────────────
{
  reset();
  scriptedResponses = [
    jsonResponse(200, { sha: 'sha-abc111' }),
    jsonResponse(201, { commit: { sha: 'deadbeef1234' }, content: { sha: 'sha-new222' } }),
  ];
  const r = await pushLevelToGitHub('{"a":1}', 7);
  check('happy path succeeds', r.ok === true);
  check('GET uses cache: no-store', calls[0].opts?.cache === 'no-store');
  check('GET url has cache-busting query', /[?&]_=\d+/.test(calls[0].url));
  check('GET ref is agent/orcha-gameplay', calls[0].url.includes('ref=agent/orcha-gameplay'));
  const putBody = JSON.parse(calls[1].opts.body);
  check('PUT branch is agent/orcha-gameplay', putBody.branch === 'agent/orcha-gameplay');
  check('PUT uses the freshly-fetched sha, not a stale one', putBody.sha === 'sha-abc111');
  check('not publishing after completion', isPublishing() === false);
}

// ── Scenario 2: first save ever (404 on GET = no sha) ──────────────────────
{
  reset();
  scriptedResponses = [
    jsonResponse(404, {}),
    jsonResponse(201, { commit: { sha: 'cafef00d' }, content: { sha: 'sha-first' } }),
  ];
  const r = await pushLevelToGitHub('{"a":1}', 8);
  check('404 on GET treated as first upload, not an error', r.ok === true);
  const putBody = JSON.parse(calls[1].opts.body);
  check('PUT omits sha when file did not exist', !('sha' in putBody));
}

// ── Scenario 3: 409 where remote is unchanged from our read (stale-cache
//    style false conflict) — must retry once with a fresh sha, not fail ───
{
  reset();
  scriptedResponses = [
    jsonResponse(200, { sha: 'sha-stale' }),                         // initial GET
    jsonResponse(409, {}),                                            // PUT conflict
    jsonResponse(200, { sha: 'sha-stale' }),                         // recheck GET: unchanged
    jsonResponse(201, { commit: { sha: '1111111' }, content: { sha: 'sha-retry-ok' } }), // retry PUT succeeds
  ];
  const r = await pushLevelToGitHub('{"a":2}', 9);
  check('409 with unchanged remote retries and succeeds', r.ok === true);
  check('exactly one retry happened (4 fetch calls)', calls.length === 4);
}

// ── Scenario 4: 409 where remote genuinely changed — must NOT retry, must
//    report a conflict, must NOT claim success ─────────────────────────────
{
  reset();
  scriptedResponses = [
    jsonResponse(200, { sha: 'sha-v1' }),                             // initial GET
    jsonResponse(409, {}),                                            // PUT conflict
    jsonResponse(200, { sha: 'sha-v2-someone-else-changed-it' }),    // recheck: different!
  ];
  const r = await pushLevelToGitHub('{"a":3}', 10);
  check('genuine conflict is reported, not silently overwritten', r.ok === false && r.conflict === true);
  check('no further PUT attempted (only 3 fetch calls)', calls.length === 3);
}

// ── Scenario 5: double-click / concurrent save — second call while the
//    first is in flight must be rejected instantly, not queued or raced ───
{
  reset();
  let releaseFirst;
  scriptedResponses = [
    (url) => new Promise(res => { releaseFirst = () => res(jsonResponse(200, { sha: 'x' })); }),
  ];
  const firstCallPromise = pushLevelToGitHub('{"a":4}', 11);
  check('isPublishing() true while a save is in flight', isPublishing() === true);
  const secondCall = await pushLevelToGitHub('{"a":4}', 11);
  check('second concurrent call is rejected, not queued', secondCall.ok === false && /already in progress/.test(secondCall.message));
  // release the first call's GET, then let it fail gracefully (no more scripted responses) so the test doesn't hang
  scriptedResponses.push(jsonResponse(201, { commit: { sha: '2222222' }, content: { sha: 'sha-ok' } }));
  releaseFirst();
  await firstCallPromise;
  check('isPublishing() false after completion', isPublishing() === false);
}

// ── Scenario 6: network failure — must not crash, must report failure ─────
{
  reset();
  scriptedResponses = [() => Promise.reject(new Error('network down'))];
  const r = await pushLevelToGitHub('{"a":5}', 12);
  check('network failure on GET is reported, not thrown', r.ok === false && /Network error/.test(r.message));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

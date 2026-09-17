#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// OVERCHARGE AGENT BOARD  ·  owned by Kiro (Technical Director)
//
// WHY THIS EXISTS
// Git is already our message bus: every order, report and gate result is a
// committed file with a SHA. What we lacked was an INDEX. The truth was smeared
// across KIRO_STATUS.md, AKI_STATUS.md, ORCHA_STATUS.md, a pile of
// docs/KIRO_ORDER_*.md and three branch heads — so agents had to hunt for their
// orders with a glob, and Chief had to relay "orcha is done" by hand.
//
// This DERIVES the whole board from git. Nothing here is hand-maintained, so it
// cannot drift from reality the way a hand-written status table does.
//
//   node _kiro/agent_board.mjs            # print the board
//   node _kiro/agent_board.mjs --write    # also write docs/AGENT_BOARD.md + .json
//
// HARD LIMIT (see docs/KIRO_REVIEW_AKI_SKILLS_01.md):
//   Automation may TRANSPORT and NOTIFY. It must never DECIDE or MERGE.
//   This script is read-only against git. It runs no tests, moves no branches,
//   and merges nothing. `--write` touches only the two board files.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.env.OVERCHARGE_REPO || process.cwd();
const WRITE = process.argv.includes('--write');

// execFileSync with an argv array bypasses the shell entirely. This matters on
// this machine: through cmd.exe/PowerShell a git --format=%h gets its % eaten
// ("'%ad' is not recognized as an internal or external command"). No shell, no
// mangling. Do not "simplify" this back to a single command string.
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (e) {
    return { __err: (e.stderr || e.message || '').trim() };
  }
};
const gitOk = (...args) => { const r = git(...args); return typeof r === 'string' ? r : ''; };

const LIVE = 'agent/orcha-gameplay';
const LIVE_REF = `origin/${LIVE}`;

const AGENTS = [
  { name: 'Aki',   key: 'AKI',   branch: 'agent/aki-editor', lane: 'Builder / editor / assets',
    status: 'AKI_STATUS.md' },
  { name: 'Orcha', key: 'ORCHA', branch: 'agent/orcha-dev',  lane: 'Runtime / gameplay / test suites',
    status: 'ORCHA_STATUS.md' },
];

gitOk('fetch', '--all', '-q', '--prune');
gitOk('fetch', '--tags', '-q');

// ── live line ───────────────────────────────────────────────────────────────
const liveHead = gitOk('rev-parse', '--short', LIVE_REF);
const liveDate = gitOk('log', '-1', '--format=%ad', '--date=short', LIVE_REF);
const liveSubj = gitOk('log', '-1', '--format=%s', LIVE_REF);

// ── order files on the live line (the only authoritative source) ─────────────
const docFiles = gitOk('ls-tree', '-r', '--name-only', LIVE_REF, '--', 'docs/')
  .split('\n').map(s => s.trim()).filter(Boolean);

// A directive is not only a KIRO_ORDER_*. Answers docs and review docs carry
// binding instructions too — ANSWERS_ORCHA_01 is what Orcha actually built Q5/Q7
// from, and REVIEW_AKI_SKILLS_01 contains required corrections. Matching only
// KIRO_ORDER_* pointed agents at a stale order. Sort by LAST COMMIT DATE rather
// than by the number in the filename, so the newest directive always wins
// regardless of which family it belongs to.
const directivesFor = (agentUpper) => {
  const re = new RegExp(`^KIRO_(ORDER|ANSWERS|REVIEW|GATE_RESULT)_.*${agentUpper}`, 'i');
  const cands = docFiles.filter(f => re.test(path.basename(f)));
  const dated = cands.map(f => ({
    file: f,
    when: gitOk('log', '-1', '--format=%ad', '--date=short', LIVE_REF, '--', f),
    ts: Number(gitOk('log', '-1', '--format=%at', LIVE_REF, '--', f) || 0),
  }));
  dated.sort((a, b) => b.ts - a.ts);
  return dated;
};

// ── last gate result, parsed out of KIRO_STATUS.md on the live line ──────────
let lastGate = '(none found)';
{
  const raw = gitOk('show', `${LIVE_REF}:KIRO_STATUS.md`);
  const heads = raw.split('\n').filter(l => /^##\s+/.test(l));
  const gates = heads.filter(l => /QA GATE|GATE RESULT/i.test(l));
  if (gates.length) lastGate = gates[gates.length - 1].replace(/^##\s+/, '').trim();
}

// ── per-agent derived state ─────────────────────────────────────────────────
const rows = AGENTS.map(a => {
  const ref = `origin/${a.branch}`;
  const exists = typeof git('rev-parse', '--verify', '--quiet', ref) === 'string'
    && gitOk('rev-parse', '--verify', '--quiet', ref) !== '';
  if (!exists) return { ...a, missing: true };

  const head = gitOk('rev-parse', '--short', ref);
  const date = gitOk('log', '-1', '--format=%ad', '--date=short', ref);
  const subj = gitOk('log', '-1', '--format=%s', ref);
  const behind = Number(gitOk('rev-list', '--count', `${ref}..${LIVE_REF}`) || 0);
  const unmerged = Number(gitOk('rev-list', '--count', `${LIVE_REF}..${ref}`) || 0);

  const changed = unmerged > 0
    ? gitOk('diff', '--name-only', `${LIVE_REF}...${ref}`).split('\n').filter(Boolean)
    : [];

  // Did they file a report alongside the work? Governance requires one per delivery.
  const reported = unmerged > 0 ? changed.includes(a.status) : null;

  // Status is DERIVED, never asserted by an agent.
  let state, detail;
  if (unmerged > 0 && behind > 0) { state = 'DELIVERED (branch also behind)'; detail = `${unmerged} commit(s) awaiting gate; ${behind} behind live`; }
  else if (unmerged > 0)          { state = 'DELIVERED — awaiting Kiro gate';  detail = `${unmerged} commit(s) awaiting gate`; }
  else if (behind > 0)            { state = 'IDLE / needs sync';               detail = `${behind} commit(s) behind live — run: git fetch origin && git merge ${LIVE_REF}`; }
  else                            { state = 'IN SYNC — nothing pending';       detail = 'branch equals live line'; }

  const directives = directivesFor(a.key);
  const order = directives[0] || null;
  return { ...a, head, date, subj, behind, unmerged, changed, reported, state, detail, order, directives };
});

// ── render ──────────────────────────────────────────────────────────────────
const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + 'Z';
const L = [];
L.push('# OVERCHARGE — AGENT BOARD');
L.push('');
L.push('**DERIVED FILE — do not hand-edit.** Regenerate with `node _kiro/agent_board.mjs --write`.');
L.push('Every value here comes from git, so it cannot drift from reality. Owned by Kiro.');
L.push('');
L.push(`_Generated ${now}_`);
L.push('');
L.push('## Live line — the only thing GitHub Pages serves');
L.push('');
L.push(`| | |`);
L.push(`|---|---|`);
L.push(`| Branch | \`${LIVE}\` |`);
L.push(`| Head | \`${liveHead}\` (${liveDate}) |`);
L.push(`| Last commit | ${liveSubj} |`);
L.push(`| Last gate | ${lastGate} |`);
L.push(`| Game | https://kiotdstudios.github.io/overcharge/index.html |`);
L.push(`| Builder | https://kiotdstudios.github.io/overcharge/editor.html |`);
L.push('');
L.push('**Agents never push to the live line.** Kiro merges to it after a gate. Orders are read');
L.push('from it; work is pushed to your own branch.');
L.push('');
L.push('## Agents');
L.push('');
L.push('| Agent | Branch | Head | State | Newest directive | Report filed |');
L.push('|---|---|---|---|---|---|');
for (const r of rows) {
  if (r.missing) { L.push(`| ${r.name} | \`${r.branch}\` | — | **BRANCH MISSING** | — | — |`); continue; }
  const rep = r.reported === null ? '—' : (r.reported ? 'yes' : '**NO**');
  L.push(`| ${r.name} | \`${r.branch}\` | \`${r.head}\` | ${r.state} | ${r.order ? `\`${path.basename(r.order.file)}\`` : '—'} | ${rep} |`);
}
L.push('');
for (const r of rows) {
  if (r.missing) continue;
  L.push(`### ${r.name} — ${r.lane}`);
  L.push('');
  L.push(`- **Branch:** \`${r.branch}\` at \`${r.head}\` (${r.date})`);
  L.push(`- **Last commit:** ${r.subj}`);
  L.push(`- **State:** ${r.state} — ${r.detail}`);
  L.push(`- **Newest directive:** ${r.order ? `\`${r.order.file}\` (${r.order.when})` : '(none found)'}`);
  L.push(`- **Read it with:** \`git show ${LIVE_REF}:${r.order ? r.order.file : 'docs/<order>.md'}\``);
  if (r.directives && r.directives.length > 1) {
    L.push(`- **All open directives for you (newest first):**`);
    for (const d of r.directives.slice(0, 6)) L.push(`    - \`${d.file}\` — ${d.when}`);
    if (r.directives.length > 6) L.push(`    - _…and ${r.directives.length - 6} older_`);
  }
  if (r.unmerged > 0) {
    L.push(`- **Report filed this delivery:** ${r.reported ? 'yes' : 'NO — governance requires one per delivery'}`);
    L.push(`- **Files changed vs live (${r.changed.length}):**`);
    for (const f of r.changed.slice(0, 20)) L.push(`    - \`${f}\``);
    if (r.changed.length > 20) L.push(`    - _…and ${r.changed.length - 20} more_`);
  }
  L.push('');
}
L.push('## How to use this board');
L.push('');
L.push('**Agents —** on wake, read this one file instead of scanning `docs/`:');
L.push('');
L.push('```');
L.push('git fetch origin');
L.push(`git show ${LIVE_REF}:docs/AGENT_BOARD.md`);
L.push('```');
L.push('');
L.push('Your row names your current order and the exact command to read it. If **State** says');
L.push('`needs sync`, sync before doing anything — a stale branch is how an order gets reported');
L.push('missing when it has been on origin all along.');
L.push('');
L.push('**Kiro —** a non-empty `unmerged` count is a delivery awaiting a gate. No relay needed.');
L.push('');
L.push('**Limit:** this board transports and notifies. It never decides or merges. Orders stay');
L.push('authored by Kiro, gates stay run against a real tree, merges to the live line stay Kiro\'s.');
const md = L.join('\n') + '\n';

const json = {
  _schema: 'overcharge-agent-board@1',
  _note: 'DERIVED from git by _kiro/agent_board.mjs. Do not hand-edit.',
  generated: now,
  live: { branch: LIVE, head: liveHead, date: liveDate, subject: liveSubj, lastGate },
  agents: rows.map(r => r.missing
    ? { name: r.name, branch: r.branch, missing: true }
    : {
        name: r.name, lane: r.lane, branch: r.branch, head: r.head, date: r.date,
        subject: r.subj, behind: r.behind, unmerged: r.unmerged,
        state: r.state, detail: r.detail,
        newestDirective: r.order ? r.order.file : null,
        openDirectives: (r.directives || []).map(d => ({ file: d.file, when: d.when })),
        reportFiled: r.reported, filesChanged: r.changed,
      }),
};

console.log(md);
if (WRITE) {
  fs.mkdirSync(path.join(REPO, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'docs', 'AGENT_BOARD.md'), md, 'utf8');
  fs.writeFileSync(path.join(REPO, 'docs', 'agent_board.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.error('[board] wrote docs/AGENT_BOARD.md and docs/agent_board.json');
}

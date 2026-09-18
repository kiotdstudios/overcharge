// OVERCHARGE protocol handler:  overcharge://push  ->  push_overcharge.bat
//
// WHY NODE AND NOT A .CMD
// The first version validated the URL in cmd. That was the wrong tool: cmd applies
// its own argument splitting BEFORE any check runs, so "overcharge://push;calc" and
// "overcharge://push|calc" arrived already truncated to "overcharge://push" and were
// ACCEPTED, and an empty argument produced "set was unexpected at this time" instead
// of a clean refusal. The extra text was discarded rather than executed, so it was
// not an injection - but accepting malformed input is not a property worth keeping.
// Node's argv is properly delimited, so validation happens on the real string.
//
// SECURITY MODEL
//   A registered protocol can be invoked by ANY web page on this machine.
//   1. The URL is matched against a strict regex. It is NEVER interpolated into a
//      shell command, and no shell is used to launch the action (spawn with an
//      argv array, shell:false).
//   2. Only the exact action "push" is permitted. Anything else exits 1.
//   3. push_overcharge.bat still prompts Y/N before committing, so a drive-by
//      invocation cannot silently push. That confirmation is the real safety net.
//   4. Nothing from the URL is forwarded to the bat.
//
//   OVERCHARGE_TEST=1 makes it report the decision and exit without launching.
//   It does not relax validation.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const raw = process.argv[2] ?? '';
const BAT = path.join(process.env.USERPROFILE || '', 'Desktop', 'push_overcharge.bat');
const TEST = process.env.OVERCHARGE_TEST === '1';

// Strict: scheme, one action of letters only, at most one trailing slash. Nothing else.
// No query, no fragment, no path segments, no separators of any kind.
const M = /^overcharge:\/\/([A-Za-z]+)\/?$/.exec(raw.trim());
const action = M ? M[1].toLowerCase() : null;
const ALLOWED = new Set(['push']);

function refuse(why) {
  console.log('REFUSED: ' + why);
  console.log('  received : ' + JSON.stringify(raw));
  console.log('  parsed   : ' + JSON.stringify(action));
  console.log('Only "overcharge://push" is permitted.');
  if (!TEST) { process.stdout.write('\nPress Enter to close.\n'); try { fs.readSync(0, Buffer.alloc(1)); } catch {} }
  process.exit(1);
}

if (!M) refuse('malformed URL');
if (!ALLOWED.has(action)) refuse(`unrecognised action "${action}"`);

if (!fs.existsSync(BAT)) {
  console.log('ERROR: push_overcharge.bat not found at ' + BAT);
  if (!TEST) { process.stdout.write('\nPress Enter to close.\n'); try { fs.readSync(0, Buffer.alloc(1)); } catch {} }
  process.exit(1);
}

console.log('ACCEPTED: action "push" -> ' + BAT);
if (TEST) process.exit(0);

// shell:false and an argv array — the URL never reaches a command line.
const child = spawn(process.env.COMSPEC || 'cmd.exe', ['/c', BAT], {
  stdio: 'inherit', shell: false, windowsHide: false,
});
child.on('exit', (code) => process.exit(code ?? 0));

// Publish a tested commit to the live Pages branch, then verify its Pages build.
// Usage: node scripts/publish_live.mjs [--preset gameplay|editor|all] [--suite name.mjs ...]
// This never stages, commits, resets, or force-pushes user work.
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const branch = 'agent/orcha-gameplay';
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${root}`, ...args], { cwd: root, encoding: 'utf8' }).trim();
const stop = message => { console.error(message); process.exit(1); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  const tracked = git('status', '--porcelain', '--untracked-files=no');
  if (tracked) stop('Tracked edits are uncommitted. Commit and test them before publishing.');
  const sha = git('rev-parse', 'HEAD');
  console.log(`Checking ${sha.slice(0, 8)} for live game…`);
  const test = spawnSync(process.execPath, [join(root, 'scripts', 'check_change.mjs'), ...process.argv.slice(2)], {
    cwd: root, stdio: 'inherit', timeout: 600000,
  });
  if (test.status !== 0) stop('Checks failed; nothing was pushed.');

  git('fetch', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const liveBefore = git('rev-parse', `refs/remotes/origin/${branch}`);
  if (git('merge-base', liveBefore, sha) !== liveBefore) {
    stop(`Live branch ${liveBefore.slice(0, 8)} is not an ancestor of this commit. Integrate live changes first; nothing was pushed.`);
  }
  git('push', 'origin', `HEAD:refs/heads/${branch}`);
  const liveAfter = git('ls-remote', 'origin', `refs/heads/${branch}`).split(/\s+/)[0];
  if (liveAfter !== sha) stop(`Push returned, but remote branch did not match ${sha.slice(0, 8)}.`);
  console.log(`Live branch confirmed at ${sha.slice(0, 8)}. Waiting for Pages…`);

  const url = `https://api.github.com/repos/kiotdstudios/overcharge/actions/runs?head_sha=${sha}&per_page=30`;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'overcharge-publisher' } });
      if (response.ok) {
        const data = await response.json();
        const run = data.workflow_runs?.find(r => r.head_branch === branch && /pages|deploy/i.test(`${r.name} ${r.display_title}`));
        if (run?.status === 'completed') {
          if (run.conclusion !== 'success') stop(`Pushed ${sha.slice(0, 8)}, but Pages ${run.conclusion}: ${run.html_url}`);
          console.log(`LIVE: https://kiotdstudios.github.io/overcharge/?v=${sha.slice(0, 8)}`);
          console.log(`Pages build: ${run.html_url}`);
          process.exit(0);
        }
      }
    } catch { /* A temporary API or network failure should not be called a successful deployment. */ }
    await pause(10000);
  }
  stop(`Pushed ${sha.slice(0, 8)}, but Pages could not be verified within four minutes. Check the Actions page before calling it live.`);
} catch (error) {
  stop(`Publish stopped: ${error.message}. No force push or reset was attempted.`);
}


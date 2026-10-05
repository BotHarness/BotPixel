#!/usr/bin/env node
/**
 * Publish the packages, in dependency order. Ported from BotUI's scripts/release.mjs.
 *
 * `@botharness/pixel-avatar` depends on `@botharness/pixel-morph` with `workspace:^`,
 * which pnpm rewrites to the real version on publish, so morph has to be on npm first.
 *
 * Dry run unless `--yes`: a publish cannot be undone.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yes = process.argv.includes('--yes');
const tag = process.argv.includes('--tag')
  ? process.argv[process.argv.indexOf('--tag') + 1]
  : undefined;

const pnpm = (args, cwd, env) =>
  execFileSync('pnpm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env });

process.stdout.write('building and verifying…\n');
pnpm(['build'], root);
pnpm(['verify'], root);

// The token only reaches the publish processes, through a throwaway npmrc (mode 600)
// named by NPM_CONFIG_USERCONFIG: argv is visible in `ps` and CI logs, and a project
// .npmrc would apply it to every npm call. pnpm 11+ ignores `npm_config_*` auth
// variables, which is why an environment variable alone is not enough.
let publishEnv = process.env;
let tokenDir;
const token = readToken();
if (token && yes) {
  tokenDir = mkdtempSync(join(tmpdir(), 'botpixel-release-'));
  const userconfig = join(tokenDir, 'npmrc');
  writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${token}\n`, { mode: 0o600 });
  publishEnv = { ...process.env, NPM_CONFIG_USERCONFIG: userconfig };
}

const ORDER = [
  { dir: 'packages/morph', name: '@botharness/pixel-morph', why: 'depends on nothing' },
  { dir: 'packages/avatar', name: '@botharness/pixel-avatar', why: 'depends on pixel-morph' },
];

/**
 * The publish token: NPM_TOKEN in CI (the repo secret), else `npm_release.token` (gitignored, written
 * by `scripts/npm-token.sh`), or the file named by NPM_TOKEN_FILE, which lets this repo
 * reuse the token BotUI already stores. Absent is not an error: a dry run needs none,
 * and `npm publish` explains a missing token better than this script could.
 */
function readToken() {
  if (process.env.NPM_TOKEN) return process.env.NPM_TOKEN.trim();
  const file = process.env.NPM_TOKEN_FILE ?? join(root, 'npm_release.token');
  try {
    return readFileSync(file, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}

try {
  for (const pkg of ORDER) await publish(pkg);
} finally {
  if (tokenDir) rmSync(tokenDir, { recursive: true, force: true });
}

// A release usually bumps one package; the other is already on npm at its version, and
// publishing it again would fail after the first package went out.
async function published(name, version) {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}/${version}`);
  return res.ok;
}

async function publish(pkg) {
  const version = JSON.parse(readFileSync(join(root, pkg.dir, 'package.json'), 'utf8')).version;
  process.stdout.write(`\n${pkg.name}@${version}  — ${pkg.why}\n`);
  if (await published(pkg.name, version)) {
    process.stdout.write('  already on npm, skipped\n');
    return;
  }
  if (!yes) {
    process.stdout.write(
      `  would run: pnpm --filter ${pkg.name} publish --access public${tag ? ` --tag ${tag}` : ''}\n`,
    );
    return;
  }
  const args = ['--filter', pkg.name, 'publish', '--access', 'public', '--no-git-checks'];
  if (tag) args.push('--tag', tag);
  process.stdout.write(pnpm(args, root, publishEnv));
}

process.stdout.write(
  yes
    ? '\npublished.\n'
    : '\ndry run. Re-run with --yes to publish, and --tag next for a prerelease.\n',
);

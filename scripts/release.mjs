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
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yes = process.argv.includes('--yes');
const tag = process.argv.includes('--tag')
  ? process.argv[process.argv.indexOf('--tag') + 1]
  : undefined;

// The token only reaches the publish processes, through the environment: argv is
// visible in `ps` and CI logs, and a project .npmrc would apply it to every npm call.
let publishEnv = process.env;
const token = readToken();
if (token && yes) {
  publishEnv = { ...process.env, 'npm_config_//registry.npmjs.org/:_authToken': token };
}

const ORDER = [
  { dir: 'packages/morph', name: '@botharness/pixel-morph', why: 'depends on nothing' },
  { dir: 'packages/avatar', name: '@botharness/pixel-avatar', why: 'depends on pixel-morph' },
];

const pnpm = (args, cwd, env) =>
  execFileSync('pnpm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env });

/**
 * The publish token, if this machine has one: `npm_release.token` (gitignored, written
 * by `scripts/npm-token.sh`), or the file named by NPM_TOKEN_FILE, which lets this repo
 * reuse the token BotUI already stores. Absent is not an error: a dry run needs none,
 * and `npm publish` explains a missing token better than this script could.
 */
function readToken() {
  const file = process.env.NPM_TOKEN_FILE ?? join(root, 'npm_release.token');
  try {
    return readFileSync(file, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}

process.stdout.write('building and verifying…\n');
pnpm(['build'], root);
pnpm(['verify'], root);

for (const pkg of ORDER) {
  const version = JSON.parse(readFileSync(join(root, pkg.dir, 'package.json'), 'utf8')).version;
  process.stdout.write(`\n${pkg.name}@${version}  — ${pkg.why}\n`);
  if (!yes) {
    process.stdout.write(
      `  would run: pnpm --filter ${pkg.name} publish --access public${tag ? ` --tag ${tag}` : ''}\n`,
    );
    continue;
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

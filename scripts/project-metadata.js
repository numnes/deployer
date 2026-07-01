#!/usr/bin/env node
/**
 * Detect project metadata from a repo folder and build dashboard registration JSON.
 *
 *   node scripts/project-metadata.js detect [PATH]
 *   node scripts/project-metadata.js registration-json --slug S --git-url U [--server-url URL]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^([^a-z0-9])/, 'x$1');
}

function normalizeGitUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return '';

  const ssh = url.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (ssh) {
    url = `https://${ssh[1]}/${ssh[2]}`;
  }

  url = url.replace(/\/+$/, '');
  if (!url || !/^https?:\/\//i.test(url)) {
    return '';
  }
  if (!url.endsWith('.git')) {
    url += '.git';
  }
  return url;
}

function detectGitUrl(repoDir) {
  try {
    const raw = execSync('git remote get-url origin', {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const normalized = normalizeGitUrl(raw);
    if (!normalized) return { value: '', source: null };
    return { value: normalized, source: 'git remote origin' };
  } catch {
    return { value: '', source: null };
  }
}

function detectSlug(repoDir) {
  const pkgPath = path.join(repoDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) {
        const base = String(pkg.name).replace(/^@[^/]+\//, '');
        const candidate = slugify(base);
        if (SLUG_RE.test(candidate)) {
          return { value: candidate, source: 'package.json name' };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const fromDir = slugify(path.basename(repoDir));
  if (SLUG_RE.test(fromDir)) {
    return { value: fromDir, source: 'directory name' };
  }
  return { value: '', source: null };
}

function detect(repoDir) {
  const abs = path.resolve(repoDir);
  const slug = detectSlug(abs);
  const gitUrl = detectGitUrl(abs);

  return {
    slug: slug.value || null,
    gitUrl: gitUrl.value || null,
    serverUrl: null,
    sources: {
      slug: slug.source,
      gitUrl: gitUrl.source,
    },
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug') out.slug = argv[++i];
    else if (a === '--git-url') out.gitUrl = argv[++i];
    else if (a === '--server-url') out.serverUrl = argv[++i];
  }
  return out;
}

function registrationJson({ slug, gitUrl, serverUrl }) {
  const trimmedSlug = String(slug || '').trim();
  const trimmedGit = String(gitUrl || '').trim();
  const trimmedServer =
    serverUrl == null || String(serverUrl).trim() === ''
      ? null
      : String(serverUrl).trim();

  if (!SLUG_RE.test(trimmedSlug)) {
    console.error('[project-metadata] Invalid slug (lowercase letters, numbers, hyphens).');
    process.exit(1);
  }
  if (!trimmedGit) {
    console.error('[project-metadata] gitUrl is required.');
    process.exit(1);
  }

  return {
    slug: trimmedSlug,
    gitUrl: normalizeGitUrl(trimmedGit) || trimmedGit,
    ...(trimmedServer ? { serverUrl: trimmedServer } : {}),
  };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === 'detect') {
    const repoDir = rest[0] || process.cwd();
    process.stdout.write(`${JSON.stringify(detect(repoDir), null, 2)}\n`);
    return;
  }

  if (cmd === 'registration-json') {
    const args = parseArgs(rest);
    process.stdout.write(
      `${JSON.stringify(registrationJson(args), null, 2)}\n`,
    );
    return;
  }

  console.error('Usage: project-metadata.js detect [PATH]');
  console.error(
    '       project-metadata.js registration-json --slug S --git-url U [--server-url URL]',
  );
  process.exit(1);
}

main();

import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { getArtifactPaths } from './utils/get-artifact-paths.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Get artifact paths from package.json configuration
let version, projectRoot, distPath, setupExe, portableExe;
try {
  ({ version, projectRoot, distPath, setupExe, portableExe } = getArtifactPaths());
} catch (err) {
  error('Failed to load artifact paths: ' + (err?.message || String(err)));
  error('Make sure you are running this script from the project root and that package.json exists.');
  process.exit(1);
}

log('\n🔍 Validating release preparation...\n', 'blue');

let hasErrors = false;

// 1. Check version format (supports semantic versioning with pre-release and build metadata)
info(`Checking version: ${version}`);
// Semantic versioning regex: X.Y.Z[-prerelease][+build]
// Examples: 1.0.0, 1.0.0-beta.1, 1.0.0-alpha.1+20130313144700, 1.0.0+build.123
const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
if (!semverRegex.test(version)) {
  error(`Invalid version format: ${version}`);
  error('Expected semantic versioning format: X.Y.Z[-prerelease][+build]');
  error('Examples: 1.0.0, 1.0.0-beta.1, 1.0.0-alpha.1+20130313144700');
  hasErrors = true;
} else {
  success(`Version format is valid: ${version}`);

  // Provide helpful info about version type
  if (version.includes('-')) {
    const prereleaseInfo = version.split('-')[1].split('+')[0];
    info(`Pre-release version detected: ${prereleaseInfo}`);
    info('Remember to use --prerelease flag when creating the release');
  }
  if (version.includes('+')) {
    const buildInfo = version.split('+')[1];
    info(`Build metadata detected: ${buildInfo}`);
  }
}

// 2. Check git working directory
info('Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (gitStatus.trim()) {
    warning('Git working directory is not clean:');
    console.log(gitStatus);
    warning('Uncommitted changes will not be included in the release.');
  } else {
    success('Git working directory is clean');
  }
} catch (err) {
  error('Failed to check git status');
  hasErrors = true;
}

// 3. Check current branch
info('Checking git branch...');
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  if (branch === 'main' || branch.startsWith('release/')) {
    success(`On appropriate branch: ${branch}`);
  } else {
    warning(`Current branch is '${branch}'. Consider releasing from 'main' or a 'release/' branch.`);
  }
} catch (err) {
  error('Failed to check git branch');
  hasErrors = true;
}

// 4. Check build artifacts exist
info('Checking build artifacts...');

if (!fs.existsSync(distPath)) {
  error('Build directory does not exist: dist-electron/');
  error('Run: npm run build:win');
  hasErrors = true;
} else {
  success('Build directory exists');

  if (!fs.existsSync(setupExe)) {
    error(`Setup installer not found: ${setupExe}`);
    error('Run: npm run build:win');
    hasErrors = true;
  } else {
    const setupSize = fs.statSync(setupExe).size;
    const setupSizeMB = (setupSize / (1024 * 1024)).toFixed(2);
    success(`Setup installer found (${setupSizeMB} MB)`);

    if (setupSize < 1024 * 1024) {
      error(`Setup installer is suspiciously small: ${setupSizeMB} MB`);
      hasErrors = true;
    }
  }

  if (!fs.existsSync(portableExe)) {
    error(`Portable executable not found: ${portableExe}`);
    error('Run: npm run build:win');
    hasErrors = true;
  } else {
    const portableSize = fs.statSync(portableExe).size;
    const portableSizeMB = (portableSize / (1024 * 1024)).toFixed(2);
    success(`Portable executable found (${portableSizeMB} MB)`);

    if (portableSize < 1024 * 1024) {
      error(`Portable executable is suspiciously small: ${portableSizeMB} MB`);
      hasErrors = true;
    }
  }
}

// 5. Check if tag already exists
info(`Checking if tag v${version} exists...`);
try {
  const tags = execSync('git tag', { encoding: 'utf-8' });
  if (tags.includes(`v${version}`)) {
    error(`Tag v${version} already exists!`);
    error('Either bump version or delete the existing tag.');
    hasErrors = true;
  } else {
    success(`Tag v${version} does not exist yet`);
  }
} catch (err) {
  error('Failed to check git tags');
  hasErrors = true;
}

// 6. Check GitHub CLI
info('Checking GitHub CLI...');
try {
  const ghVersion = execSync('gh --version', { encoding: 'utf-8' });
  success(`GitHub CLI is installed: ${ghVersion.split('\n')[0]}`);

  // Check authentication
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    success('GitHub CLI is authenticated');
  } catch {
    error('GitHub CLI is not authenticated');
    error('Run: gh auth login');
    hasErrors = true;
  }
} catch (err) {
  error('GitHub CLI is not installed');
  error('Install from: https://cli.github.com/');
  hasErrors = true;
}

// 7. Summary
log('\n' + '─'.repeat(60), 'blue');
if (hasErrors) {
  error('\n❌ Validation failed! Fix the errors above before releasing.\n');
  process.exit(1);
} else {
  success('\n✅ All validation checks passed! Ready to release.\n');
  info(`Next steps:`);
  info(`  1. npm run release         (create release)`);
  info(`  2. npm run release:draft   (create draft release for testing)`);
  process.exit(0);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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

// Read package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

log('\n🔍 Validating release preparation...\n', 'blue');

let hasErrors = false;

// 1. Check version format
info(`Checking version: ${version}`);
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  error(`Invalid version format: ${version}. Expected format: X.Y.Z`);
  hasErrors = true;
} else {
  success(`Version format is valid: ${version}`);
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
const distPath = path.join(projectRoot, 'dist-electron');
const setupExe = path.join(distPath, `Openza-Setup-${version}.exe`);
const portableExe = path.join(distPath, 'Openza-Portable.exe');

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

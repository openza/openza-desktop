import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getArtifactPaths } from './utils/get-artifact-paths.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDraft = args.includes('--draft');
const isPrerelease = args.includes('--prerelease');
const skipValidation = args.includes('--skip-validation');

// Get artifact paths from package.json configuration
const { version, productName, projectRoot, setupExe, portableExe, setupExeFilename, portableExeFilename } = getArtifactPaths();
const releaseTag = `v${version}`;

log('\n🚀 Creating GitHub Release...\n', 'blue');

// Run validation unless skipped
if (!skipValidation) {
  info('Running pre-release validation...');
  try {
    execSync('node scripts/validate-release.js', { stdio: 'inherit', cwd: projectRoot });
  } catch (err) {
    error('\nValidation failed! Fix errors and try again.');
    error('Or use --skip-validation to bypass (not recommended).');
    process.exit(1);
  }
  log('');
}

// Generate release notes
info('Generating release notes from git history...');
let releaseNotes = '';
try {
  // Get the last tag
  let lastTag;
  try {
    lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
  } catch {
    // No previous tags, use initial commit
    lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
  }

  // Get commits since last tag
  const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`, {
    encoding: 'utf-8',
    cwd: projectRoot
  }).trim();

  if (commits) {
    releaseNotes = `## What's Changed\n\n${commits}\n\n`;
  }

  // Get contributor info (using email to map to GitHub usernames)
  const contributorEmails = execSync(`git log ${lastTag}..HEAD --pretty=format:"%ae"`, {
    encoding: 'utf-8',
    cwd: projectRoot
  }).trim().split('\n').filter((v, i, a) => a.indexOf(v) === i && v);

  if (contributorEmails.length > 0) {
    releaseNotes += `## Contributors\n\n`;

    // Load contributor mappings from config file
    let knownMappings = {};
    const contributorsConfigPath = path.join(projectRoot, '.github', 'contributors.json');
    try {
      if (fs.existsSync(contributorsConfigPath)) {
        const contributorsConfig = JSON.parse(fs.readFileSync(contributorsConfigPath, 'utf-8'));
        knownMappings = contributorsConfig.emailToGitHub || {};
      }
    } catch (err) {
      // If config file is missing or invalid, continue with empty mappings
      info(`Could not load contributor mappings: ${err?.message || String(err)}`);
    }

    // Map emails to GitHub usernames
    const githubUsernames = new Set();

    contributorEmails.forEach(email => {
      // TODO: Implement GitHub API email-to-username resolution
      // This would eliminate the need for manual mappings in .github/contributors.json
      //
      // Implementation approach:
      // 1. Use GitHub CLI to search for commits by email:
      //    gh api /search/commits?q=author-email:${email}+repo:${owner}/${repo} --jq '.items[0].author.login'
      //    Requires GitHub API Accept header: application/vnd.github.cloak-preview
      //
      // 2. Handle rate limiting (60 requests/hour for unauthenticated, 5000 for authenticated):
      //    - Cache results in .github/contributors.json after first lookup
      //    - Implement exponential backoff on 403 responses
      //    - Check X-RateLimit-Remaining header
      //
      // 3. Error handling:
      //    - If email not found in any commits, fall back to email prefix
      //    - If API fails, use cached mapping or email prefix
      //    - Log warnings for unmapped contributors
      //
      // 4. Privacy considerations:
      //    - Some users set email privacy settings (noreply@github.com)
      //    - GitHub API may not return private emails
      //    - Consider manual override in contributors.json for privacy-conscious users
      //
      // Example implementation:
      // try {
      //   const result = execSync(
      //     `gh api /search/commits -H "Accept: application/vnd.github.cloak-preview" ` +
      //     `-f q="author-email:${email} repo:openza/openza-desktop" --jq ".items[0].author.login"`,
      //     { encoding: 'utf-8', stdio: 'pipe' }
      //   ).trim();
      //   if (result) githubUsernames.add(result);
      // } catch (err) {
      //   // Fall back to manual mapping or email prefix
      // }

      if (knownMappings[email]) {
        githubUsernames.add(knownMappings[email]);
      } else {
        // Fallback: use email prefix for unknown contributors
        const emailPrefix = email.split('@')[0];
        githubUsernames.add(emailPrefix);
      }
    });

    githubUsernames.forEach(username => {
      releaseNotes += `- @${username}\n`;
    });
  }

  success('Generated release notes from git history');
} catch (err) {
  error('Failed to generate release notes from git history');
  releaseNotes = `Release ${releaseTag}`;
}

// Add download section
releaseNotes += `\n## Downloads\n\n`;
releaseNotes += `**Windows:**\n`;
releaseNotes += `- 🔧 **Installer**: \`${setupExeFilename}\` - Installs to Program Files, creates shortcuts\n`;
releaseNotes += `- 📦 **Portable**: \`${portableExeFilename}\` - No installation required, run from anywhere\n\n`;
releaseNotes += `**System Requirements:**\n`;
releaseNotes += `- Windows 10/11 (64-bit)\n`;
releaseNotes += `- ~100 MB disk space\n\n`;
releaseNotes += `**First Time Setup:**\n`;
releaseNotes += `1. Download either installer or portable version\n`;
releaseNotes += `2. Run the executable\n`;
releaseNotes += `3. Sign in with your Todoist or Microsoft To-Do account\n\n`;
releaseNotes += `> **Note**: Windows SmartScreen may show a warning for unsigned apps. Click "More info" → "Run anyway".`;

// Save release notes to file
const releaseNotesPath = path.join(projectRoot, 'RELEASE_NOTES.md');
fs.writeFileSync(releaseNotesPath, releaseNotes, 'utf-8');
info(`Release notes saved to: RELEASE_NOTES.md`);

// Create git tag (or use existing)
info(`Checking git tag: ${releaseTag}`);
let tagExists = false;
try {
  execSync(`git rev-parse ${releaseTag}`, { cwd: projectRoot, stdio: 'pipe' });
  tagExists = true;
  success(`Git tag ${releaseTag} already exists locally`);
} catch (err) {
  // Tag doesn't exist, create it
  info(`Creating git tag: ${releaseTag}`);
  try {
    execSync(`git tag -a ${releaseTag} -m "Release ${releaseTag}"`, { cwd: projectRoot });
    success(`Git tag created: ${releaseTag}`);
  } catch (err) {
    error(`Failed to create git tag`);
    process.exit(1);
  }
}

// Push tag to remote
info(`Pushing tag to remote: ${releaseTag}`);
try {
  execSync(`git push origin ${releaseTag}`, { cwd: projectRoot, stdio: 'inherit' });
  success(`Tag pushed to remote`);
} catch (err) {
  error(`Failed to push tag to remote`);
  error('Make sure you have permission to push to the repository');

  // Clean up local tag if we just created it and push failed
  if (!tagExists) {
    info('Cleaning up local tag...');
    try {
      execSync(`git tag -d ${releaseTag}`, { cwd: projectRoot });
      success('Local tag deleted');
    } catch (cleanupErr) {
      error(`Failed to delete local tag ${releaseTag}: ${cleanupErr?.message || String(cleanupErr)}`);
    }
  }
  process.exit(1);
}

// Build GitHub CLI command
let ghCommand = 'gh release create';
ghCommand += ` ${releaseTag}`;
ghCommand += ` "${setupExe}"`;
ghCommand += ` "${portableExe}"`;
ghCommand += ` --title "${productName} ${version}"`;
ghCommand += ` --notes-file "${releaseNotesPath}"`;

if (isDraft) {
  ghCommand += ' --draft';
  info('Creating as DRAFT release');
}

if (isPrerelease) {
  ghCommand += ' --prerelease';
  info('Creating as PRE-RELEASE');
}

// Create GitHub release
info('Creating GitHub release...');
log('');
try {
  const output = execSync(ghCommand, {
    encoding: 'utf-8',
    cwd: projectRoot,
    stdio: 'inherit'
  });

  log('');
  success(`✅ Release ${releaseTag} created successfully!`);
  log('');

  // Get release URL
  try {
    const releaseUrl = execSync(`gh release view ${releaseTag} --json url -q .url`, {
      encoding: 'utf-8',
      cwd: projectRoot
    }).trim();

    log('─'.repeat(60), 'blue');
    success(`\n🎉 Release published!\n`, 'green');
    info(`Version: ${version}`);
    info(`Tag: ${releaseTag}`);
    info(`URL: ${releaseUrl}`);
    log('');

    if (isDraft) {
      log('⚠️  This is a DRAFT release. Edit and publish it on GitHub.', 'yellow');
    } else {
      log('✓ Release is live and downloadable!', 'green');
    }
    log('');

    info('Next steps:');
    info('  1. Announce the release');
    info('  2. Update documentation if needed');
    if (isDraft) {
      info('  3. Review and publish the draft release on GitHub');
    }
    log('');
  } catch {
    // Could not get release URL, but release was created
  }
} catch (err) {
  error('\n❌ Failed to create GitHub release');
  error('Error details: ' + (err?.message || String(err)));

  // Clean up tag if release creation failed
  info('Cleaning up tag...');
  try {
    execSync(`git tag -d ${releaseTag}`, { cwd: projectRoot });
    success('Local tag deleted');
  } catch (cleanupErr) {
    error(`Failed to delete local tag ${releaseTag}: ${cleanupErr?.message || String(cleanupErr)}`);
    error('You may need to manually delete the tag with: git tag -d ' + releaseTag);
  }

  process.exit(1);
}

// Clean up release notes file
try {
  fs.unlinkSync(releaseNotesPath);
} catch {
  // Ignore errors
}

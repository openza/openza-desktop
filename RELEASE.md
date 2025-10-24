# Release Process for Openza

This document outlines the process for creating and publishing releases of Openza.

## Overview

Openza uses a **hybrid release approach**: builds are created locally (ensuring proper icon embedding with admin privileges), and releases are automatically uploaded to GitHub using scripts.

## Prerequisites

Before creating a release, ensure you have:

1. **Windows machine** with administrator privileges
2. **GitHub CLI** installed and authenticated:
   ```bash
   gh auth login
   ```
3. **Clean git working directory** (all changes committed)
4. **Node.js and npm** installed
5. **All dependencies installed**: `npm install`

## Release Workflow

### 1. Update Version

Choose the appropriate version bump based on [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.0 → 0.1.1): Bug fixes, small changes
  ```bash
  npm version patch
  ```

- **Minor** (0.1.0 → 0.2.0): New features, backwards compatible
  ```bash
  npm version minor
  ```

- **Major** (0.1.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  ```

This will:
- Update `package.json` version
- Create a git commit
- Create a git tag

### 2. Build the Application

**IMPORTANT**: Run this command as Administrator to ensure proper icon embedding:

```bash
# Right-click Command Prompt/Terminal → "Run as Administrator"
npm run build:win
```

This creates:
- `dist-electron/Openza-Desktop-Setup-X.Y.Z.exe` - NSIS installer
- `dist-electron/Openza-Desktop-Portable.exe` - Portable executable

**Verify the builds:**
- Check that both exe files exist
- Verify file sizes (should be ~95-100 MB each)
- Right-click each exe → Properties → Details to see icon
- Icons should show Openza lightning bolt (not Electron atom)

### 3. Validate Release

Before creating the release, run validation checks:

```bash
npm run release:check
```

This validates:
- ✓ Version format is correct
- ✓ Git working directory is clean
- ✓ On appropriate branch (main or release/*)
- ✓ Build artifacts exist and are valid size
- ✓ Git tag doesn't already exist
- ✓ GitHub CLI is installed and authenticated

### 4. Create Release

#### Option A: Create Production Release

```bash
npm run release
```

This will:
1. Run validation checks
2. Generate release notes from git commits
3. Create git tag
4. Create GitHub release
5. Upload both executables
6. Publish release immediately

#### Option B: Create Draft Release (Recommended for Testing)

```bash
npm run release:draft
```

Same as production, but creates a **draft release** that you can:
- Review before publishing
- Edit release notes
- Test download links
- Publish manually when ready

### 5. Push Changes

After successful release creation, push your changes:

```bash
git push origin main
git push origin v0.1.0  # Replace with your version
```

### 6. Verify Release

1. Go to: https://github.com/openza/openza-desktop/releases
2. Verify your release appears
3. Check that both download links work
4. Test downloading and installing/running

---

## Release Checklist

Use this checklist for each release:

**Pre-Release:**
- [ ] All features/fixes are merged to main branch
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (if you maintain one)
- [ ] Version number is bumped (`npm version X`)

**Build:**
- [ ] Built with administrator privileges: `npm run build:win`
- [ ] Both exe files exist in `dist-electron/`
- [ ] File sizes are reasonable (~95-100 MB each)
- [ ] Icons show Openza logo (not Electron atom)

**Release:**
- [ ] Validation passes: `npm run release:check`
- [ ] Release created: `npm run release` or `npm run release:draft`
- [ ] Changes pushed: `git push && git push --tags`
- [ ] Release is visible on GitHub
- [ ] Download links work
- [ ] Installation/execution works

**Post-Release:**
- [ ] Announce release (social media, Discord, etc.)
- [ ] Update project website if applicable
- [ ] Close completed milestone on GitHub
- [ ] Update project roadmap

---

## Troubleshooting

### Icon Shows Electron Logo Instead of Openza

**Cause**: Build was not run with administrator privileges.

**Fix**:
1. Delete `dist-electron/` folder
2. Run Command Prompt/Terminal as Administrator
3. Rebuild: `npm run build:win`
4. Verify icon in file explorer before releasing

### Release Validation Fails

**"Setup installer not found"**:
- Run: `npm run build:win` (as admin)

**"Git working directory is not clean"**:
- Commit or stash your changes
- Or use `npm run release -- --skip-validation` (not recommended)

**"Tag already exists"**:
- Check if you already released this version
- Bump version: `npm version patch`
- Or delete old tag: `git tag -d v0.1.0`

### GitHub CLI Authentication Error

**Cause**: GitHub CLI not authenticated.

**Fix**:
```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

### Release Creation Fails

If release creation fails partway:
1. Check GitHub to see if release was created (it may be partial)
2. Delete the git tag: `git tag -d vX.Y.Z`
3. Delete the GitHub release manually if it exists
4. Try again: `npm run release`

---

## Manual Release (Alternative Method)

If the automated scripts don't work, you can create releases manually:

### Using GitHub CLI:

```bash
# Create release with files
gh release create v0.1.0 \
  dist-electron/Openza-Desktop-Setup-0.1.0.exe \
  dist-electron/Openza-Desktop-Portable.exe \
  --title "Openza Desktop 0.1.0" \
  --generate-notes
```

### Using GitHub Web Interface:

1. Go to: https://github.com/openza/openza-desktop/releases/new
2. Choose tag: Create new tag `v0.1.0`
3. Fill in release title: `Openza Desktop 0.1.0`
4. Write release notes or click "Generate release notes"
5. Drag and drop both exe files:
   - `Openza-Desktop-Setup-0.1.0.exe`
   - `Openza-Desktop-Portable.exe`
6. Click "Publish release"

---

## Release Cadence Recommendations

- **Patch releases (bug fixes)**: As needed, typically weekly
- **Minor releases (features)**: Every 2-4 weeks
- **Major releases (breaking changes)**: Every few months

---

## Version Numbering Guide

Following [Semantic Versioning](https://semver.org/):

**Format**: `MAJOR.MINOR.PATCH`

Examples:
- `0.1.0` → `0.1.1`: Fixed taskbar icon bug
- `0.1.0` → `0.2.0`: Added Microsoft To-Do integration
- `0.9.0` → `1.0.0`: First stable release, API changes

---

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)
- [Keep a Changelog](https://keepachangelog.com/)

---

## Questions?

If you encounter issues with the release process:
1. Check this documentation
2. Review the troubleshooting section
3. Check existing GitHub Issues
4. Create a new issue with `[Release]` prefix

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Open Source Project Guidelines

**IMPORTANT**: This is an open source project licensed under MIT. All contributions must adhere to open source best practices and security standards.

### Security Considerations (CRITICAL)

**NEVER commit or push:**
- API keys, tokens, or credentials (check `.env.local`, hardcoded secrets)
- Personal access tokens or OAuth secrets
- Private keys, certificates, or encryption keys
- User data, email addresses, or personally identifiable information (PII)
- Proprietary third-party code or dependencies
- Database files with sensitive data (`*.db`, `*.sqlite`)
- Environment files (`.env`, `.env.local`, `.env.production`)

**Always verify before committing:**
- Search codebase for patterns: `VITE_.*SECRET`, `password`, `token`, `api_key`, `private_key`
- Check git diff for sensitive data: `git diff --cached`
- Ensure `.gitignore` includes: `.env*`, `*.db`, `*.sqlite`, `*.log`, `credentials.json`
- Review all changed files for accidental inclusions
- If secrets were committed, they must be rotated (changing them isn't enough - they're in git history)

### Pre-Commit Checklist

Before committing or pushing code, **ALWAYS verify**:

**Security & Privacy:**
- [ ] No API keys, secrets, or credentials in code
- [ ] No user data or PII included
- [ ] `.env.local` and sensitive files in `.gitignore`
- [ ] Dependencies are from trusted sources only

**Code Quality:**
- [ ] Code passes linting: `npm run lint`
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] No console.log statements in production code (use proper logging)
- [ ] No commented-out code blocks (remove or document why)
- [ ] Follow existing code style and patterns

**Testing & Functionality:**
- [ ] Code has been tested locally: `npm run dev:electron`
- [ ] New features work as expected
- [ ] No breaking changes to existing functionality
- [ ] Error handling implemented for new code

**Documentation:**
- [ ] Comments added for complex logic
- [ ] README.md updated if user-facing changes
- [ ] CLAUDE.md updated if architecture changes
- [ ] TypeScript types documented for new APIs

**Open Source Best Practices:**
- [ ] Code follows MIT license requirements
- [ ] No proprietary or copyrighted code included
- [ ] Attribution provided for third-party code snippets
- [ ] Dependencies added to package.json with proper licenses

### Commit Message Standards

Follow conventional commit format:
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature/bug change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

**Examples:**
```bash
feat: Add dark mode support to settings panel
fix: Resolve OAuth callback timeout on Windows
docs: Update README with new installation steps
refactor: Extract authentication logic to separate module
```

### Pull Request Guidelines

**Before creating a PR:**
- [ ] Branch name is descriptive: `feat/feature-name`, `fix/bug-name`
- [ ] All commits follow commit message standards
- [ ] Code is rebased on latest main branch
- [ ] All pre-commit checklist items verified
- [ ] PR description includes summary and test plan

**PR Description Template:**
```markdown
## Summary
- Brief description of changes
- Why these changes are needed

## Changes
- List of specific changes made
- Files affected and why

## Testing
- [ ] Tested in development mode
- [ ] Tested production build
- [ ] Tested on target platforms

## Screenshots (if UI changes)
[Add screenshots here]
```

### Dependency Management

**Before adding new dependencies:**
- [ ] Check npm package legitimacy and downloads
- [ ] Review package license (must be compatible with MIT)
- [ ] Check for known vulnerabilities: `npm audit`
- [ ] Verify package is actively maintained
- [ ] Consider bundle size impact
- [ ] Evaluate if really necessary (avoid dependency bloat)

**After adding dependencies:**
- [ ] Run `npm audit` and address critical/high vulnerabilities
- [ ] Update `package-lock.json` (commit it)
- [ ] Document why dependency was added (in PR or code comments)

## Development Commands

```bash
# Start Vite development server (web only)
npm run dev

# Start full Electron development environment (recommended)
npm run dev:electron

# Build for production
npm run build

# Build Electron application
npm run build:electron

# Platform-specific builds
npm run build:win     # Windows portable
npm run build:deb     # Linux Debian package

# Lint code
npm run lint

# Preview production build
npm run preview

# Start Electron with built app
npm start
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

**Todoist Integration:**
- `VITE_TODOIST_CLIENT_ID`: Todoist OAuth application client ID
- `VITE_TODOIST_CLIENT_SECRET`: Todoist OAuth application secret (main process only)
- `VITE_REDIRECT_URI`: OAuth callback URL (default: http://localhost:5173/auth/callback)

**Microsoft To-Do Integration:**
- `VITE_MSTODO_CLIENT_ID`: Azure AD application client ID
- `VITE_MSTODO_CLIENT_SECRET`: Azure AD application secret (main process only)
- `VITE_MSTODO_REDIRECT_URI`: OAuth callback URL for MS To-Do
- `VITE_MSTODO_TENANT_ID`: Azure AD tenant ID (default: 'common')

**OAuth Configuration:**
- `VITE_OAUTH_PROTOCOL_SCHEME`: Custom protocol for Electron OAuth (default: 'openza')
- `VITE_OAUTH_TIMEOUT_MINUTES`: OAuth flow timeout in minutes (default: 3)

## Architecture Overview

**Openza** is a React/TypeScript Electron desktop application that provides a unified interface for managing tasks from multiple sources (Todoist, Microsoft To-Do, and local database). Key architectural patterns:

### Multi-Provider Authentication System
- **Centralized Auth Manager**: `src/utils/auth.ts` manages authentication state across providers
- **Secure Token Storage**: Electron-based secure storage with encryption (not localStorage)
- **OAuth 2.0 Flows**: 
  - Todoist: Traditional OAuth with authorization code flow
  - Microsoft To-Do: MSAL integration with enhanced security via system browser
- **Route Guards**: Authentication protection for all dashboard routes
- **Token Management**: Automatic refresh, validation, and secure IPC communication

### Routing & State Management
- **TanStack Router** for type-safe hash-based routing (Electron-compatible)
- **TanStack Query** for server state management and API data caching
- **Task Source Context**: `src/contexts/TaskSourceContext.tsx` manages multi-provider data sources
- **Unified Task System**: `src/hooks/useUnifiedTasks.ts` combines tasks from all sources
- Authentication state managed via secure Electron storage

### Component Architecture
- **DashboardLayout**: Shared layout with responsive sidebar navigation and Projects section
- **TaskList**: Reusable component for rendering filtered task lists with TaskCard components
- **TaskCard**: Reusable component for individual task display with project badges
- **TaskDetail**: Modal/sidebar pattern for responsive task viewing with project and label information
- **ProjectBadge**: Reusable component for displaying project information with colors and icons
- **LabelBadge**: Reusable component for displaying Todoist labels with colors and styling
- **Projects**: Collapsible sidebar component showing project hierarchy with filtering
- **Route-based components**: Dashboard, Next Action, Tasks, Today, Overdue views (all using TaskList)

### API Integration & Data Management
- **Todoist Client**: `src/utils/todoistClient.ts` with pagination and error handling
- **Microsoft To-Do Client**: `src/utils/msToDoClient.ts` with Graph API integration
- **Local Database**: SQLite with better-sqlite3, includes migrations and FTS5 search
- **Unified Data Layer**: Combines multiple task sources with consistent interfaces
- **Secure IPC**: All sensitive API operations handled in Electron main process
- Type-safe responses using official SDKs and custom TypeScript interfaces

### Styling System
- **Tailwind CSS 4.x** with modern features (OKLCH colors, CSS custom properties)
- **Shadcn/ui** component system for consistent UI primitives
- Responsive design with mobile-first approach

## Key Files & Architecture

**Core Architecture:**
- `src/App.tsx`: Router configuration with authentication guards
- `src/contexts/TaskSourceContext.tsx`: Multi-provider data source management
- `src/hooks/useUnifiedTasks.ts`: Unified task data aggregation
- `src/utils/auth.ts`: Centralized authentication manager
- `src/utils/config.ts`: Secure configuration management with IPC

**API & Data Layer:**
- `src/utils/todoistClient.ts`: Todoist API client with pagination
- `src/utils/msToDoClient.ts`: Microsoft To-Do Graph API client
- `src/utils/msToDoAuth.ts`: MSAL authentication manager
- `src/utils/tokenManager.ts`: Secure token storage and refresh
- `electron/modules/database.js`: SQLite database with migrations

**UI Components:**
- `src/components/DashboardLayout.tsx`: Main layout with responsive navigation
- `src/components/TaskList.tsx`: Unified task rendering with multi-provider support
- `src/components/TaskCard.tsx`: Individual task display with provider badges
- `src/components/Projects.tsx`: Collapsible project hierarchy

**Electron Integration:**
- `electron/main.js`: Main process with secure environment handling
- `electron/modules/msal.js`: MSAL IPC handlers for secure authentication
- `electron/modules/storage.js`: Secure storage for sensitive data
- `src/types/electron.ts`: TypeScript definitions for IPC APIs

## Development Notes

**Security Architecture:**
- Client secrets and sensitive operations handled in main process only
- Renderer process receives only safe configuration values
- All OAuth flows use system browser for enhanced security
- Strict CSP and context isolation enabled

**Code Signing and Auto-Updates:**
- `verifyUpdateCodeSignature: false` - Auto-update signature verification disabled
- `publish: null` - Auto-updates not implemented (manual downloads from GitHub)
- **Current Risk**: None (no auto-update mechanism exists)
- **Future**: When implementing auto-updates, obtain code signing certificate and enable verification
- See "Code Signing and Auto-Updates" section below for details

**Multi-Provider Integration:**
- Task data normalized across providers for consistent UI
- Each provider has dedicated authentication and API management
- Local database serves as fallback and offline storage
- Provider-specific features preserved (projects, labels, priorities)

**Electron-Specific Considerations:**
- Hash-based routing for proper Electron navigation
- Custom protocol handling for OAuth callbacks
- IPC communication for all sensitive operations
- Platform-specific build targets (Windows portable, Linux DEB)

**Key Development Patterns:**
- Always use `TaskSourceContext` for data source management
- Prefer existing reusable components over creating new ones
- Follow established authentication patterns for new providers
- Maintain type safety with comprehensive TypeScript interfaces
- Use secure IPC for any main process communication

## Code Signing and Auto-Updates

### Current Status
**Code signing is NOT implemented.** Releases are unsigned.

### Configuration
```json
{
  "verifyUpdateCodeSignature": false,
  "publish": null
}
```

### Security Implications

**Current Risk Level: None**
- Auto-updates are not implemented in the application
- Users download manually from GitHub Releases
- `verifyUpdateCodeSignature` setting has no effect without auto-updater

**Why This Is Safe Now:**
1. No electron-updater or auto-update mechanism exists
2. Users must manually download from trusted GitHub source
3. GitHub provides release integrity (commit SHA, author verification)
4. Users can review release notes before downloading

**Future Considerations:**
If/when implementing auto-updates:

⚠️ **CRITICAL**: Enable code signing BEFORE implementing auto-updates

**Steps to Implement Auto-Updates Securely:**
1. **Purchase code signing certificate** (~$300-500/year)
   - DigiCert, Sectigo, or similar trusted CA
   - Extended Validation (EV) recommended for Windows SmartScreen

2. **Configure package.json:**
   ```json
   {
     "win": {
       "certificateFile": "path/to/cert.pfx",
       "certificatePassword": "env:CERT_PASSWORD",
       "verifyUpdateCodeSignature": true
     },
     "publish": {
       "provider": "github",
       "owner": "openza",
       "repo": "openza-desktop"
     }
   }
   ```

3. **Implement electron-updater:**
   - Install: `npm install electron-updater`
   - Add update checks in main process
   - Handle update downloads and installation
   - Provide UI feedback to users

4. **CI/CD Integration:**
   - Store certificate and password in GitHub Secrets
   - Sign releases in GitHub Actions workflow
   - Only sign releases from `main` branch

5. **Testing:**
   - Test update flow thoroughly
   - Verify signature validation works
   - Test rollback scenarios
   - Document update process for users

**Alternative Approaches:**
- **GitHub Actions + Secrets**: Automate signing in CI/CD
- **Hardware Security Module (HSM)**: For enterprise-grade security
- **GPG Signatures**: Alternative to code signing (Linux-friendly)
- **Checksums/Hashes**: Provide SHA256 in release notes

**Documentation for Users:**
- Explain why unsigned (cost, open source project)
- Provide manual verification steps (checksums)
- Link to GitHub Releases for transparency
- Document how to verify release authenticity

## Claude Code Configuration

The project has a `.claude/settings.json` file that configures Claude Code behavior, including disabling attribution in commits and pull requests.

**When using Claude Code, ALWAYS:**
- Follow the "Open Source Project Guidelines" section above
- Run security checks before committing (search for secrets, check `.gitignore`)
- Verify pre-commit checklist items before creating commits
- Use conventional commit message format
- Test code locally before pushing
- Never commit sensitive data, API keys, or credentials
- Ensure all dependencies are properly licensed and documented
- Follow the PR guidelines when creating pull requests

**Security Reminder for Claude Code:**
Before any `git add`, `git commit`, or `git push` operations, Claude Code must verify:
1. No secrets or credentials in staged files
2. All security checklist items above are satisfied
3. Code quality standards are met
4. Dependencies are properly audited

This is an open source project - once code is pushed, it's public forever. Security and quality are paramount.
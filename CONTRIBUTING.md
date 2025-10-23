# Contributing to Openza

Thank you for your interest in contributing to Openza! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check the [existing issues](https://github.com/openza/openza-desktop/issues) to avoid duplicates
2. Gather information about the bug (OS, version, steps to reproduce)

When creating a bug report, include:
- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Openza version, Node version)
- **Error messages** or console logs

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature has already been requested
2. Provide a clear use case for the feature
3. Explain how it would benefit users
4. Consider implementation complexity

### Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Follow the coding standards** (see below)
3. **Write tests** if applicable
4. **Update documentation** for new features
5. **Test thoroughly** on your platform
6. **Create a pull request** with a clear description

#### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `security/description` - Security improvements

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openza-desktop.git
   cd openza-desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your API credentials in `.env.local` (see README.md)

5. Start development:
   ```bash
   npm run dev:electron
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow the ESLint configuration
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

### Component Guidelines

- **Prefer existing components**: Check if a component exists before creating a new one
- **Reusability**: Design components to be reusable
- **Props**: Use TypeScript interfaces for prop types
- **Hooks**: Extract complex logic into custom hooks

### Security

- **Never commit secrets**: Keep credentials in `.env.local` only
- **IPC patterns**: Sensitive operations must use main process IPC handlers
- **Token handling**: Use TokenManager for all authentication tokens
- **Input validation**: Validate and sanitize user inputs
- **Dependencies**: Keep dependencies updated

### Git Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security improvements

**Examples:**
```
feat(tasks): add support for task recurrence

fix(auth): resolve token refresh race condition

docs(readme): update installation instructions
```

## Project Structure

```
openza/
├── electron/              # Electron main process
│   ├── main.js           # Application entry point
│   ├── preload.js        # Preload script for IPC
│   └── modules/          # Modular IPC handlers
│       ├── msal.js       # Microsoft authentication
│       ├── oauth.js      # OAuth flow handling
│       ├── protocol.js   # Custom protocol registration
│       └── storage.js    # Secure storage
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (shadcn)
│   │   └── auth/        # Authentication components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   │   ├── auth.ts      # Centralized auth manager
│   │   ├── todoistClient.ts   # Todoist API client
│   │   ├── msToDoClient.ts    # Microsoft To-Do client
│   │   └── tokenManager.ts    # Token management
│   └── main/            # Database management
│       └── database/    # SQLite database
└── public/              # Static assets
```

## Key Development Patterns

### Authentication

- Use `AuthManager` from `src/utils/auth.ts` for authentication state
- Use `TokenManager` for secure token storage and refresh
- Provider-specific auth:
  - Todoist: Traditional OAuth 2.0
  - Microsoft: MSAL with system browser

### Task Management

- Use `TaskSourceContext` for global task source selection
- Use `useUnifiedTasks` hook for combined task data
- Normalize task data across providers for consistent UI

### IPC Communication

All sensitive operations must use IPC:

```typescript
// Main process handler (electron/modules/example.js)
ipcMain.handle('example:sensitive-operation', async (event, data) => {
  // Validate input
  // Perform operation with secrets from process.env
  // Return sanitized result
});

// Renderer process (src/utils/example.ts)
const result = await window.electron.ipc.invoke('example:sensitive-operation', data);
```

## Testing

### Manual Testing Checklist

Before submitting a PR:
- [ ] Test on your platform (Windows/Linux)
- [ ] Test authentication flows for all providers
- [ ] Test task synchronization
- [ ] Check for console errors
- [ ] Verify no sensitive data in logs
- [ ] Test offline functionality
- [ ] Test build process

### Build Testing

```bash
# Build and test locally
npm run build:electron

# Platform-specific
npm run build:win    # Windows
npm run build:deb    # Linux
```

## Documentation

Update documentation for:
- New features or APIs
- Configuration changes
- Breaking changes
- Security considerations

## Security Vulnerabilities

**Do not create public issues for security vulnerabilities.**

Instead, email security concerns to: deependra@solanky.dev

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Questions?

- Open a [GitHub Discussion](https://github.com/openza/openza-desktop/discussions)
- Email: deependra@solanky.dev

## License

By contributing to Openza, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Openza! 🎯

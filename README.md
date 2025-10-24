# Openza

A modern, beautiful desktop client for managing tasks from multiple sources including Todoist and Microsoft To-Do. Built with React, TypeScript, and Electron for a native desktop experience.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)
![GitHub Release](https://img.shields.io/github/v/release/openza/openza-desktop)
![Downloads](https://img.shields.io/github/downloads/openza/openza-desktop/total)

## Download

### Latest Release

**Windows:**
- 🔧 [**Installer**](https://github.com/openza/openza-desktop/releases/latest) - Download `Openza-Desktop-Setup-{version}.exe` - Installs to Program Files, creates shortcuts
- 📦 [**Portable**](https://github.com/openza/openza-desktop/releases/latest) - Download `Openza-Desktop-Portable.exe` - No installation required, run from anywhere

**System Requirements:**
- Windows 10/11 (64-bit)
- ~100 MB disk space

> **Note**: Windows SmartScreen may show a warning for unsigned apps. Click "More info" → "Run anyway". This is normal for open-source applications that aren't code-signed with an expensive certificate.

[**View All Releases**](https://github.com/openza/openza-desktop/releases) | [**Release Notes**](https://github.com/openza/openza-desktop/releases/latest)

## Features

- 🎯 **Multi-Provider Support**: Manage tasks from Todoist, Microsoft To-Do, and local database
- 🔐 **Secure Authentication**: OAuth 2.0 integration with secure token storage
- 📱 **Modern UI**: Clean, responsive interface with dark mode support
- 🚀 **Native Performance**: Built with Electron for a true desktop experience
- 🔄 **Real-time Sync**: Automatic synchronization with your task providers
- 📊 **Unified Dashboard**: See all your tasks in one place with smart filtering
- 🏷️ **Project & Labels**: Full support for projects, labels, and task organization
- ⚡ **Next Actions**: Smart filtering for actionable tasks across all providers
- 🌐 **Offline Support**: Local database for offline task management

## Screenshots

<!-- Add screenshots here -->

## Installation

See the [Download](#download) section above for pre-built binaries.

### Build from Source

#### Prerequisites

- Node.js 18+ and npm
- Git

#### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/openza/openza-desktop.git
   cd openza-desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your API credentials in `.env.local`:

   **For Todoist:**
   - Go to https://developer.todoist.com/appconsole.html
   - Create a new app
   - Copy the Client ID and Client Secret
   - Set redirect URI to `http://localhost:5173/auth/callback` (dev) or `openza://auth/callback` (production)

   **For Microsoft To-Do:**
   - Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
   - Register a new application
   - Add redirect URI: `http://localhost:3000/auth/mstodo/callback` (dev) or custom protocol
   - Copy the Application (client) ID and create a client secret
   - Enable "Accounts in any organizational directory and personal Microsoft accounts"

   Update `.env.local`:
   ```env
   # Todoist Configuration
   VITE_TODOIST_CLIENT_ID=your_todoist_client_id
   VITE_TODOIST_CLIENT_SECRET=your_todoist_client_secret
   VITE_REDIRECT_URI=http://localhost:5173/auth/callback

   # Microsoft To-Do Configuration
   VITE_MSTODO_CLIENT_ID=your_microsoft_app_client_id
   VITE_MSTODO_CLIENT_SECRET=your_microsoft_app_client_secret
   VITE_MSTODO_REDIRECT_URI=http://localhost:3000/auth/mstodo/callback
   VITE_MSTODO_TENANT_ID=common

   # OAuth Protocol Configuration
   VITE_OAUTH_PROTOCOL_SCHEME=openza
   VITE_OAUTH_TIMEOUT_MINUTES=3
   ```

## Development

### Start Development Server

```bash
# Web-only development (Vite dev server)
npm run dev

# Full Electron development environment (recommended)
npm run dev:electron
```

### Build for Production

```bash
# Build web assets
npm run build

# Build for current platform
npm run build:electron

# Platform-specific builds
npm run build:win        # Windows (NSIS installer + portable)
npm run build:deb        # Linux Debian package
npm run build:appimage   # Linux AppImage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Routing**: TanStack Router (hash-based for Electron compatibility)
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn/ui, Radix UI
- **Styling**: Tailwind CSS 4.x with OKLCH colors
- **Desktop**: Electron 36
- **Database**: SQLite with better-sqlite3 (FTS5 search)
- **Authentication**: OAuth 2.0, MSAL for Microsoft
- **APIs**:
  - Todoist API via @doist/todoist-api-typescript
  - Microsoft Graph API for To-Do

## Project Structure

```
openza/
├── electron/           # Electron main process
│   ├── main.js        # Main entry point
│   └── modules/       # IPC handlers (auth, storage, database)
├── src/
│   ├── components/    # React components
│   ├── contexts/      # React contexts (TaskSourceContext)
│   ├── hooks/         # Custom hooks (useUnifiedTasks, etc.)
│   ├── utils/         # Utilities (API clients, auth, config)
│   └── main/          # Database management
├── public/            # Static assets
└── .env.example       # Environment variables template
```

## Security

- **No Hardcoded Secrets**: All sensitive credentials must be in `.env.local` (never committed)
- **Secure Token Storage**: Electron-based encrypted storage (not localStorage)
- **IPC Security**: All sensitive operations handled in main process only
- **CSP & Sandboxing**: Strict Content Security Policy and context isolation
- **OAuth 2.0**: Industry-standard authentication flows

### Security Best Practices

- Never commit `.env.local` or any file containing secrets
- Client secrets are only accessible in Electron main process
- Renderer process receives only safe configuration values
- All OAuth flows use system browser for enhanced security

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Guidelines

- Follow the existing code style (ESLint configuration)
- Use TypeScript for type safety
- Test authentication flows for all providers
- Maintain secure IPC patterns for sensitive operations
- Update documentation for new features

## Roadmap

- [x] Multi-provider task management
- [x] Secure OAuth authentication
- [x] Unified task dashboard
- [x] Project and label support
- [x] Offline support with local database
- [x] Windows distribution
- [ ] macOS support
- [ ] Task creation and editing
- [ ] Desktop notifications
- [ ] Keyboard shortcuts
- [ ] Task search and filtering
- [ ] Custom themes
- [ ] Task templates
- [ ] Batch operations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Todoist](https://todoist.com) for their excellent API
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/) for To-Do integration
- [Electron](https://www.electronjs.org/) for desktop capabilities
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful UI components

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/openza/openza-desktop/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/openza/openza-desktop/issues)
- 📧 **Email**: deependra@solanky.dev

## Author

**Deependra Solanky**
- GitHub: [@solankydev](https://github.com/solankydev)
- Email: deependra@solanky.dev

---

Made with ❤️ by Deependra Solanky

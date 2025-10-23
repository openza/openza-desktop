# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Claude Code Configuration

The project has a `.claude/settings.json` file that configures Claude Code behavior, including disabling attribution in commits and pull requests.
import { app, BrowserWindow, protocol, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { initializeDatabaseHandlers, closeDatabaseHandlers } from '../src/main/ipc/database-handlers.js';
import { registerCustomProtocol, handleProtocolUrl } from './modules/protocol.js';
import { setupOAuthHandlers, handleOAuthCallback } from './modules/oauth.js';
import { setupStorageHandlers } from './modules/storage.js';
import { setupMsalHandlers } from './modules/msal.js';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env.local file for development
config({ path: path.join(projectRoot, '.env.local') });

// Environment variable validation utility
const getRequiredEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        return null;
    }
    return value;
};

// Validate and load required environment variables
const MSTODO_CLIENT_ID = getRequiredEnv('VITE_MSTODO_CLIENT_ID');
const MSTODO_REDIRECT_URI = getRequiredEnv('VITE_MSTODO_REDIRECT_URI');
const MSTODO_TENANT_ID = getRequiredEnv('VITE_MSTODO_TENANT_ID') || 'common'; // Tenant ID can default to 'common'

// Critical environment variable validation - fail fast if missing
const missingVars = [];
if (!MSTODO_CLIENT_ID) missingVars.push('VITE_MSTODO_CLIENT_ID');
if (!MSTODO_REDIRECT_URI) missingVars.push('VITE_MSTODO_REDIRECT_URI');

if (missingVars.length > 0) {
    console.error(`Critical environment variables missing: ${missingVars.join(', ')}`);
    console.error('The application cannot start without proper Microsoft To-Do configuration.');
    console.error('Please check your .env.local file or environment configuration.');
    
    // In production, exit immediately
    if (process.env.NODE_ENV === 'production') {
        app.quit();
        process.exit(1);
    } else {
        // In development, warn but continue (allows for configuration setup)
        console.warn('Development mode: Continuing with missing configuration - Microsoft To-Do features will be unavailable');
    }
}

// Debug: Check if environment variables are loaded
console.log('Main process environment check:', {
  clientId: MSTODO_CLIENT_ID ? '✓ Loaded' : '✗ Missing',
  redirectUri: MSTODO_REDIRECT_URI ? '✓ Loaded' : '✗ Missing',
  tenantId: MSTODO_TENANT_ID ? '✓ Loaded' : '✗ Missing'
});

let mainWindow;

// Register the protocol with security enhancements
const protocolRegistered = registerCustomProtocol();

// Handle protocol URLs (OAuth callbacks) with security validation
app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url, (validatedUrl) => handleOAuthCallback(validatedUrl, mainWindow, createWindow));
});

// Handle OAuth callback (for Windows/Linux - when protocol opens second instance)
app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected, command line:', commandLine);
    
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
    
    // Check for OAuth callback in command line arguments with validation
    const clientId = MSTODO_CLIENT_ID;
    const msalProtocol = clientId ? `msal${clientId}://` : null;
    
    const url = commandLine.find(arg => 
        arg.startsWith('openza://') || (msalProtocol && arg.startsWith(msalProtocol))
    );
    if (url) {
        console.log('Found protocol URL in command line:', url);
        handleProtocolUrl(url, (validatedUrl) => handleOAuthCallback(validatedUrl, mainWindow, createWindow));
    } else {
        // Sometimes the URL might be passed differently
        const lastArg = commandLine[commandLine.length - 1];
        if (lastArg && (lastArg.startsWith('openza://') || (msalProtocol && lastArg.startsWith(msalProtocol)))) {
            console.log('Found protocol URL as last argument:', lastArg);
            handleProtocolUrl(lastArg, (validatedUrl) => handleOAuthCallback(validatedUrl, mainWindow, createWindow));
        }
    }
});

// OAuth callback handling is now in the oauth module

// Register protocol handlers for production only
if (process.env.NODE_ENV !== 'development') {
    app.whenReady().then(() => {
        // Handle http://localhost requests in production
        protocol.registerHttpProtocol('http', (request, callback) => {
            const url = new URL(request.url);
            console.log('Intercepted URL:', request.url);
            
            if (url.hostname === 'localhost' && url.pathname === '/') {
                // In production, load the built file
                const indexPath = path.join(process.resourcesPath, 'dist/index.html');
                console.log('Loading index from:', indexPath);
                mainWindow.loadFile(indexPath).catch(err => {
                    console.error('Failed to load index.html:', err);
                    // Try alternative path
                    const altPath = path.join(__dirname, '../dist/index.html');
                    console.log('Trying alternative path:', altPath);
                    mainWindow.loadFile(altPath).catch(err2 => {
                        console.error('Failed to load from alternative path:', err2);
                    });
                });
                return;
            }
            callback({ url: request.url });
        });
    });
}

function createWindow () {
    // Remove the application menu (like Todoist, Obsidian, etc.)
    Menu.setApplicationMenu(null);

    // Determine the correct icon path based on platform and environment
    let iconPath;
    if (process.platform === 'win32') {
        // Windows: Use .ico file for proper taskbar/system tray display
        iconPath = process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '../public/icon.ico')
            : path.join(process.resourcesPath, 'icon.ico');
    } else {
        // macOS/Linux: Use .png file
        iconPath = process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '../public/icon.png')
            : path.join(process.resourcesPath, 'icon.png');
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        frame: true, // Keep window frame for native controls (minimize, maximize, close)
        autoHideMenuBar: true, // Hide menu bar
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        }
    });

    // In development, load from dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built file
        const indexPath = path.join(process.resourcesPath, 'dist/index.html');
        console.log('Loading index from:', indexPath);
        mainWindow.loadFile(indexPath).catch(err => {
            console.error('Failed to load index.html:', err);
            // Try alternative path
            const altPath = path.join(__dirname, '../dist/index.html');
            console.log('Trying alternative path:', altPath);
            mainWindow.loadFile(altPath).catch(err2 => {
                console.error('Failed to load from alternative path:', err2);
            });
        });
    }

    // Log any errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    // Maximize window and show after ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });
}

// OAuth handlers are now in the oauth module

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        // Initialize all handlers
        initializeDatabaseHandlers();
        setupStorageHandlers();
        setupMsalHandlers();
        createWindow();
        
        // Setup OAuth handlers after window is created
        setTimeout(() => {
            setupOAuthHandlers(mainWindow);
        }, 100);
        
        // Check for protocol URL in initial command line arguments
        const protocolUrl = process.argv.find(arg => arg.startsWith('openza://'));
        if (protocolUrl) {
            console.log('Found protocol URL in startup arguments:', protocolUrl);
            // Wait a moment for the window to be ready, then handle the callback
            setTimeout(() => {
                handleProtocolUrl(protocolUrl, (validatedUrl) => handleOAuthCallback(validatedUrl, mainWindow, createWindow));
            }, 2000);
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Close database connections before quitting
        closeDatabaseHandlers();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
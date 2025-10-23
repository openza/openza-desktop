import { BrowserWindow, ipcMain, shell } from 'electron';

// Secure OAuth domain validation - strict domain matching only
const ALLOWED_OAUTH_DOMAINS = [
    'login.microsoftonline.com'
    // Removed login.live.com to prevent subdomain attacks
    // Only using official Microsoft tenant login endpoint
];

const ALLOWED_EXTERNAL_DOMAINS = [
    'login.microsoftonline.com',
    'graph.microsoft.com',
    'portal.azure.com',
    'todoist.com'
    // Removed wildcards and broad patterns
];

// Valid OAuth endpoints for additional security
const ALLOWED_OAUTH_PATHS = [
    '/oauth2/v2.0/authorize',
    '/common/oauth2/v2.0/authorize',
    '/organizations/oauth2/v2.0/authorize'
];

// Validate OAuth URL with strict domain and path checking
const validateOAuthUrl = (url) => {
    const parsedUrl = new URL(url); // Let URL constructor throw for invalid URLs
    
    // Only allow https protocol for OAuth
    if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Only HTTPS allowed for OAuth, got: ${parsedUrl.protocol}`);
    }
    
    // Strict domain matching - no subdomains
    if (!ALLOWED_OAUTH_DOMAINS.includes(parsedUrl.hostname)) {
        throw new Error(`Domain not allowed for OAuth: ${parsedUrl.hostname}`);
    }
    
    // Validate OAuth endpoint path
    if (!ALLOWED_OAUTH_PATHS.includes(parsedUrl.pathname)) {
        throw new Error(`Invalid OAuth endpoint path: ${parsedUrl.pathname}`);
    }
    
    return true;
};

// Validate external URL for shell.openExternal
const validateExternalUrl = (url) => {
    const parsedUrl = new URL(url); // Let URL constructor throw for invalid URLs
    
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }
    
    // Strict domain matching - no subdomains
    if (!ALLOWED_EXTERNAL_DOMAINS.includes(parsedUrl.hostname)) {
        throw new Error(`Domain not allowed: ${parsedUrl.hostname}`);
    }
    
    return true;
};

// OAuth window management with enhanced security
export const setupOAuthHandlers = (mainWindow) => {
    // OAuth window management for development
    ipcMain.handle('oauth-window-open', async (_event, oauthUrl) => {
        try {
            // Validate URL before proceeding - will throw if invalid
            validateOAuthUrl(oauthUrl);
            
            return new Promise((resolve, reject) => {
                // Create OAuth window with enhanced security
                const oauthWindow = new BrowserWindow({
                    width: 800,
                    height: 600,
                    show: false,
                    parent: mainWindow,
                    modal: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        webSecurity: true,
                        allowRunningInsecureContent: false,
                        experimentalFeatures: false
                    }
                });
                
                // Enhanced resource management with AbortController
                const abortController = new AbortController();
                const { signal } = abortController;
                
                let isCleanedUp = false;
                const cleanup = () => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;
                    
                    // Abort any ongoing operations
                    abortController.abort();
                    
                    // Clear timeout
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    
                    // Remove all event listeners
                    if (!oauthWindow.isDestroyed()) {
                        oauthWindow.removeAllListeners();
                        oauthWindow.webContents.removeAllListeners();
                        oauthWindow.close();
                    }
                };
                
                // OAuth timeout constants for better UX
                const OAUTH_TIMEOUT_MINUTES = 3;
                const OAUTH_TIMEOUT_MS = OAUTH_TIMEOUT_MINUTES * 60 * 1000;
                
                // Timeout for OAuth flow with proper cleanup
                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error(`OAuth flow timed out after ${OAUTH_TIMEOUT_MINUTES} minutes`));
                }, OAUTH_TIMEOUT_MS);
                
                // Handle abort signal
                signal.addEventListener('abort', () => {
                    cleanup();
                    reject(new Error('OAuth flow was aborted'));
                });
                
                // Handle window ready
                oauthWindow.once('ready-to-show', () => {
                    oauthWindow.show();
                });
                
                // Enhanced OAuth callback handling with security validation
                const handleOAuthCallback = (navigationUrl) => {
                    console.log('Checking OAuth callback URL:', navigationUrl);
                    
                    try {
                        const callbackUrl = new URL(navigationUrl);
                        
                        // Validate callback URL is from allowed domain or localhost
                        const isValidCallback = 
                            callbackUrl.hostname === 'localhost' ||
                            ALLOWED_OAUTH_DOMAINS.includes(callbackUrl.hostname);
                        
                        if (!isValidCallback) {
                            console.warn('Invalid callback domain:', callbackUrl.hostname);
                            return false;
                        }
                        
                        // Check if this is our callback URL
                        if (navigationUrl.includes('/auth/mstodo/callback') || 
                            (navigationUrl.includes('localhost:5173') && navigationUrl.includes('access_token='))) {
                            
                            console.log('OAuth callback detected, processing...');
                            
                            // Check for implicit flow (token in fragment)
                            if (callbackUrl.hash) {
                                const fragment = callbackUrl.hash.substring(1);
                                const params = new URLSearchParams(fragment);
                                const accessToken = params.get('access_token');
                                const error = params.get('error');
                                const state = params.get('state');
                                
                                console.log('OAuth implicit flow callback captured:', { 
                                    hasToken: !!accessToken, 
                                    error: error || 'none', 
                                    state: state || 'none'
                                });
                                
                                cleanup();
                                
                                if (error) {
                                    reject(new Error(`OAuth failed: ${error}`));
                                } else if (accessToken) {
                                    resolve({ accessToken, state, error: null });
                                } else {
                                    reject(new Error('No access token received'));
                                }
                                return true;
                            } else {
                                // Check for authorization code flow
                                const code = callbackUrl.searchParams.get('code');
                                const error = callbackUrl.searchParams.get('error');
                                const state = callbackUrl.searchParams.get('state');
                                
                                console.log('OAuth code flow callback captured:', { 
                                    hasCode: !!code, 
                                    error: error || 'none', 
                                    state: state || 'none' 
                                });
                                
                                cleanup();
                                
                                if (error) {
                                    reject(new Error(`OAuth failed: ${error}`));
                                } else if (code) {
                                    resolve({ code, state, error: null });
                                } else {
                                    reject(new Error('No authorization code received'));
                                }
                                return true;
                            }
                        }
                    } catch (err) {
                        if (err.name === 'TypeError' && err.message.includes('Invalid URL')) {
                            console.error('Invalid callback URL format:', navigationUrl);
                        } else {
                            console.error('Unexpected error parsing callback URL:', err);
                        }
                        cleanup();
                        reject(new Error(`OAuth callback parsing failed: ${err.message}`));
                        return true;
                    }
                    
                    return false;
                };

                // Navigation event handlers
                oauthWindow.webContents.on('will-navigate', (event, navigationUrl) => {
                    console.log('OAuth window will-navigate to:', navigationUrl);
                    
                    if (handleOAuthCallback(navigationUrl)) {
                        event.preventDefault();
                    }
                });

                oauthWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
                    console.log('OAuth window did-navigate to:', navigationUrl);
                    handleOAuthCallback(navigationUrl);
                });
                
                // Handle window closed by user
                oauthWindow.on('closed', () => {
                    cleanup();
                    reject(new Error('OAuth window was closed by user'));
                });
                
                // Handle load failures
                oauthWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
                    console.error('OAuth window failed to load:', errorCode, errorDescription);
                    cleanup();
                    reject(new Error(`Failed to load OAuth page: ${errorDescription}`));
                });
                
                // Load the OAuth URL
                oauthWindow.loadURL(oauthUrl).catch(err => {
                    console.error('Failed to load OAuth URL:', err);
                    cleanup();
                    reject(err);
                });
            });
            
        } catch (error) {
            console.error('Failed to open OAuth window:', error);
            throw error;
        }
    });

    // Shell API handlers for secure external URL opening
    ipcMain.handle('shell-open-external', async (_event, url) => {
        try {
            // Validate URL before opening - will throw if invalid
            validateExternalUrl(url);
            
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Failed to open external URL:', error);
            return { success: false, error: error.message };
        }
    });
};

// Handle OAuth callback URLs with enhanced security
export const handleOAuthCallback = (url, mainWindow, createWindow) => {
    console.log('Handling OAuth callback:', url);
    
    try {
        const parsedUrl = new URL(url);
        
        // Validate callback structure - support both legacy and new paths
        if (parsedUrl.hostname === 'auth' && 
            (parsedUrl.pathname === '/mstodo/callback' || parsedUrl.pathname === '/' || parsedUrl.pathname === '')) {
            console.log('✓ Matched Microsoft To-Do callback path:', parsedUrl.pathname);
            
            // Check both query parameters and URL fragment for OAuth data
            let code = parsedUrl.searchParams.get('code');
            let error = parsedUrl.searchParams.get('error');
            let state = parsedUrl.searchParams.get('state');
            
            // If not found in query params, check URL fragment (for MSAL)
            if (!code && !error && parsedUrl.hash) {
                const fragmentParams = new URLSearchParams(parsedUrl.hash.substring(1));
                code = fragmentParams.get('code');
                error = fragmentParams.get('error');
                state = fragmentParams.get('state');
                console.log('Checking URL fragment for OAuth data:', { 
                    hasCode: !!code, 
                    hasError: !!error, 
                    hasState: !!state,
                    fragment: parsedUrl.hash.substring(0, 100) + '...'
                });
            }
            
            console.log('OAuth callback received:', { 
                hasCode: !!code, 
                error: error || 'none', 
                state: state || 'none' 
            });
            
            // Create or focus the main window
            if (!mainWindow) {
                console.log('Main window not found, creating new window');
                createWindow();
            }
            
            if (mainWindow) {
                if (mainWindow.isMinimized()) {
                    console.log('Restoring minimized window');
                    mainWindow.restore();
                }
                mainWindow.focus();
                
                // Dispatch OAuth callback event to renderer process
                try {
                    const jsCallback = `
                        console.log('Dispatching MS To-Do OAuth callback event');
                        const event = new CustomEvent('mstodo-oauth-callback', {
                            detail: {
                                code: '${encodeURIComponent(code || '')}',
                                error: '${encodeURIComponent(error || '')}',
                                state: '${encodeURIComponent(state || '')}'
                            }
                        });
                        window.dispatchEvent(event);
                    `;
                    
                    mainWindow.webContents.executeJavaScript(jsCallback).catch(err => {
                        console.error('Failed to dispatch OAuth callback event:', err);
                    });
                    
                } catch (e) {
                    console.error('Failed to navigate to callback:', e);
                }
            } else {
                console.error('Could not create or access main window');
            }
        } else {
            console.warn('Invalid OAuth callback structure:', url);
        }
    } catch (error) {
        console.error('Failed to handle OAuth callback:', error);
    }
};
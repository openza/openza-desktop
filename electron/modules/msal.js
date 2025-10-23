import { ipcMain, app } from 'electron';
import { PublicClientApplication } from '@azure/msal-node';
import path from 'path';
import fs from 'fs';

// MSAL Node instance
let msalInstance = null;

// Default Microsoft Graph API scopes
const DEFAULT_SCOPES = [
  'https://graph.microsoft.com/MailboxSettings.Read',
  'https://graph.microsoft.com/offline_access',
  'https://graph.microsoft.com/Tasks.Read',
  'https://graph.microsoft.com/Tasks.ReadWrite',
  'https://graph.microsoft.com/User.Read'
];

// Cache file configuration
const getCacheFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'msal-cache.json');
};

// Cache plugin for persistence
const createCachePlugin = () => {
  const cacheFilePath = getCacheFilePath();
  
  return {
    beforeCacheAccess: async (cacheContext) => {
      try {
        if (fs.existsSync(cacheFilePath)) {
          const cacheData = await fs.promises.readFile(cacheFilePath, 'utf-8');
          console.log(`[MSAL Cache] Loading cache from: ${cacheFilePath}`);
          cacheContext.tokenCache.deserialize(cacheData);
        } else {
          console.log(`[MSAL Cache] No cache file found at: ${cacheFilePath}`);
        }
      } catch (error) {
        console.error('[MSAL Cache] Error loading cache:', error);
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        try {
          const cacheData = cacheContext.tokenCache.serialize();
          await fs.promises.writeFile(cacheFilePath, cacheData, 'utf-8');
          console.log(`[MSAL Cache] Cache saved to: ${cacheFilePath}`);
        } catch (error) {
          console.error('[MSAL Cache] Error saving cache:', error);
        }
      }
    }
  };
};

// Configuration
const getMsalConfig = () => {
  return {
    auth: {
      clientId: process.env.VITE_MSTODO_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.VITE_MSTODO_TENANT_ID || 'common'}`,
    },
    cache: {
      cachePlugin: createCachePlugin()
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          console.log(`[MSAL Node] ${level}: ${message}`);
        },
        piiLoggingEnabled: false,
        logLevel: 'Info'
      }
    }
  };
};

// Initialize MSAL instance
const initializeMsal = async () => {
  if (!msalInstance) {
    const config = getMsalConfig();
    if (!config.auth.clientId) {
      console.error('[MSAL Node] Client ID not configured');
      return false;
    }
    
    try {
      msalInstance = new PublicClientApplication(config);
      console.log(`[MSAL Node] Initialized successfully with persistent cache`);
      return true;
    } catch (error) {
      console.error('[MSAL Node] Failed to initialize:', error);
      return false;
    }
  }
  return true;
};

// Standardized error handling result type
const createResult = (success, data = null, error = null) => {
  if (success) {
    return { success: true, ...data };
  } else {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : (error || 'Unknown error'),
      code: error?.code || 'UNKNOWN_ERROR'
    };
  }
};

// Setup MSAL IPC handlers
export const setupMsalHandlers = () => {
  // Generate OAuth authorization URL
  ipcMain.handle('msal-get-auth-code-url', async (_event, request) => {
    try {
      if (!(await initializeMsal())) {
        throw new Error('MSAL not properly configured');
      }

      const authCodeUrlRequest = {
        scopes: request.scopes || DEFAULT_SCOPES,
        redirectUri: request.redirectUri,
      };

      const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlRequest);
      return createResult(true, { authUrl });
    } catch (error) {
      console.error('[MSAL Node] Failed to generate auth code URL:', error);
      return createResult(false, null, error);
    }
  });

  // Acquire token by authorization code
  ipcMain.handle('msal-acquire-token-by-code', async (_event, request) => {
    try {
      if (!(await initializeMsal())) {
        throw new Error('MSAL not properly configured');
      }

      const tokenRequest = {
        scopes: request.scopes || DEFAULT_SCOPES,
        code: request.code,
        redirectUri: request.redirectUri,
      };

      const result = await msalInstance.acquireTokenByCode(tokenRequest);
      
      const tokenData = {
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor((new Date(result.expiresOn).getTime() - Date.now()) / 1000),
        scope: result.scopes.join(' '),
        account: {
          username: result.account?.username,
          name: result.account?.name,
          tenantId: result.account?.tenantId,
          environment: result.account?.environment,
        }
      };

      return createResult(true, { tokenData });
    } catch (error) {
      console.error('[MSAL Node] Failed to acquire token by code:', error);
      return createResult(false, null, error);
    }
  });

  // Rate limiting for token refresh requests
  const refreshAttempts = new Map();
  const MAX_REFRESH_ATTEMPTS = 3;
  const REFRESH_COOLDOWN_MS = 30000; // 30 seconds
  
  const canAttemptRefresh = (accountKey) => {
    const now = Date.now();
    const attempts = refreshAttempts.get(accountKey) || { count: 0, lastAttempt: 0 };
    
    // Reset counter if cooldown period has passed
    if (now - attempts.lastAttempt > REFRESH_COOLDOWN_MS) {
      attempts.count = 0;
    }
    
    return attempts.count < MAX_REFRESH_ATTEMPTS;
  };
  
  const recordRefreshAttempt = (accountKey) => {
    const now = Date.now();
    const attempts = refreshAttempts.get(accountKey) || { count: 0, lastAttempt: 0 };
    refreshAttempts.set(accountKey, { count: attempts.count + 1, lastAttempt: now });
  };

  // Acquire token silently with improved error handling and rate limiting
  ipcMain.handle('msal-acquire-token-silent', async (_event, request) => {
    try {
      if (!(await initializeMsal())) {
        throw new Error('MSAL not properly configured');
      }

      const cache = msalInstance.getTokenCache();
      const accounts = await cache.getAllAccounts();
      
      if (accounts.length === 0) {
        console.log('[MSAL Node] No accounts found in cache - this is expected on first run or after cache clear');
        return createResult(false, null, { 
          error: 'No accounts found for silent token acquisition',
          requiresInteraction: true,
          code: 'NO_ACCOUNTS_FOUND'
        });
      }

      const account = accounts[0];
      const accountKey = `${account.username}_${account.tenantId}`;
      
      // Check rate limiting
      if (!canAttemptRefresh(accountKey)) {
        console.log(`[MSAL Node] Rate limit exceeded for account ${accountKey}, requiring interactive auth`);
        return createResult(false, null, { 
          error: 'Too many refresh attempts. Please sign in again.',
          requiresInteraction: true,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      console.log(`[MSAL Node] Found ${accounts.length} accounts in cache, attempting silent token acquisition`);
      const silentRequest = {
        scopes: request.scopes || DEFAULT_SCOPES,
        account: account,
        forceRefresh: false,
      };

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Silent token acquisition timed out')), 15000);
      });

      const result = await Promise.race([
        msalInstance.acquireTokenSilent(silentRequest),
        timeoutPromise
      ]);
      
      console.log('[MSAL Node] Silent token acquisition successful');
      const tokenData = {
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor((new Date(result.expiresOn).getTime() - Date.now()) / 1000),
        scope: result.scopes.join(' '),
        account: {
          username: result.account?.username,
          name: result.account?.name,
          tenantId: result.account?.tenantId,
          environment: result.account?.environment,
        }
      };

      return createResult(true, { tokenData });
    } catch (error) {
      console.error('[MSAL Node] Failed to acquire token silently:', error);
      
      // Record the failed attempt for rate limiting
      const cache = msalInstance?.getTokenCache();
      if (cache) {
        try {
          const accounts = await cache.getAllAccounts();
          if (accounts.length > 0) {
            const account = accounts[0];
            const accountKey = `${account.username}_${account.tenantId}`;
            recordRefreshAttempt(accountKey);
          }
        } catch (cacheError) {
          console.warn('[MSAL Node] Failed to access cache for rate limiting:', cacheError);
        }
      }
      
      // Handle specific error cases
      if (error.errorCode === 'network_error' || error.message?.includes('Network request failed')) {
        console.log('[MSAL Node] Network error during token refresh - interactive auth required');
        return createResult(false, null, { 
          error: 'Network error during authentication. Please check your connection and try again.',
          requiresInteraction: true,
          code: 'NETWORK_ERROR'
        });
      }
      
      if (error.errorCode === 'TokenExpiredError' || error.errorCode === 'no_tokens_found') {
        console.log('[MSAL Node] Token expired or not found in cache - interactive auth required');
        return createResult(false, null, { 
          ...error, 
          requiresInteraction: true,
          message: 'Authentication session expired. Interactive authentication required.'
        });
      }
      
      // For timeout errors
      if (error.message?.includes('timed out')) {
        console.log('[MSAL Node] Token acquisition timed out - interactive auth required');
        return createResult(false, null, { 
          error: 'Token acquisition timed out. Please try again.',
          requiresInteraction: true,
          code: 'TIMEOUT_ERROR'
        });
      }
      
      return createResult(false, null, error);
    }
  });

  // Get account information
  ipcMain.handle('msal-get-account', async () => {
    try {
      if (!(await initializeMsal())) {
        throw new Error('MSAL not properly configured');
      }

      const cache = msalInstance.getTokenCache();
      const accounts = await cache.getAllAccounts();
      
      if (accounts.length === 0) {
        return createResult(true, { account: null });
      }

      const account = accounts[0];
      return createResult(true, {
        account: {
          username: account.username,
          name: account.name,
          tenantId: account.tenantId,
          environment: account.environment,
        }
      });
    } catch (error) {
      console.error('[MSAL Node] Failed to get account:', error);
      return createResult(false, null, error);
    }
  });

  // Sign out
  ipcMain.handle('msal-sign-out', async () => {
    try {
      if (!(await initializeMsal())) {
        return createResult(true); // Nothing to clear
      }

      const cache = msalInstance.getTokenCache();
      const accounts = await cache.getAllAccounts();
      
      // Remove all accounts from cache
      for (const account of accounts) {
        await cache.removeAccount(account);
      }

      console.log('[MSAL Node] Successfully signed out and cleared cache');
      return createResult(true);
    } catch (error) {
      console.error('[MSAL Node] Failed to sign out:', error);
      return createResult(false, null, error);
    }
  });

  // Acquire token interactively (Microsoft official Electron pattern)
  ipcMain.handle('msal-acquire-token-interactive', async (_event, request) => {
    try {
      if (!(await initializeMsal())) {
        throw new Error('MSAL not properly configured');
      }

      const openBrowser = async (url) => {
        // Use Electron's shell to open the authentication URL in system browser
        const { shell } = await import('electron');
        await shell.openExternal(url);
        return Promise.resolve();
      };

      const interactiveRequest = {
        scopes: request.scopes || DEFAULT_SCOPES,
        openBrowser,
        successTemplate: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #4CAF50;">Authentication Successful!</h1>
              <p>You have successfully authenticated with Microsoft To-Do.</p>
              <p style="color: #666;">You can close this window and return to the application.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `,
        errorTemplate: `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #f44336;">Authentication Failed!</h1>
              <p>There was an error during authentication.</p>
              <p style="color: #666;">Please close this window and try again.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 5000);
              </script>
            </body>
          </html>
        `
      };

      console.log('[MSAL Node] Starting interactive authentication using system browser');
      const result = await msalInstance.acquireTokenInteractive(interactiveRequest);
      
      const tokenData = {
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor((new Date(result.expiresOn).getTime() - Date.now()) / 1000),
        scope: result.scopes.join(' '),
        account: {
          username: result.account?.username,
          name: result.account?.name,
          tenantId: result.account?.tenantId,
          environment: result.account?.environment,
        }
      };

      console.log('[MSAL Node] Interactive authentication successful');
      return createResult(true, { tokenData });
    } catch (error) {
      console.error('[MSAL Node] Interactive authentication failed:', error);
      return createResult(false, null, error);
    }
  });

  // Debug handler to check cache status
  ipcMain.handle('msal-debug-cache', async () => {
    try {
      if (!(await initializeMsal())) {
        return createResult(false, null, 'MSAL not initialized');
      }

      const cache = msalInstance.getTokenCache();
      const accounts = await cache.getAllAccounts();
      const config = getMsalConfig();
      
      return createResult(true, {
        accountCount: accounts.length,
        accounts: accounts.map(acc => ({
          username: acc.username,
          name: acc.name,
          tenantId: acc.tenantId,
          environment: acc.environment
        })),
        cacheLocation: config.cache.cacheLocation
      });
    } catch (error) {
      console.error('[MSAL Node] Debug cache check failed:', error);
      return createResult(false, null, error);
    }
  });

  console.log('[MSAL Node] IPC handlers registered (including interactive authentication and debug)');
};
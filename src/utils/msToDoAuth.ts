import { getOAuthConfig } from './config';
import { tokenManager } from './tokenManager';

export interface MsToDoAuthConfig {
  clientId: string;
  redirectUri: string;
  tenantId: string;
  protocolScheme: string;
  timeoutMinutes: number;
}

export interface MsToDoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export interface MsToDoAuthError {
  error: string;
  error_description: string;
  error_codes?: number[];
  timestamp?: string;
  trace_id?: string;
  correlation_id?: string;
}

// Simple interface for authentication result from main process
export interface AuthenticationResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  account?: {
    username?: string;
    name?: string;
    tenantId?: string;
    environment?: string;
  };
}

class MsToDoAuthManager {
  private static instance: MsToDoAuthManager;
  private config: MsToDoAuthConfig;
  private refreshPromise: Promise<MsToDoTokenResponse> | null = null;

  constructor() {
    // Config will be loaded asynchronously when needed
    this.config = {
      clientId: '',
      redirectUri: '',
      tenantId: 'common',
      protocolScheme: 'openza',
      timeoutMinutes: 3,
    };
  }

  /**
   * Load configuration
   */
  private async loadConfig(): Promise<void> {
    try {
      const config = await getOAuthConfig('msToDo');
      this.config = {
        clientId: config.clientId || '',
        redirectUri: config.redirectUri || '',
        tenantId: config.tenantId || 'common',
        protocolScheme: config.protocolScheme || 'openza',
        timeoutMinutes: config.timeoutMinutes || 3,
      };
      
      // Validate that we have the required configuration
      if (!this.config.clientId || !this.config.redirectUri) {
        throw new Error('Missing required OAuth configuration (clientId or redirectUri)');
      }
      
      // Validate protocol scheme format
      if (!/^[a-z][a-z0-9+.-]*$/.test(this.config.protocolScheme)) {
        throw new Error('Invalid protocol scheme format');
      }
      
      // Validate timeout range
      if (this.config.timeoutMinutes < 1 || this.config.timeoutMinutes > 10) {
        throw new Error('OAuth timeout must be between 1 and 10 minutes');
      }
    } catch (error) {
      console.error('Failed to load secure config:', error);
      throw new Error('OAuth configuration not available. Please ensure the application is properly configured.');
    }
  }

  /**
   * Store authentication result in token manager
   */
  private async storeAuthenticationResult(result: AuthenticationResult): Promise<void> {
    const tokenData: MsToDoTokenResponse = {
      access_token: result.access_token,
      token_type: result.token_type || 'Bearer',
      expires_in: result.expires_in,
      scope: result.scope,
    };

    await tokenManager.storeToken('msToDo', tokenData);
    tokenManager.scheduleTokenRefresh('msToDo');
  }

  static getInstance(): MsToDoAuthManager {
    if (!MsToDoAuthManager.instance) {
      MsToDoAuthManager.instance = new MsToDoAuthManager();
    }
    return MsToDoAuthManager.instance;
  }

  /**
   * Get the appropriate redirect URI based on environment
   */
  private getRedirectUri(): string {
    // Check if running in Electron
    const isElectron = window.electron !== undefined;
    
    if (isElectron) {
      // Electron app - use simple custom protocol (Microsoft recommended pattern)
      return `${this.config.protocolScheme}://auth`;
    } else {
      // Web browser - use configured redirect URI
      return this.config.redirectUri;
    }
  }

  /**
   * Check if we're running in Electron
   */
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electron !== undefined;
  }

  /**
   * Sanitize error messages to prevent potential XSS or information leakage
   */
  private sanitizeErrorMessage(error: string): string {
    if (typeof error !== 'string') return 'Unknown error';
    
    // Remove any HTML tags and limit length
    return error
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .substring(0, 200)
      .trim();
  }

  /**
   * Sanitize authorization code input
   */
  private sanitizeAuthCode(code: string): string {
    if (typeof code !== 'string') throw new Error('Invalid authorization code format');
    
    // Decode and validate the authorization code format
    const decodedCode = decodeURIComponent(code);
    
    // Basic validation - authorization codes should be alphanumeric with some special chars
    if (!/^[A-Za-z0-9._-]+$/.test(decodedCode)) {
      throw new Error('Invalid authorization code format');
    }
    
    return decodedCode;
  }

  /**
   * Start OAuth flow using MSAL acquireTokenInteractive (Microsoft's official method)
   * This is the easiest UX - completely automated by Microsoft
   */
  async startMsalInteractiveFlow(): Promise<AuthenticationResult> {
    await this.loadConfig();
    
    console.log('Starting MSAL acquireTokenInteractive flow...');
    
    const electron = (window as any).electron;
    if (!electron?.msal?.acquireTokenInteractive) {
      throw new Error('MSAL interactive authentication not available in this environment');
    }

    try {
      const result = await electron.msal.acquireTokenInteractive({
        scopes: [
          'https://graph.microsoft.com/MailboxSettings.Read',
          'https://graph.microsoft.com/offline_access',
          'https://graph.microsoft.com/Tasks.Read',
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/User.Read'
        ]
      });
      
      if (!result.success || !result.tokenData) {
        throw new Error(result.error || 'MSAL interactive authentication failed');
      }
      
      const authResult: AuthenticationResult = {
        access_token: result.tokenData.access_token,
        token_type: result.tokenData.token_type || 'Bearer',
        expires_in: result.tokenData.expires_in,
        scope: result.tokenData.scope,
        account: result.tokenData.account,
      };
      
      await this.storeAuthenticationResult(authResult);
      console.log('MSAL acquireTokenInteractive completed successfully');
      return authResult;
    } catch (error) {
      console.error('MSAL acquireTokenInteractive failed:', error);
      throw new Error(`MSAL interactive authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start OAuth flow using custom protocol (openza://auth) - seamless interactive experience
   */
  async startOAuthFlowInteractive(): Promise<AuthenticationResult> {
    await this.loadConfig();
    
    console.log('Starting seamless OAuth flow with custom protocol...');
    
    const electron = (window as any).electron;
    if (!electron?.msal?.getAuthCodeUrl || !electron?.shell?.openExternal) {
      throw new Error('OAuth authentication not available in this environment');
    }

    try {
      // Step 1: Generate auth URL using MSAL with our custom protocol
      const urlResult = await electron.msal.getAuthCodeUrl({
        scopes: [
          'https://graph.microsoft.com/MailboxSettings.Read',
          'https://graph.microsoft.com/offline_access',
          'https://graph.microsoft.com/Tasks.Read',
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/User.Read'
        ],
        redirectUri: this.getRedirectUri(), // openza://auth
      });
      
      if (!urlResult.success || !urlResult.authUrl) {
        throw new Error(urlResult.error || 'Failed to generate authentication URL');
      }

      const redirectUri = this.getRedirectUri();
      console.log(`Opening browser with redirect to: ${redirectUri}`);
      
      // Step 2: Open browser and wait for custom protocol callback
      return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;
        
        const handleCallback = (event: Event) => {
          const customEvent = event as CustomEvent;
          const { code, error } = customEvent.detail;
          
          // Clear timeout and remove listener
          clearTimeout(timeoutId);
          window.removeEventListener('mstodo-oauth-callback', handleCallback);
          
          if (error) {
            reject(new Error(`OAuth authentication failed: ${error}`));
            return;
          }
          
          if (code) {
            // Handle token acquisition asynchronously
            this.handleTokenAcquisition(code, resolve, reject);
          } else {
            reject(new Error('No authorization code received from OAuth callback'));
          }
        };
        
        // Listen for protocol callback
        window.addEventListener('mstodo-oauth-callback', handleCallback);
        
        // Set timeout
        timeoutId = setTimeout(() => {
          window.removeEventListener('mstodo-oauth-callback', handleCallback);
          reject(new Error(`OAuth authentication timed out after ${this.config.timeoutMinutes} minutes`));
        }, this.config.timeoutMinutes * 60 * 1000);
        
        // Open the authentication URL
        electron.shell.openExternal(urlResult.authUrl).catch((shellError: Error) => {
          clearTimeout(timeoutId);
          window.removeEventListener('mstodo-oauth-callback', handleCallback);
          reject(new Error(`Failed to open authentication URL: ${shellError.message}`));
        });
      });
    } catch (error) {
      console.error('OAuth authentication setup failed:', error);
      throw new Error(`OAuth authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a timeout wrapper for authentication methods
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, methodName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${methodName} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
      
      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Start OAuth flow with smart 3-method fallback (easiest UX → most reliable)
   */
  async startOAuthFlowWithFallback(): Promise<AuthenticationResult> {
    console.log('Starting smart OAuth flow with 3-method fallback...');
    
    const errors: string[] = [];
    
    // Method 1: MSAL Interactive (easiest UX) - 30s timeout
    try {
      console.log('🚀 Trying method 1: MSAL Interactive (easiest) - 30s timeout');
      return await this.withTimeout(
        this.startMsalInteractiveFlow(),
        30000,
        'MSAL Interactive'
      );
    } catch (msalError) {
      const msalErrorMessage = msalError instanceof Error ? msalError.message : 'Unknown MSAL error';
      errors.push(`MSAL Interactive: ${msalErrorMessage}`);
      console.log('❌ Method 1 failed, trying method 2:', msalErrorMessage);
    }
    
    // Method 2: Custom Protocol (good UX) - 60s timeout
    try {
      console.log('🔄 Trying method 2: Custom Protocol (seamless) - 60s timeout');
      return await this.withTimeout(
        this.startOAuthFlowInteractive(),
        60000,
        'Custom Protocol'
      );
    } catch (protocolError) {
      const protocolErrorMessage = protocolError instanceof Error ? protocolError.message : 'Unknown protocol error';
      errors.push(`Custom Protocol: ${protocolErrorMessage}`);
      console.log('❌ Method 2 failed, trying method 3:', protocolErrorMessage);
    }
    
    // Method 3: Manual OAuth (most reliable) - 120s timeout
    try {
      console.log('🔧 Trying method 3: Manual OAuth (reliable fallback) - 120s timeout');
      return await this.withTimeout(
        this.startOAuthFlow(),
        120000,
        'Manual OAuth'
      );
    } catch (manualError) {
      const manualErrorMessage = manualError instanceof Error ? manualError.message : 'Unknown manual error';
      errors.push(`Manual OAuth: ${manualErrorMessage}`);
      console.error('❌ All authentication methods failed');
    }
    
    // All methods failed - provide comprehensive error
    throw new Error(
      `All authentication methods failed:\n${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`
    );
  }

  /**
   * Start OAuth flow using MSAL in main process via IPC (manual implementation)
   */
  async startOAuthFlow(): Promise<AuthenticationResult> {
    await this.loadConfig();
    
    console.log('Starting MSAL OAuth flow via main process...');
    
    // Enhanced resource management with AbortController
    const abortController = new AbortController();
    const { signal } = abortController;
    
    let isCleanedUp = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    return new Promise((resolve, reject) => {
      let cleanup: () => void;
      
      const handleCallback = (event: Event) => {
        if (signal.aborted) return;
        
        const customEvent = event as CustomEvent;
        const { code, error } = customEvent.detail;
        
        cleanup();
        
        if (error) {
          reject(new Error(`OAuth failed: ${this.sanitizeErrorMessage(error)}`));
          return;
        }
        
        if (code) {
          // Handle token acquisition asynchronously
          this.handleTokenAcquisition(code, resolve, reject);
        } else {
          reject(new Error('No authorization code received'));
        }
      };
      
      cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Remove event listener
        window.removeEventListener('mstodo-oauth-callback', handleCallback);
        
        // Only abort if we haven't already resolved/rejected
        // The AbortController should only be used for actual abortion scenarios
      };
      
      // Handle abort signal
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('OAuth flow was aborted'));
      });
      
      // Listen for the callback event from Electron protocol handler
      window.addEventListener('mstodo-oauth-callback', handleCallback);
      
      // Generate auth URL and open browser
      this.initializeOAuthFlow()
        .then(() => {
          // Set a timeout for the OAuth flow using configured timeout
          timeoutId = setTimeout(() => {
            if (!isCleanedUp) {
              abortController.abort();
              reject(new Error(`OAuth flow timed out after ${this.config.timeoutMinutes} minutes`));
            }
          }, this.config.timeoutMinutes * 60 * 1000);
        })
        .catch((urlError) => {
          if (!isCleanedUp) {
            abortController.abort();
            reject(new Error(`Failed to generate auth URL: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`));
          }
        });
    });
  }

  /**
   * Initialize OAuth flow by generating URL and opening browser
   */
  private async initializeOAuthFlow(): Promise<void> {
    const electron = (window as any).electron;
    if (!electron?.msal?.getAuthCodeUrl) {
      throw new Error('MSAL not available in this environment');
    }

    // Use IPC to call main process for auth URL generation
    const urlResult = await electron.msal.getAuthCodeUrl({
      scopes: ['https://graph.microsoft.com/Tasks.ReadWrite'],
      redirectUri: this.getRedirectUri(),
    });
    
    if (!urlResult.success) {
      throw new Error(urlResult.error || 'Failed to generate auth URL');
    }
    
    if (!electron?.shell?.openExternal) {
      throw new Error('Shell API not available in this environment');
    }

    console.log('Opening system browser with MSAL-generated URL from main process');
    await electron.shell.openExternal(urlResult.authUrl!);
  }

  /**
   * Handle token acquisition after receiving authorization code
   */
  private async handleTokenAcquisition(
    code: string,
    resolve: (value: AuthenticationResult) => void,
    reject: (reason: Error) => void
  ): Promise<void> {
    try {
      console.log('Processing OAuth callback via main process...');
      
      const electron = (window as any).electron;
      if (!electron?.msal?.acquireTokenByCode) {
        throw new Error('MSAL token acquisition not available in this environment');
      }
      
      // Sanitize the authorization code
      const sanitizedCode = this.sanitizeAuthCode(code);
      
      // Use IPC to call main process for token acquisition
      const result = await electron.msal.acquireTokenByCode({
        scopes: [
          'https://graph.microsoft.com/MailboxSettings.Read',
          'https://graph.microsoft.com/offline_access',
          'https://graph.microsoft.com/Tasks.Read',
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/User.Read'
        ],
        code: sanitizedCode,
        redirectUri: this.getRedirectUri(),
      });
      
      if (!result.success || !result.tokenData) {
        throw new Error(result.error || 'Token acquisition failed');
      }
      
      const authResult: AuthenticationResult = {
        access_token: result.tokenData.access_token,
        token_type: result.tokenData.token_type || 'Bearer',
        expires_in: result.tokenData.expires_in,
        scope: result.tokenData.scope,
        account: result.tokenData.account,
      };
      
      await this.storeAuthenticationResult(authResult);
      resolve(authResult);
    } catch (tokenError) {
      console.error('MSAL token acquisition failed:', tokenError);
      reject(new Error(`Token acquisition failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`));
    }
  }


  /**
   * Handle redirect callback - not applicable for Electron
   */
  async handleRedirectCallback(): Promise<AuthenticationResult | null> {
    console.log('Redirect callback called in Electron - not applicable');
    return null;
  }


  /**
   * Get account for silent token acquisition via IPC
   */
  private async getAccount() {
    try {
      const electron = (window as any).electron;
      if (!electron?.msal?.getAccount) {
        return null;
      }
      const result = await electron.msal.getAccount();
      return result.success ? result.account : null;
    } catch (error) {
      console.error('Failed to get account via IPC:', error);
      return null;
    }
  }

  /**
   * Refresh an expired access token using MSAL silent acquisition via IPC with debouncing
   */
  async refreshToken(): Promise<MsToDoTokenResponse> {
    // If there's already a refresh in progress, wait for it
    if (this.refreshPromise) {
      console.log('[MS To-Do Auth] Token refresh already in progress, waiting for existing request...');
      try {
        return await this.refreshPromise;
      } catch (error) {
        // If the existing refresh failed, we'll try again
        console.log('[MS To-Do Auth] Existing refresh failed, trying new refresh...');
        this.refreshPromise = null;
      }
    }

    // Start a new refresh
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      this.refreshPromise = null;
      return result;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<MsToDoTokenResponse> {
    try {
      const electron = (window as any).electron;
      if (!electron?.msal?.acquireTokenSilent) {
        throw new Error('MSAL silent acquisition not available in this environment');
      }
      
      console.log('[MS To-Do Auth] Attempting silent token refresh...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Token refresh timeout')), 10000);
      });
      
      const refreshPromise = electron.msal.acquireTokenSilent({
        scopes: [
          'https://graph.microsoft.com/MailboxSettings.Read',
          'https://graph.microsoft.com/offline_access',
          'https://graph.microsoft.com/Tasks.Read',
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/User.Read'
        ],
      });
      
      const result = await Promise.race([refreshPromise, timeoutPromise]);
      
      if (!result.success || !result.tokenData) {
        console.log('[MS To-Do Auth] Silent token refresh failed, checking if interactive is required...');
        
        // Check for specific error conditions
        if (result.error) {
          if (result.error.requiresInteraction) {
            console.log('[MS To-Do Auth] Interactive authentication required - this is expected behavior');
            throw new Error('Interactive authentication required');
          }
          
          if (result.error.code === 'NETWORK_ERROR' || 
              result.error.code === 'network_error' ||
              result.error.message?.includes('Network request failed')) {
            throw new Error('Network request failed');
          }
          
          if (result.error.code === 'RATE_LIMIT_EXCEEDED') {
            throw new Error('Rate limit exceeded');
          }
        }
        
        throw new Error(result.error || 'Token refresh failed');
      }
      
      console.log('[MS To-Do Auth] Silent token refresh successful');
      const authResult: AuthenticationResult = {
        access_token: result.tokenData.access_token,
        token_type: result.tokenData.token_type || 'Bearer',
        expires_in: result.tokenData.expires_in,
        scope: result.tokenData.scope,
        account: result.tokenData.account,
      };
      
      // Store refreshed token
      await this.storeAuthenticationResult(authResult);
      
      return {
        access_token: authResult.access_token,
        token_type: authResult.token_type,
        expires_in: authResult.expires_in,
        scope: authResult.scope,
      };
    } catch (error) {
      console.error('[MS To-Do Auth] Token refresh failed:', error);
      
      // If it's an interactive requirement, throw a specific error
      if (error instanceof Error && error.message === 'Interactive authentication required') {
        throw error;
      }
      
      // Handle network errors specifically
      if (error instanceof Error && error.message.includes('Network request failed')) {
        throw new Error('Network request failed');
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Token refresh timeout');
      }
      
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that all required configuration is present
   */
  private validateConfig(): boolean {
    return !!(
      this.config.clientId &&
      this.config.redirectUri &&
      this.config.tenantId
    );
  }


  /**
   * Get a valid access token, refreshing if necessary via IPC
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const electron = (window as any).electron;
      if (!electron?.msal?.acquireTokenSilent) {
        return null;
      }
      
      const result = await electron.msal.acquireTokenSilent({
        scopes: [
          'https://graph.microsoft.com/MailboxSettings.Read',
          'https://graph.microsoft.com/offline_access',
          'https://graph.microsoft.com/Tasks.Read',
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/User.Read'
        ],
      });
      
      return result.success && result.tokenData ? result.tokenData.access_token : null;
    } catch (error) {
      console.error('Failed to get valid access token:', error);
      return null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.loadConfig();
      
      // First check if we have an account in MSAL cache
      const account = await this.getAccount();
      if (!account) {
        console.log('[MS To-Do Auth] No account found in MSAL cache');
        return false;
      }
      
      // Try to get a valid token silently to verify the account is still valid
      try {
        const token = await this.getValidAccessToken();
        const isValid = token !== null;
        console.log(`[MS To-Do Auth] Authentication status: ${isValid ? 'valid' : 'invalid'}`);
        return isValid;
      } catch (error) {
        console.log('[MS To-Do Auth] Token validation failed during auth check:', error);
        // Don't immediately return false - the account might still be recoverable
        return true; // Let the token manager handle the refresh logic
      }
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  }

  /**
   * Get token information for UI display
   */
  async getTokenInfo() {
    try {
      await this.loadConfig();
      const account = await this.getAccount();
      if (!account) {
        return null;
      }

      return {
        account: account.username,
        name: account.name,
        tenantId: account.tenantId,
        environment: account.environment,
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Sign out user by clearing tokens via IPC
   */
  async signOut(): Promise<void> {
    try {
      // Clear tokens in main process if available
      const electron = (window as any).electron;
      if (electron?.msal?.signOut) {
        await electron.msal.signOut();
      }
      
      // Also clear any tokens stored in our token manager
      await tokenManager.clearToken('msToDo');
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Clear token manager even if MSAL logout fails
      await tokenManager.clearToken('msToDo');
    }
  }

  /**
   * Check if authentication is properly configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.loadConfig();
      return this.validateConfig();
    } catch (error) {
      console.error('Failed to check configuration:', error);
      return false;
    }
  }

  /**
   * Get the current configuration
   */
  async getConfig() {
    return {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      tenantId: this.config.tenantId,
      protocolScheme: this.config.protocolScheme,
      timeoutMinutes: this.config.timeoutMinutes,
      isConfigured: await this.isConfigured(),
    };
  }
}

export const msToDoAuthManager = MsToDoAuthManager.getInstance();
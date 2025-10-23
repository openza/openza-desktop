import { secureStorage } from './secureStorage';

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number; // Unix timestamp
  token_type: string;
  scope: string;
  provider: 'todoist' | 'msToDo';
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  token?: TokenData;
}

class TokenManager {
  private static instance: TokenManager;
  private readonly TOKEN_PREFIX = 'token_';
  private readonly REFRESH_THRESHOLD_MINUTES = 5; // Refresh if expires in 5 minutes

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Store token with expiration metadata
   */
  async storeToken(provider: 'todoist' | 'msToDo', tokenResponse: Record<string, unknown> | { access_token: string; token_type?: string; expires_in?: number; scope?: string; refresh_token?: string }): Promise<void> {
    const now = Date.now();
    const expiresIn = tokenResponse.expires_in || 3600; // Default 1 hour
    const expiresAt = now + (expiresIn * 1000);

    const tokenData: TokenData = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: expiresIn,
      expires_at: expiresAt,
      token_type: tokenResponse.token_type || 'Bearer',
      scope: tokenResponse.scope || '',
      provider: provider,
    };

    const key = `${this.TOKEN_PREFIX}${provider}`;
    await secureStorage.setItem(key, JSON.stringify(tokenData));
    
    console.log(`Token stored for ${provider}, expires at:`, new Date(expiresAt).toISOString());
  }

  /**
   * Get token and validate expiration
   */
  async getToken(provider: 'todoist' | 'msToDo'): Promise<TokenValidationResult> {
    try {
      const key = `${this.TOKEN_PREFIX}${provider}`;
      const tokenJson = await secureStorage.getItem(key);
      
      if (!tokenJson) {
        return { isValid: false, isExpired: false, needsRefresh: false };
      }

      const token: TokenData = JSON.parse(tokenJson);
      const now = Date.now();
      const isExpired = now >= token.expires_at;
      const needsRefresh = now >= (token.expires_at - (this.REFRESH_THRESHOLD_MINUTES * 60 * 1000));

      return {
        isValid: !isExpired,
        isExpired,
        needsRefresh: needsRefresh && !isExpired,
        token
      };
    } catch (error) {
      console.error(`Failed to get token for ${provider}:`, error);
      return { isValid: false, isExpired: false, needsRefresh: false };
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(provider: 'todoist' | 'msToDo'): Promise<string | null> {
    const validation = await this.getToken(provider);
    
    if (!validation.token) {
      return null;
    }

    // Token is still valid
    if (validation.isValid && !validation.needsRefresh) {
      return validation.token.access_token;
    }

    // For Microsoft To-Do, always try MSAL silent refresh first regardless of refresh_token presence
    if (provider === 'msToDo' && (validation.needsRefresh || validation.isExpired)) {
      try {
        const refreshedToken = await this.refreshToken(provider, validation.token.refresh_token || '');
        if (refreshedToken) {
          return refreshedToken.access_token;
        }
      } catch (error) {
        console.error(`Failed to refresh token for ${provider}:`, error);
        // For MS To-Do, don't clear immediately - the refresh method handles fallback strategies
        return null;
      }
    }

    // Token is expired or needs refresh (for other providers)
    if (validation.token.refresh_token && (validation.needsRefresh || validation.isExpired)) {
      try {
        const refreshedToken = await this.refreshToken(provider, validation.token.refresh_token);
        if (refreshedToken) {
          return refreshedToken.access_token;
        }
      } catch (error) {
        console.error(`Failed to refresh token for ${provider}:`, error);
        // Clear invalid token
        await this.clearToken(provider);
        return null;
      }
    }

    // Token is expired and can't be refreshed
    if (validation.isExpired) {
      // For MS To-Do, don't immediately clear - let the caller handle it
      if (provider !== 'msToDo') {
        await this.clearToken(provider);
      }
      return null;
    }

    return validation.token.access_token;
  }

  // Track refresh attempts for exponential backoff
  private refreshAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_REFRESH_ATTEMPTS = 3;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 30000; // 30 seconds

  /**
   * Calculate backoff delay with exponential backoff
   */
  private getBackoffDelay(attempts: number): number {
    const delay = Math.min(
      this.INITIAL_BACKOFF_MS * Math.pow(2, attempts - 1),
      this.MAX_BACKOFF_MS
    );
    return delay;
  }

  /**
   * Check if we can attempt refresh (with backoff)
   */
  private canAttemptRefresh(provider: string): boolean {
    const now = Date.now();
    const attempts = this.refreshAttempts.get(provider) || { count: 0, lastAttempt: 0 };
    
    // Reset counter if enough time has passed
    if (now - attempts.lastAttempt > this.MAX_BACKOFF_MS) {
      attempts.count = 0;
    }
    
    // Check if we've exceeded max attempts
    if (attempts.count >= this.MAX_REFRESH_ATTEMPTS) {
      return false;
    }
    
    // Check if we need to wait for backoff
    if (attempts.count > 0) {
      const backoffDelay = this.getBackoffDelay(attempts.count);
      if (now - attempts.lastAttempt < backoffDelay) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Record a refresh attempt
   */
  private recordRefreshAttempt(provider: string): void {
    const now = Date.now();
    const attempts = this.refreshAttempts.get(provider) || { count: 0, lastAttempt: 0 };
    this.refreshAttempts.set(provider, { count: attempts.count + 1, lastAttempt: now });
  }

  /**
   * Reset refresh attempts for a provider
   */
  private resetRefreshAttempts(provider: string): void {
    this.refreshAttempts.delete(provider);
  }

  /**
   * Refresh an expired token with improved error handling and backoff
   */
  private async refreshToken(provider: 'todoist' | 'msToDo', refreshToken: string): Promise<TokenData | null> {
    // Check if we can attempt refresh (considering backoff)
    if (!this.canAttemptRefresh(provider)) {
      const attempts = this.refreshAttempts.get(provider);
      if (attempts && attempts.count >= this.MAX_REFRESH_ATTEMPTS) {
        throw new Error('Too many refresh attempts. Please sign in again.');
      } else {
        throw new Error('Token refresh is in cooldown. Please wait before trying again.');
      }
    }

    try {
      if (provider === 'msToDo') {
        const { msToDoAuthManager } = await import('./msToDoAuth');
        
        // Record the attempt
        this.recordRefreshAttempt(provider);
        
        try {
          // MSAL handles refresh tokens internally, so we don't pass the refresh token
          const tokenResponse = await msToDoAuthManager.refreshToken();
          await this.storeToken(provider, tokenResponse);
          
          // Reset attempts on success
          this.resetRefreshAttempts(provider);
          
          const validation = await this.getToken(provider);
          return validation.token || null;
        } catch (refreshError) {
          console.warn(`Silent token refresh failed for ${provider}:`, refreshError);
          
          // Handle specific error types
          if (refreshError instanceof Error) {
            // Network errors - don't try interactive auth immediately
            if (refreshError.message.includes('Network request failed') || 
                refreshError.message.includes('network_error')) {
              throw new Error('Network error during token refresh. Please check your connection and try again.');
            }
            
            // Rate limit errors - don't try interactive auth
            if (refreshError.message.includes('rate limit') || 
                refreshError.message.includes('too many requests')) {
              throw new Error('Rate limit exceeded. Please wait before trying again.');
            }
            
            // Only try interactive refresh if the error indicates it's required
            if (refreshError.message === 'Interactive authentication required') {
              console.log(`Attempting interactive token refresh for ${provider} as fallback...`);
              
              try {
                const interactiveResult = await msToDoAuthManager.startMsalInteractiveFlow();
                
                // Store the new token
                const tokenResponse = {
                  access_token: interactiveResult.access_token,
                  token_type: interactiveResult.token_type,
                  expires_in: interactiveResult.expires_in,
                  scope: interactiveResult.scope
                };
                await this.storeToken(provider, tokenResponse);
                
                // Reset attempts on success
                this.resetRefreshAttempts(provider);
                
                const validation = await this.getToken(provider);
                return validation.token || null;
              } catch (interactiveError) {
                console.warn(`Interactive token refresh also failed for ${provider}:`, interactiveError);
                
                // Only now clear the token and invalidate auth state
                await this.clearToken(provider);
                
                // Invalidate auth state to trigger re-authentication UI
                try {
                  const { authManager } = await import('./auth');
                  await authManager.invalidateProvider(provider);
                } catch (authError) {
                  console.warn('Failed to invalidate auth state:', authError);
                }
                
                throw new Error('Authentication session expired. Please sign in again.');
              }
            } else {
              // For other types of errors, don't try interactive auth
              throw refreshError;
            }
          } else {
            throw refreshError;
          }
        }
      } else if (provider === 'todoist') {
        // Todoist tokens are long-lived and don't support refresh
        // If token is expired, clear it and require re-authentication
        console.warn('Todoist token expired - clearing token for re-authentication');
        await this.clearToken(provider);
        
        // Invalidate auth state to trigger re-authentication UI
        try {
          const { authManager } = await import('./auth');
          await authManager.invalidateProvider(provider);
        } catch (authError) {
          console.warn('Failed to invalidate auth state:', authError);
        }
        
        throw new Error('Todoist authentication expired. Please sign in again.');
      }
      
      return null;
    } catch (error) {
      console.error(`Token refresh failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Clear stored token
   */
  async clearToken(provider: 'todoist' | 'msToDo'): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${provider}`;
    await secureStorage.removeItem(key);
    console.log(`Token cleared for ${provider}`);
  }

  /**
   * Clear all tokens
   */
  async clearAllTokens(): Promise<void> {
    await Promise.all([
      this.clearToken('todoist'),
      this.clearToken('msToDo')
    ]);
  }

  /**
   * Check if user is authenticated with provider
   */
  async isAuthenticated(provider: 'todoist' | 'msToDo'): Promise<boolean> {
    const token = await this.getValidAccessToken(provider);
    return token !== null;
  }

  /**
   * Get token expiration info for UI display
   */
  async getTokenInfo(provider: 'todoist' | 'msToDo'): Promise<{
    isAuthenticated: boolean;
    expiresAt?: Date;
    needsRefresh?: boolean;
  }> {
    const validation = await this.getToken(provider);
    
    if (!validation.token) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: validation.isValid,
      expiresAt: new Date(validation.token.expires_at),
      needsRefresh: validation.needsRefresh
    };
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(provider: 'todoist' | 'msToDo'): void {
    this.getToken(provider).then(validation => {
      if (!validation.token || !validation.token.refresh_token) {
        return;
      }

      const timeUntilRefresh = validation.token.expires_at - Date.now() - (this.REFRESH_THRESHOLD_MINUTES * 60 * 1000);
      
      if (timeUntilRefresh > 0) {
        setTimeout(async () => {
          try {
            await this.getValidAccessToken(provider); // This will trigger refresh if needed
            console.log(`Auto-refreshed token for ${provider}`);
          } catch (error) {
            console.error(`Auto-refresh failed for ${provider}:`, error);
          }
        }, timeUntilRefresh);
      }
    }).catch(error => {
      console.error(`Failed to schedule token refresh for ${provider}:`, error);
    });
  }
}

export const tokenManager = TokenManager.getInstance();
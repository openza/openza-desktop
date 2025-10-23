import { secureStorage, STORAGE_KEYS } from './secureStorage';

export type TaskProvider = 'todoist' | 'msToDo';

export interface ProviderAuthState {
  isAuthenticated: boolean;
  token: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  activeProvider: TaskProvider | null;
  providers: {
    todoist: ProviderAuthState;
    msToDo: ProviderAuthState;
  };
  // Legacy support for existing components
  token: string | null;
}

class AuthManager {
  private static instance: AuthManager;
  private authState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    activeProvider: null,
    providers: {
      todoist: { isAuthenticated: false, token: null },
      msToDo: { isAuthenticated: false, token: null },
    },
    token: null, // Legacy support
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async initialize(): Promise<AuthState> {
    try {
      const { tokenManager } = await import('./tokenManager');
      
      const storedActiveProvider = await secureStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER);

      // Check if we need to migrate old tokens to TokenManager
      const [oldTodoistToken, oldMsToDoToken] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.TODOIST_TOKEN),
        secureStorage.getItem(STORAGE_KEYS.MSTODO_TOKEN),
      ]);

      // Migrate old Todoist token
      if (oldTodoistToken && !(await tokenManager.isAuthenticated('todoist'))) {
        console.log('Migrating old Todoist token to TokenManager...');
        try {
          const tokenResponse = {
            access_token: oldTodoistToken,
            token_type: 'Bearer',
            expires_in: 86400 * 365, // Todoist tokens are long-lived (1 year)
            scope: 'data:read_write,data:delete,project:delete'
          };
          await tokenManager.storeToken('todoist', tokenResponse);
          await secureStorage.removeItem(STORAGE_KEYS.TODOIST_TOKEN);
          console.log('Todoist token migration completed');
        } catch (migrationError) {
          console.warn('Failed to migrate Todoist token:', migrationError);
          await secureStorage.removeItem(STORAGE_KEYS.TODOIST_TOKEN);
        }
      }

      // Migrate old MS To-Do token
      if (oldMsToDoToken && !(await tokenManager.isAuthenticated('msToDo'))) {
        console.log('Migrating old MS To-Do token to TokenManager...');
        try {
          const tokenResponse = {
            access_token: oldMsToDoToken,
            token_type: 'Bearer',
            expires_in: 3600, // Default 1 hour, will need refresh soon
            scope: 'https://graph.microsoft.com/MailboxSettings.Read https://graph.microsoft.com/offline_access https://graph.microsoft.com/Tasks.Read https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/User.Read'
          };
          await tokenManager.storeToken('msToDo', tokenResponse);
          await secureStorage.removeItem(STORAGE_KEYS.MSTODO_TOKEN);
          console.log('MS To-Do token migration completed');
        } catch (migrationError) {
          console.warn('Failed to migrate MS To-Do token:', migrationError);
          await secureStorage.removeItem(STORAGE_KEYS.MSTODO_TOKEN);
        }
      }

      // Now check authentication status using TokenManager for both providers
      const [todoistAuthenticated, msToDoAuthenticated] = await Promise.all([
        tokenManager.isAuthenticated('todoist'),
        tokenManager.isAuthenticated('msToDo'),
      ]);
      
      // Get actual tokens if authenticated
      const [todoistToken, msToDoToken] = await Promise.all([
        todoistAuthenticated ? tokenManager.getValidAccessToken('todoist') : Promise.resolve(null),
        msToDoAuthenticated ? tokenManager.getValidAccessToken('msToDo') : Promise.resolve(null),
      ]);

      const todoistAuth = { isAuthenticated: todoistAuthenticated, token: todoistToken };
      const msToDoAuth = { isAuthenticated: msToDoAuthenticated, token: msToDoToken };
      
      // Determine active provider based on stored preference
      let activeProvider: TaskProvider | null = null;
      let legacyToken: string | null = null;
      
      // Check if stored active provider is valid and authenticated
      if (storedActiveProvider && (storedActiveProvider === 'todoist' || storedActiveProvider === 'msToDo')) {
        const storedProvider = storedActiveProvider as TaskProvider;
        
        if (storedProvider === 'todoist' && todoistAuth.isAuthenticated) {
          activeProvider = 'todoist';
          legacyToken = todoistToken;
        } else if (storedProvider === 'msToDo' && msToDoAuth.isAuthenticated) {
          activeProvider = 'msToDo';
          legacyToken = msToDoToken;
        }
      }
      
      // Fallback to default behavior if no valid stored preference
      if (!activeProvider) {
        if (todoistAuth.isAuthenticated) {
          activeProvider = 'todoist';
          legacyToken = todoistToken;
        } else if (msToDoAuth.isAuthenticated) {
          activeProvider = 'msToDo';
          legacyToken = msToDoToken;
        }
      }

      this.authState = {
        isAuthenticated: !!(todoistAuth.isAuthenticated || msToDoAuth.isAuthenticated),
        isLoading: false,
        activeProvider,
        providers: {
          todoist: todoistAuth,
          msToDo: msToDoAuth,
        },
        token: legacyToken,
      };
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.authState = {
        isAuthenticated: false,
        isLoading: false,
        activeProvider: null,
        providers: {
          todoist: { isAuthenticated: false, token: null },
          msToDo: { isAuthenticated: false, token: null },
        },
        token: null,
      };
    }
    
    this.notifyListeners();
    return this.authState;
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  async setProviderToken(provider: TaskProvider, token: string): Promise<void> {
    // Both providers now use TokenManager
    console.warn('setProviderToken is deprecated - tokens should be managed by TokenManager or specific auth managers');
    
    try {
      const { tokenManager } = await import('./tokenManager');
      
      const tokenResponse = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: provider === 'todoist' ? 86400 * 365 : 3600, // Todoist: 1 year, MS To-Do: 1 hour
        scope: provider === 'todoist' 
          ? 'data:read_write,data:delete,project:delete'
          : 'https://graph.microsoft.com/MailboxSettings.Read https://graph.microsoft.com/offline_access https://graph.microsoft.com/Tasks.Read https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/User.Read'
      };
      
      await tokenManager.storeToken(provider, tokenResponse);
      
      // Update provider auth state
      this.authState.providers[provider] = {
        isAuthenticated: true,
        token,
      };
    } catch (error) {
      console.error(`Failed to store token for ${provider}:`, error);
      throw error;
    }
    
    // Set as active provider if none exists
    if (!this.authState.activeProvider) {
      this.authState.activeProvider = provider;
      this.authState.token = token; // Legacy support
      
      // Store the active provider preference
      await secureStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
    }
    
    // Update overall auth state
    this.authState.isAuthenticated = true;
    this.authState.isLoading = false;
    
    this.notifyListeners();
  }

  async clearProviderToken(provider: TaskProvider): Promise<void> {
    // Both providers now use TokenManager
    try {
      const { tokenManager } = await import('./tokenManager');
      await tokenManager.clearToken(provider);
    } catch (error) {
      console.warn(`Failed to clear token for ${provider} via TokenManager:`, error);
      // Fallback to old method for backward compatibility
      if (provider === 'todoist') {
        await secureStorage.removeItem(STORAGE_KEYS.TODOIST_TOKEN);
      }
    }
    
    // Update provider auth state
    this.authState.providers[provider] = {
      isAuthenticated: false,
      token: null,
    };
    
    // If this was the active provider, switch to another authenticated provider or clear
    if (this.authState.activeProvider === provider) {
      const otherProvider = provider === 'todoist' ? 'msToDo' : 'todoist';
      if (this.authState.providers[otherProvider].isAuthenticated) {
        this.authState.activeProvider = otherProvider;
        this.authState.token = this.authState.providers[otherProvider].token;
      } else {
        this.authState.activeProvider = null;
        this.authState.token = null;
        this.authState.isAuthenticated = false;
      }
    }
    
    // Update overall auth state
    this.authState.isAuthenticated = !!(
      this.authState.providers.todoist.isAuthenticated || 
      this.authState.providers.msToDo.isAuthenticated
    );
    this.authState.isLoading = false;
    
    this.notifyListeners();
  }

  async setActiveProvider(provider: TaskProvider): Promise<void> {
    if (!this.authState.providers[provider].isAuthenticated) {
      throw new Error(`Cannot set ${provider} as active provider: not authenticated`);
    }
    
    // Store the preference for persistence across sessions
    await secureStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, provider);
    
    this.authState.activeProvider = provider;
    this.authState.token = this.authState.providers[provider].token; // Legacy support
    this.notifyListeners();
  }

  // Legacy methods for backward compatibility
  async setToken(token: string): Promise<void> {
    return this.setProviderToken('todoist', token);
  }

  async clearToken(): Promise<void> {
    return this.clearProviderToken('todoist');
  }

  /**
   * Invalidate authentication for a provider when tokens fail
   * This triggers re-authentication flow
   */
  async invalidateProvider(provider: TaskProvider): Promise<void> {
    console.warn(`Invalidating authentication for ${provider} due to token failure`);
    await this.clearProviderToken(provider);
  }

  subscribe(callback: (state: AuthState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.authState));
  }
}

export const authManager = AuthManager.getInstance();
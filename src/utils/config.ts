export const getEnvVar = (key: keyof ImportMetaEnv, required: boolean = true): string | undefined => {
  const value = import.meta.env[key];
  if (!value && required) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

// Safe config for renderer process - no client secrets
export const config = {
  // Todoist API Configuration (client-side safe values only)
  todoist: {
    clientId: getEnvVar('VITE_TODOIST_CLIENT_ID', false),
    redirectUri: getEnvVar('VITE_REDIRECT_URI', false),
  },
  
  // Microsoft To-Do API Configuration (client-side safe values only)
  msToDo: {
    clientId: getEnvVar('VITE_MSTODO_CLIENT_ID', false),
    redirectUri: getEnvVar('VITE_MSTODO_REDIRECT_URI', false),
    tenantId: getEnvVar('VITE_MSTODO_TENANT_ID', false) || 'common',
    protocolScheme: getEnvVar('VITE_OAUTH_PROTOCOL_SCHEME', false) || 'openza',
    timeoutMinutes: parseInt(getEnvVar('VITE_OAUTH_TIMEOUT_MINUTES', false) || '3', 10),
  }
} as const;

// Secure config utilities for accessing main process config
export const getOAuthConfig = async (provider: 'todoist' | 'msToDo') => {
  if (typeof window !== 'undefined' && window.electron?.config?.getOAuthConfig) {
    const result = await window.electron.config.getOAuthConfig(provider);
    
    // Handle the wrapped response format from IPC
    if (result && typeof result === 'object' && 'success' in result) {
      if (result.success && result.config) {
        return result.config;
      } else {
        throw new Error(result.error || 'Failed to get configuration from main process');
      }
    }
    
    // If result is not in expected format, assume it's the config directly
    return result;
  }
  
  // Fallback for non-Electron environments (development)
  return config[provider];
};

// Secure token exchange using main process
export const exchangeOAuthCode = async (provider: 'todoist' | 'msToDo', code: string, codeVerifier?: string) => {
  if (typeof window !== 'undefined' && window.electron?.config?.exchangeCode) {
    const result = await window.electron.config.exchangeCode(provider, code, codeVerifier || '');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }
  
  throw new Error('OAuth code exchange is only available in Electron environment');
};

// Secure token refresh using main process
export const refreshOAuthToken = async (provider: 'todoist' | 'msToDo', refreshToken: string) => {
  if (typeof window !== 'undefined' && window.electron?.config?.refreshToken) {
    const result = await window.electron.config.refreshToken(provider, refreshToken);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }
  
  throw new Error('OAuth token refresh is only available in Electron environment');
};

import { useState, useEffect } from 'react';
import { authManager } from '../utils/auth';
import type { AuthState } from '../utils/auth';

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());

  useEffect(() => {
    // Initialize auth on first load
    if (authState.isLoading) {
      authManager.initialize().catch((error) => {
        console.error('Auth initialization failed:', error);
      });
    }

    // Subscribe to auth changes
    const unsubscribe = authManager.subscribe(setAuthState);
    return unsubscribe;
  }, [authState.isLoading]);

  return authState;
}
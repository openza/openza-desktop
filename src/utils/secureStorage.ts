// Declare Electron API types for TypeScript
declare global {
  interface Window {
    electron?: {
      secureStorage: {
        set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
        get: (key: string) => Promise<{ success: boolean; value?: string | null; error?: string }>;
        delete: (key: string) => Promise<{ success: boolean; error?: string }>;
        isAvailable: () => Promise<boolean>;
      };
    };
  }
}

class SecureStorage {
  private get isElectron() {
    return typeof window !== 'undefined' && window.electron?.secureStorage;
  }

  private async waitForElectron(timeout = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.isElectron) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    
    try {
      return await window.electron!.secureStorage.isAvailable();
    } catch (error) {
      console.warn('Secure storage availability check failed:', error);
      return false;
    }
  }

  async setItem(key: string, value: string): Promise<boolean> {
    // Wait for Electron to be ready and try secure storage first
    const electronReady = await this.waitForElectron();
    if (electronReady && this.isElectron) {
      try {
        const result = await window.electron!.secureStorage.set(key, value);
        if (result.success) {
          // Remove from localStorage if it exists (migration)
          localStorage.removeItem(key);
          return true;
        }
      } catch (error) {
        console.warn('Secure storage set failed, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage (development or if secure storage fails)
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to store item:', error);
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    // Wait for Electron to be ready and try secure storage first
    const electronReady = await this.waitForElectron();
    if (electronReady && this.isElectron) {
      try {
        const result = await window.electron!.secureStorage.get(key);
        if (result.success && result.value !== null) {
          return result.value;
        }
      } catch (error) {
        console.warn('Secure storage get failed, trying localStorage:', error);
      }
    }

    // Fallback to localStorage or migration
    try {
      const value = localStorage.getItem(key);
      
      // If we found it in localStorage and secure storage is available, migrate it
      if (value && this.isElectron) {
        const migrated = await this.setItem(key, value);
        if (migrated) {
          console.log(`Migrated ${key} from localStorage to secure storage`);
        }
      }
      
      return value;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    let success = true;

    // Wait for Electron and remove from secure storage
    const electronReady = await this.waitForElectron();
    if (electronReady && this.isElectron) {
      try {
        const result = await window.electron!.secureStorage.delete(key);
        if (!result.success) {
          success = false;
        }
      } catch (error) {
        console.warn('Secure storage delete failed:', error);
        success = false;
      }
    }

    // Also remove from localStorage (cleanup/migration)
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage remove failed:', error);
      success = false;
    }

    return success;
  }

  async clear(): Promise<boolean> {
    // Remove all known keys
    const todoistResult = await this.removeItem(STORAGE_KEYS.TODOIST_TOKEN);
    const msToDoResult = await this.removeItem(STORAGE_KEYS.MSTODO_TOKEN);
    const msToDoRefreshResult = await this.removeItem(STORAGE_KEYS.MSTODO_REFRESH_TOKEN);
    return todoistResult && msToDoResult && msToDoRefreshResult;
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export constants for consistent key usage
export const STORAGE_KEYS = {
  TODOIST_TOKEN: 'todoist_access_token',
  MSTODO_TOKEN: 'mstodo_access_token',
  MSTODO_REFRESH_TOKEN: 'mstodo_refresh_token',
  ACTIVE_PROVIDER: 'active_provider',
} as const;
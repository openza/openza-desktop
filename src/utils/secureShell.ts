/**
 * Secure shell utilities for opening external URLs
 * Uses system browser instead of embedded browser for better security
 */

export interface OpenUrlResult {
  success: boolean;
  error?: string;
}

/**
 * Safely open a URL in the system browser
 * Falls back to window.open if Electron API is not available (development/web mode)
 */
export const openExternalUrl = async (url: string): Promise<OpenUrlResult> => {
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }

    // Check if we're in Electron environment
    if (typeof window !== 'undefined' && window.electron?.shell?.openExternal) {
      // Use Electron's secure shell API
      const result = await window.electron.shell.openExternal(url);
      return result;
    } else {
      // Fallback for development or web environments
      console.warn('Electron shell API not available, falling back to window.open');
      
      // Use window.open with security attributes for web fallback
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!opened) {
        return {
          success: false,
          error: 'Failed to open URL - popup blocked or browser restriction'
        };
      }
      
      return { success: true };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to open external URL:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Open Microsoft authentication URL in system browser
 */
export const openMicrosoftAuthUrl = async (authUrl: string): Promise<OpenUrlResult> => {
  return openExternalUrl(authUrl);
};

/**
 * Open Todoist settings page in system browser
 */
export const openTodoistSettings = async (): Promise<OpenUrlResult> => {
  return openExternalUrl('https://todoist.com/prefs/integrations');
};

/**
 * Open Azure Portal for app registration
 */
export const openAzurePortal = async (): Promise<OpenUrlResult> => {
  return openExternalUrl('https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
};

/**
 * Check if secure shell API is available
 */
export const isSecureShellAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.electron?.shell?.openExternal;
};
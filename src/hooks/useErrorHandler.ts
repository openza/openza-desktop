import { useCallback } from 'react';
import { toast } from 'sonner';

export interface ErrorHandlerOptions {
  silent?: boolean;
  showToast?: boolean;
  logError?: boolean;
  context?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: Error | unknown, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      silent = false,
      showToast = true,
      logError = true,
      context = 'unknown'
    } = options;

    // Normalize error
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    
    // Log error
    if (logError) {
      console.error(`Error in ${context}:`, normalizedError);
    }

    // Don't show UI for silent errors
    if (silent) {
      return 'Silent error - no notification shown';
    }

    // Determine user-friendly message
    let userMessage = 'An unexpected error occurred';
    
    if (normalizedError.message.toLowerCase().includes('network')) {
      userMessage = 'Network error. Please check your connection.';
    } else if (normalizedError.message.toLowerCase().includes('oauth')) {
      userMessage = 'Authentication error. Please try signing in again.';
    } else if (normalizedError.message.toLowerCase().includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (normalizedError.message.toLowerCase().includes('permission')) {
      userMessage = 'Permission denied. Please check your access rights.';
    }

    // Show toast notification
    if (showToast) {
      toast.error(userMessage, {
        duration: 5000,
        action: {
          label: 'Dismiss',
          onClick: () => {}
        }
      });
    }

    return userMessage;
  }, []);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw so calling code can handle it
    }
  }, [handleError]);

  const wrapAsync = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: ErrorHandlerOptions = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        return undefined;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    wrapAsync
  };
};
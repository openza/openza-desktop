import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  provider?: 'todoist' | 'msToDo';
  fallback?: ReactNode;
  onRetry?: () => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class OAuthErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OAuth Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error for monitoring (in production, send to error tracking service)
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      provider: this.props.provider,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('OAuth Error Report:', errorReport);
    
    // In production, send to monitoring service
    // errorTracker.captureException(error, { extra: errorReport });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('oauth') || message.includes('authentication')) {
      return 'Authentication Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('timeout')) {
      return 'Timeout Error';
    }
    
    return 'Unknown Error';
  };

  private getErrorSuggestion = (error: Error): string => {
    const message = error.message.toLowerCase();
    const category = this.getErrorCategory(error);
    
    switch (category) {
      case 'Network Error':
        return 'Please check your internet connection and try again.';
      case 'Authentication Error':
        return 'Please sign out and sign in again to refresh your authentication.';
      case 'Permission Error':
        return 'Please check that you have granted the necessary permissions to the app.';
      case 'Timeout Error':
        return 'The request took too long. Please try again.';
      default:
        return 'Please try again. If the problem persists, restart the application.';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const errorCategory = error ? this.getErrorCategory(error) : 'Unknown Error';
      const errorSuggestion = error ? this.getErrorSuggestion(error) : 'Please try again.';
      const canRetry = this.state.retryCount < this.maxRetries;
      const providerName = this.props.provider === 'msToDo' ? 'Microsoft To-Do' : 'Todoist';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {errorCategory}
              </h2>
              
              {this.props.provider && (
                <p className="text-sm text-gray-600 mb-3">
                  There was a problem with {providerName} authentication
                </p>
              )}
              
              <p className="text-sm text-gray-700 mb-4">
                {errorSuggestion}
              </p>
              
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mb-4 text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again {this.state.retryCount > 0 && `(${this.maxRetries - this.state.retryCount} left)`}
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Return to Dashboard
                </button>
                
                {!canRetry && (
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum retry attempts reached. Please restart the application.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier wrapping
export const withOAuthErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  provider?: 'todoist' | 'msToDo'
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <OAuthErrorBoundary provider={provider}>
      <Component {...props} ref={ref} />
    </OAuthErrorBoundary>
  ));
};

// Hook for manual error reporting
export const useOAuthErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    console.error(`OAuth Error${context ? ` in ${context}` : ''}:`, error);
    
    // In production, send to error tracking service
    // errorTracker.captureException(error, { tags: { context: 'oauth' } });
  };

  return { reportError };
};
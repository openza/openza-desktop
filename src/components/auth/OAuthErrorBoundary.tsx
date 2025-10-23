import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import ErrorBoundary from '../ErrorBoundary';

interface OAuthErrorBoundaryProps {
  children: React.ReactNode;
  provider?: string;
  onRetry?: () => void;
}

const OAuthErrorBoundary: React.FC<OAuthErrorBoundaryProps> = ({ 
  children, 
  provider = 'OAuth', 
  onRetry 
}) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log OAuth-specific errors
    console.error(`OAuth Error (${provider}):`, error);
    console.error('Error Info:', errorInfo);

    // You could send this to an error tracking service
    // trackError(`oauth_${provider.toLowerCase()}`, error, errorInfo);
  };

  const customFallback = (error: Error, retry: () => void) => {
    const isOAuthError = error.message.includes('OAuth') || 
                        error.message.includes('authentication') ||
                        error.message.includes('authorization');

    const errorTitle = isOAuthError 
      ? `${provider} Authentication Failed`
      : 'Authentication Error';

    const errorMessage = isOAuthError
      ? `Failed to authenticate with ${provider}. This could be due to network issues, server problems, or invalid credentials.`
      : error.message || 'An authentication error occurred.';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {errorTitle}
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {errorMessage}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                retry();
                onRetry?.();
              }}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>

            <button
              onClick={() => navigate({ to: '/login' })}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Login
            </button>
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                <div className="mb-2">
                  <strong>Error:</strong> {error.name}
                </div>
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 overflow-auto">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary fallback={customFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default OAuthErrorBoundary;
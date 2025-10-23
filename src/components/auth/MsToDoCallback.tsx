import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { msToDoAuthManager } from '../../utils/msToDoAuth';
import { authManager } from '../../utils/auth';
import OAuthErrorBoundary from './OAuthErrorBoundary';

const MsToDoCallbackContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Microsoft To-Do authentication...');

  useEffect(() => {
    console.log('MsToDoCallback component mounted - handling MSAL redirect');
    
    const handleCallback = async () => {
      try {
        setMessage('Processing MSAL authentication...');
        
        // Handle MSAL redirect callback
        const result = await msToDoAuthManager.handleRedirectCallback();
        
        if (result) {
          console.log('MSAL authentication successful!');
          setMessage('Saving access token...');

          // Store the access token in authManager for compatibility
          await authManager.setProviderToken('msToDo', result.accessToken);

          setMessage('Microsoft To-Do connected successfully!');
          setStatus('success');

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate({ to: '/dashboard' });
          }, 2000);
        } else {
          // Check if we're in Electron and have a popup window to close
          if (window.electron) {
            console.log('No MSAL result in Electron - checking for popup completion');
            
            // In Electron, MSAL popup might not return a result but authentication could be successful
            // Check if we have an access token stored
            const isAuthenticated = await msToDoAuthManager.isAuthenticated();
            if (isAuthenticated) {
              console.log('Authentication successful via popup flow');
              setMessage('Microsoft To-Do connected successfully!');
              setStatus('success');
              
              setTimeout(() => {
                navigate({ to: '/dashboard' });
              }, 2000);
            } else {
              setStatus('error');
              setMessage('Authentication was not completed. Please try again.');
            }
          } else {
            // Web environment - no result means this wasn't an OAuth callback
            console.log('No MSAL result - not an OAuth callback');
            setStatus('error');
            setMessage('This page was accessed directly. Please start the authentication process from the login page.');
          }
        }

      } catch (error) {
        console.error('MSAL callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred during authentication');
      }
    };

    handleCallback();
  }, [navigate]);

  const handleGoHome = () => {
    navigate({ to: '/dashboard' });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-sky-100 p-4">
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Connecting Microsoft To-Do...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <p className="text-sm text-center text-gray-700">
              {message}
            </p>
          </div>

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You will be redirected to the dashboard shortly.
              </p>
              <Button
                onClick={handleGoHome}
                variant="outline"
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard Now
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Please try connecting again or check your configuration.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                This may take a few moments...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MsToDoCallback = () => {
  return (
    <OAuthErrorBoundary 
      provider="Microsoft To-Do"
      onRetry={() => window.location.reload()}
    >
      <MsToDoCallbackContent />
    </OAuthErrorBoundary>
  );
};

export default MsToDoCallback;
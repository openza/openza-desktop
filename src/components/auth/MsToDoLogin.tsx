import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Loader2, AlertCircle, Shield } from "lucide-react";
import { msToDoAuthManager } from '../../utils/msToDoAuth';
import { authManager } from '../../utils/auth';
import { openAzurePortal, isSecureShellAvailable } from '../../utils/secureShell';

interface MsToDoLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const MsToDoLogin = ({ onSuccess, onError }: MsToDoLoginProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSecureShell, setIsSecureShell] = useState(false);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        // Check if Microsoft To-Do is properly configured
        const configured = await msToDoAuthManager.isConfigured();
        setIsConfigured(configured);
        // Check if secure shell API is available
        setIsSecureShell(isSecureShellAvailable());
      } catch (error) {
        console.error('Failed to check configuration:', error);
        setIsConfigured(false);
      }
    };
    
    checkConfiguration();
  }, []);

  const handleLogin = async () => {
    if (!isConfigured) {
      const errorMsg = 'Microsoft To-Do integration is not configured. Please check your environment variables.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting MSAL authentication flow...');
      
      // Use MSAL authentication flow
      const result = await msToDoAuthManager.startOAuthFlow();
      
      console.log('MSAL authentication successful!');
      
      // Store the access token in authManager for compatibility
      await authManager.setProviderToken('msToDo', result.accessToken);
      
      console.log('Microsoft To-Do connected successfully!');
      onSuccess?.();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start Microsoft To-Do authentication';
      console.error('MSAL authentication error:', errorMsg);
      
      // Handle specific MSAL errors
      if (errorMsg.includes('Redirecting to OAuth')) {
        // This is expected for web redirect flow - don't show as error
        return;
      }
      
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }
  };

  const handleOpenAzurePortal = async () => {
    const result = await openAzurePortal();
    if (!result.success) {
      setError(result.error || 'Failed to open Azure Portal');
    }
  };

  if (!isConfigured) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span>Microsoft To-Do</span>
          </CardTitle>
          <CardDescription>Configuration Required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Microsoft To-Do integration is not configured</p>
                <p>Please configure the following environment variables:</p>
                <ul className="mt-2 space-y-1 text-xs font-mono">
                  <li>• VITE_MSTODO_CLIENT_ID</li>
                  <li>• VITE_MSTODO_REDIRECT_URI</li>
                  <li>• VITE_MSTODO_TENANT_ID (optional)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAzurePortal}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Register App in Azure Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span>Microsoft To-Do</span>
        </CardTitle>
        <CardDescription>Connect your Microsoft To-Do account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Access to all your To-Do lists</li>
            <li>• Sync tasks across devices</li>
            <li>• Create and edit tasks</li>
            <li>• Manage due dates and priorities</li>
          </ul>
        </div>

        {isSecureShell && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Secure Authentication</p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Opens in your system browser for maximum security
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Waiting for authentication...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Microsoft To-Do
            </>
          )}
        </Button>

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ✓ Browser opened successfully<br/>
              • Complete the Microsoft login in your browser<br/>
              • The app will automatically return here when done<br/>
              • Keep this window open
            </p>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-xs text-gray-600">
            {isSecureShell 
              ? "Opens securely in your system browser. The app will automatically reopen after authorization."
              : "You'll be redirected to Microsoft to authorize access to your To-Do data."
            }
          </p>
          {isSecureShell && (
            <p className="text-xs text-blue-600">
              Uses custom protocol (openza://) for secure callback
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MsToDoLogin;
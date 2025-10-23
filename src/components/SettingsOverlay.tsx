import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ExternalLink, Key, CheckCircle2, AlertCircle, Loader2, Shield, RefreshCw } from "lucide-react";
import { createTodoistClient } from '../utils/todoistClient';
import { msToDoAuthManager } from '../utils/msToDoAuth';
import { authManager } from '../utils/auth';
import { useAuth } from '../hooks/useAuth';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';
import { openTodoistSettings, openMicrosoftAuthUrl } from '../utils/secureShell';
import { useQueryClient } from '@tanstack/react-query';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsOverlay = ({ isOpen, onClose }: SettingsOverlayProps) => {
  const queryClient = useQueryClient();
  const { providers, activeProvider } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isSecureStorageAvailable, setIsSecureStorageAvailable] = useState<boolean | null>(null);
  const [isMsToDoConfigured, setIsMsToDoConfigured] = useState<boolean | null>(null);
  const [authMethod, setAuthMethod] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const loadStoredToken = async () => {
        try {
          // Check if secure storage is available
          const isSecure = await secureStorage.isAvailable();
          setIsSecureStorageAvailable(isSecure);
          
          // Check MS To-Do configuration
          const configured = await msToDoAuthManager.isConfigured();
          setIsMsToDoConfigured(configured);
          
          // Get the stored token using TokenManager
          const { tokenManager } = await import('../utils/tokenManager');
          const isAuthenticated = await tokenManager.isAuthenticated('todoist');
          const token = isAuthenticated ? await tokenManager.getValidAccessToken('todoist') : null;
          
          setCurrentToken(token);
          
          if (token) {
            setApiKey(token);
            setValidationStatus('success');
            setValidationMessage(`Connected to Todoist${isSecure ? ' (Secure)' : ' (Local)'}`);
          }
        } catch (error) {
          console.error('Failed to load stored token:', error);
          setIsSecureStorageAvailable(false);
        }
      };
      
      loadStoredToken();
    }
  }, [isOpen]);

  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      setValidationStatus('error');
      setValidationMessage('Please enter your API token');
      return false;
    }

    setIsValidating(true);
    setValidationStatus('idle');
    
    try {
      const client = createTodoistClient(key);
      await client.getTasks({ limit: 1 }); // Test with minimal request
      
      setValidationStatus('success');
      setValidationMessage('Successfully connected to Todoist!');
      return true;
    } catch (error) {
      setValidationStatus('error');
      setValidationMessage('Invalid API token. Please check and try again.');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      try {
        const { tokenManager } = await import('../utils/tokenManager');
        const tokenResponse = {
          access_token: apiKey,
          token_type: 'Bearer',
          expires_in: 86400 * 365, // Todoist tokens are long-lived (1 year)
          scope: 'data:read_write,data:delete,project:delete'
        };
        
        await tokenManager.storeToken('todoist', tokenResponse);
        setCurrentToken(apiKey);
        const isSecure = await secureStorage.isAvailable();
        setValidationMessage(`Successfully saved${isSecure ? ' (Secure)' : ' (Local)'}!`);
        // Refresh the page to update the app state
        window.location.reload();
      } catch (error) {
        console.error('Failed to save Todoist token:', error);
        setValidationStatus('error');
        setValidationMessage('Failed to save API token');
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      const { tokenManager } = await import('../utils/tokenManager');
      await tokenManager.clearToken('todoist');
      setCurrentToken(null);
      setApiKey('');
      setValidationStatus('idle');
      setValidationMessage('');
      // Refresh the page to update the app state
      window.location.reload();
    } catch (error) {
      console.error('Failed to disconnect Todoist:', error);
      setValidationStatus('error');
      setValidationMessage('Failed to remove API token');
    }
  };

  const handleMsToDoConnect = async () => {
    const isConfigured = await msToDoAuthManager.isConfigured();
    if (!isConfigured) {
      setValidationStatus('error');
      setValidationMessage('Microsoft To-Do integration is not configured. Please check your environment variables.');
      return;
    }

    try {
      console.log('Environment check in SettingsOverlay:', {
        hasElectron: !!window.electron,
        hasOAuth: !!window.electron?.oauth,
        userAgent: navigator.userAgent
      });

      // Check if we're in Electron
      if (window.electron) {
        console.log('Using Electron OAuth flow in SettingsOverlay');
        
        // Set initial validation state with enhanced messaging
        setValidationStatus('idle');
        setValidationMessage('Connecting to Microsoft To-Do...');
        setAuthMethod('Trying secure authentication method...');
        
        // Use the new MSAL OAuth flow with fallback support
        const result = await msToDoAuthManager.startOAuthFlowWithFallback();
        
        console.log('MSAL OAuth successful, access token received:', !!result.access_token);
        setAuthMethod('');
        
        if (!result.access_token) {
          throw new Error('No access token received from MSAL authentication');
        }
        
        // Store the access token
        await authManager.setProviderToken('msToDo', result.access_token);
        
        // Small delay to ensure TaskSourceContext updates before query invalidation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force React Query to refetch all task-related queries
        await queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
        await queryClient.invalidateQueries({ queryKey: ['mstodo'] });
        
        setValidationStatus('success');
        setValidationMessage('Microsoft To-Do connected successfully!');
        
        // Close settings overlay after successful connection
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Web environment - use external browser
        console.log('Using external browser OAuth flow in SettingsOverlay');
        const authUrl = await msToDoAuthManager.getAuthorizationUrl();
        const result = await openMicrosoftAuthUrl(authUrl);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to open authentication URL');
        }
        
        setValidationStatus('success');
        setValidationMessage('Authentication opened in your system browser. Return here after authorization.');
      }
    } catch (error) {
      console.error('SettingsOverlay OAuth error:', error);
      setAuthMethod(''); // Clear loading state
      setValidationStatus('error');
      setValidationMessage(error instanceof Error ? error.message : 'Failed to start Microsoft To-Do authentication');
    }
  };

  const handleMsToDoDisconnect = async () => {
    try {
      await authManager.clearProviderToken('msToDo');
      // Refresh the page to update the app state
      window.location.reload();
    } catch (error) {
      setValidationStatus('error');
      setValidationMessage('Failed to disconnect Microsoft To-Do');
    }
  };

  const handleSetActiveProvider = async (provider: 'todoist' | 'msToDo') => {
    try {
      await authManager.setActiveProvider(provider);
      // Refresh to update the app state
      window.location.reload();
    } catch (error) {
      setValidationStatus('error');
      setValidationMessage(`Failed to switch to ${provider}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Settings</CardTitle>
              <CardDescription>Manage your Openza preferences</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Active Provider Section */}
          {(providers.todoist.isAuthenticated || providers.msToDo.isAuthenticated) && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Active Provider</h3>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800 mb-3">
                  Current active provider: <span className="font-medium">
                    {activeProvider === 'todoist' ? 'Todoist' : activeProvider === 'msToDo' ? 'Microsoft To-Do' : 'None'}
                  </span>
                </p>
                
                <div className="flex space-x-2">
                  {providers.todoist.isAuthenticated && (
                    <Button
                      variant={activeProvider === 'todoist' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetActiveProvider('todoist')}
                      disabled={activeProvider === 'todoist'}
                    >
                      Use Todoist
                    </Button>
                  )}
                  
                  {providers.msToDo.isAuthenticated && (
                    <Button
                      variant={activeProvider === 'msToDo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetActiveProvider('msToDo')}
                      disabled={activeProvider === 'msToDo'}
                    >
                      Use Microsoft To-Do
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Todoist Integration Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Todoist Integration</h3>
              </div>
              {isSecureStorageAvailable !== null && (
                <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                  isSecureStorageAvailable 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Shield className="h-3 w-3" />
                  <span>{isSecureStorageAvailable ? 'Secure Storage' : 'Local Storage'}</span>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How to get your API token:</h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4">
                <li>1. Go to Todoist Settings → Integrations</li>
                <li>2. Copy your API token</li>
                <li>3. Paste it below and click Save</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={() => openTodoistSettings()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Todoist Settings
              </Button>
            </div>

            <div className="space-y-3">
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
                API Token
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your Todoist API token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isValidating}
              />
              
              {validationStatus !== 'idle' && (
                <div className={`flex items-center space-x-2 text-sm ${
                  validationStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validationStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{validationMessage}</span>
                </div>
              )}
              
              {authMethod && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{authMethod}</span>
                </div>
              )}
              
              <div className="flex space-x-3">
                <Button
                  onClick={handleSave}
                  disabled={isValidating || !apiKey.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Save & Connect'
                  )}
                </Button>
                
                {currentToken && (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Microsoft To-Do Integration Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">M</span>
                </div>
                <h3 className="text-lg font-semibold">Microsoft To-Do Integration</h3>
              </div>
              <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                providers.msToDo.isAuthenticated 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                <span>{providers.msToDo.isAuthenticated ? 'Connected' : 'Not Connected'}</span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">OAuth 2.0 Authentication:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Secure authentication with your Microsoft account</p>
                <p>• Access to all your task lists and categories</p>
                <p>• No need to manage API tokens manually</p>
                <p>• Automatic token refresh and management</p>
              </div>
              
              {isMsToDoConfigured === false && (
                <div className="mt-3 p-3 bg-amber-100 border border-amber-200 rounded">
                  <p className="text-xs text-amber-800">
                    <strong>Configuration required:</strong> Please set up Microsoft Graph API credentials in your environment variables.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {providers.msToDo.isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Connected to Microsoft To-Do</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleMsToDoDisconnect}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Disconnect Microsoft To-Do
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleMsToDoConnect}
                  disabled={isMsToDoConfigured !== true}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Microsoft To-Do
                </Button>
              )}
            </div>
          </div>

          {/* App Information Section */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">About Openza</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>Version: 1.0.0</p>
              <p>A beautiful desktop client for Todoist built with modern web technologies.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsOverlay;
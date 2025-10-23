import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, ExternalLink } from "lucide-react";
import MsToDoLogin from './MsToDoLogin';
import { useAuth } from '../../hooks/useAuth';

const ProviderSelection = () => {
  const [selectedProvider, setSelectedProvider] = useState<'todoist' | 'msToDo' | null>(null);
  const { providers } = useAuth();

  if (selectedProvider === 'msToDo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-sky-100 p-4">
        <div className="space-y-4">
          <MsToDoLogin 
            onSuccess={() => {
              // Will be redirected by the auth flow
            }}
            onError={(error) => {
              console.error('MS To-Do login error:', error);
            }}
          />
          <Button
            variant="outline"
            onClick={() => setSelectedProvider(null)}
            className="w-full"
          >
            Back to Provider Selection
          </Button>
        </div>
      </div>
    );
  }

  const openTodoistSettings = () => {
    // Open the main settings overlay which has Todoist integration
    window.dispatchEvent(new CustomEvent('openSettings'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-sky-100 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
            <CheckSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Openza</h1>
          <p className="text-gray-600">Connect your task management service to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Todoist Card */}
          <Card className="bg-white/80 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl">Todoist</span>
                  {providers.todoist.isAuthenticated && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Connect with your existing Todoist account using an API token.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Full project and label support</li>
                  <li>• Advanced filtering and due dates</li>
                  <li>• Karma and productivity tracking</li>
                  <li>• Comments and file attachments</li>
                </ul>
              </div>

              <Button 
                onClick={openTodoistSettings}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {providers.todoist.isAuthenticated ? 'Manage Todoist' : 'Connect Todoist'}
              </Button>
            </CardContent>
          </Card>

          {/* Microsoft To-Do Card */}
          <Card className="bg-white/80 backdrop-blur-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">M</span>
                </div>
                <div>
                  <span className="text-xl">Microsoft To-Do</span>
                  {providers.msToDo.isAuthenticated && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Connect with your Microsoft account using secure OAuth authentication.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Multiple task lists and categories</li>
                  <li>• Due dates and importance levels</li>
                  <li>• Shared lists with team members</li>
                  <li>• Integration with Microsoft 365</li>
                </ul>
              </div>

              <Button 
                onClick={() => setSelectedProvider('msToDo')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {providers.msToDo.isAuthenticated ? 'Manage Microsoft To-Do' : 'Connect Microsoft To-Do'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {(providers.todoist.isAuthenticated || providers.msToDo.isAuthenticated) && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              You can connect multiple services and switch between them anytime.
            </p>
            <Button 
              onClick={() => window.location.href = '#/dashboard'}
              variant="outline"
              size="lg"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderSelection;
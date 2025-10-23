import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Calendar, BarChart3, Target, Settings } from "lucide-react";
import SettingsOverlay from './SettingsOverlay';

const FeaturePreview = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };

    window.addEventListener('openSettings', handleOpenSettings);
    return () => window.removeEventListener('openSettings', handleOpenSettings);
  }, []);

  const features = [
    {
      icon: CheckSquare,
      title: "View all your tasks",
      description: "Organize and manage your Todoist tasks in a beautiful interface"
    },
    {
      icon: Calendar,
      title: "Track by projects",
      description: "Group tasks by projects with color-coded organization"
    },
    {
      icon: Target,
      title: "Focus on next actions",
      description: "See what needs your attention with smart filtering"
    },
    {
      icon: BarChart3,
      title: "Track progress",
      description: "Monitor your productivity with overdue and today views"
    }
  ];

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-sky-100 p-4">
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur-lg shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">O</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-800">
            🚀 Ready to boost your productivity?
          </CardTitle>
          <CardDescription className="text-slate-600 text-lg pt-2">
            Connect your Todoist account to get started with Openza
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button
              onClick={handleOpenSettings}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8"
            >
              <Settings className="mr-2 h-5 w-5" />
              Connect in Settings
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              You'll need your Todoist API token to get started
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Overlay */}
      <SettingsOverlay 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default FeaturePreview;
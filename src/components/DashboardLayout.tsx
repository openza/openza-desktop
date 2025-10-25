import React, { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Button } from "@/components/ui/button.tsx";
import {
  LayoutDashboard,
  CheckSquare,
  Settings,
  Calendar,
  AlertCircle,
  Tags
} from "lucide-react";
import { cn } from "@/lib/utils";
import Projects from './Projects';
import SettingsOverlay from './SettingsOverlay';
import TaskSourceSelector from './TaskSourceSelector';
import { CreateTaskButton } from './CreateTaskModal';
import logoSvg from '@/assets/logo.svg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Next Actions",
    href: "/next-action",
    icon: Tags,
  },
  {
    title: "Today",
    href: "/today",
    icon: Calendar,
  },
  {
    title: "Overdue",
    href: "/overdue",
    icon: AlertCircle,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/next-action':
        return 'Next Actions';
      case '/today':
        return 'Today';
      case '/overdue':
        return 'Overdue';
      case '/tasks':
        return 'Tasks';
      case '/profile':
        return 'Profile';
      case '/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };


  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSettingsOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-60 xl:w-64 bg-white border-r flex flex-col shadow-lg">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 py-2">
            {/* Header with Avatar */}
            <div className="px-3 py-1">
              <div className="flex items-center justify-between mb-2 px-4 pb-4 border-b">
                <img src={logoSvg} alt="Openza" className="h-8 w-auto" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSettingsClick}
                  className="rounded-full hover:bg-gray-100"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </Button>
              </div>

              {/* Create Task Button */}
              <div className="px-2 mb-3">
                <CreateTaskButton
                  variant="primary"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                />
              </div>

              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      "hover:bg-gray-100"
                    )}
                    asChild
                  >
                    <Link to={item.href} className="flex items-center w-full">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Projects Section */}
            <div className="border-t pt-4">
              <Projects />
            </div>
          </div>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm px-4 xl:px-6 py-2 flex justify-between items-center flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
          <TaskSourceSelector />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-3 xl:p-4">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Settings Overlay */}
      <SettingsOverlay 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default DashboardLayout;
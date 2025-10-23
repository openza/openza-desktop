import { useQuery } from '@tanstack/react-query';
import { getAllProjects } from '../utils/todoistClient';
import type { Project } from '@doist/todoist-api-typescript';
import { Button } from './ui/button';
import { ChevronDown, ChevronRight, Folder, Star, Inbox, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useUnifiedTasks } from '../hooks/useUnifiedTasks';
import type { Project as UnifiedProject } from '../types/database';

interface ProjectsProps {
  className?: string;
}

const Projects: React.FC<ProjectsProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isAuthenticated, activeProvider } = useAuth();

  // Use unified projects that respect the active provider
  const { data: unifiedData, isLoading, error } = useUnifiedTasks(
    ['projects-sidebar'],
    { provider: activeProvider || undefined }
  );

  const projects = unifiedData?.projects || [];


  if (isLoading) {
    return (
      <div className={cn("px-3 py-2", className)}>
        <div className="text-sm text-gray-500">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("px-3 py-2", className)}>
        <div className="text-sm text-red-500">Error loading projects</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className={cn("space-y-1", className)}>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-100 h-7 xl:h-8 px-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="mr-2 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4" />
          )}
          <span className="font-medium text-xs sm:text-sm">Projects</span>
          <span className="ml-auto text-xs text-gray-500">0</span>
        </Button>
      </div>
    );
  }

  // Sort projects: favorites first, then by name
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const getProjectIcon = (project: UnifiedProject) => {
    // Check if it's a Microsoft To-Do project by looking at the id prefix
    if (project.id.startsWith('mstodo_list_')) {
      return Folder; // MS To-Do projects are all folders for now
    }
    
    // For Todoist projects, check original data
    const todoistData = project.integrations?.todoist;
    if (todoistData?.is_inbox_project) return Inbox;
    if (todoistData?.is_shared) return Users;
    return Folder;
  };

  const getProjectColor = (project: UnifiedProject) => {
    // Use the unified project color if available
    if (project.color) {
      return `text-[${project.color}]`;
    }
    
    // Fallback to Todoist color mapping for legacy projects
    const colorName = project.integrations?.todoist?.color || 'grey';
    const colorMap: Record<string, string> = {
      berry_red: 'text-red-500',
      red: 'text-red-500',
      orange: 'text-orange-500',
      yellow: 'text-yellow-500',
      olive_green: 'text-green-600',
      lime_green: 'text-green-500',
      green: 'text-green-500',
      mint_green: 'text-green-400',
      teal: 'text-teal-500',
      sky_blue: 'text-sky-500',
      light_blue: 'text-blue-400',
      blue: 'text-blue-500',
      grape: 'text-purple-500',
      violet: 'text-violet-500',
      lavender: 'text-purple-400',
      magenta: 'text-pink-500',
      salmon: 'text-pink-400',
      charcoal: 'text-gray-600',
      grey: 'text-gray-500',
      taupe: 'text-gray-600',
    };
    return colorMap[colorName] || 'text-gray-500';
  };

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        variant="ghost"
        className="w-full justify-start text-gray-700 hover:bg-gray-100 h-7 xl:h-8 px-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="mr-2 h-4 w-4" />
        ) : (
          <ChevronRight className="mr-2 h-4 w-4" />
        )}
        <span className="font-medium text-xs sm:text-sm">Projects</span>
        <span className="ml-auto text-xs text-gray-500">{projects.length}</span>
      </Button>

      {isExpanded && (
        <div className="ml-2 xl:ml-3 space-y-0.5">
          {sortedProjects.map((project) => {
            const ProjectIcon = getProjectIcon(project);
            return (
              <Button
                key={project.id}
                variant="ghost"
                className="w-full justify-start text-sm h-7 xl:h-8 font-normal hover:bg-gray-100 px-2"
                asChild
              >
                <Link to="/tasks" search={{ projectId: project.id }}>
                  <ProjectIcon 
                    className={cn(
                      "mr-2 h-3 w-3",
                      getProjectColor(project)
                    )} 
                  />
                  <span className="flex-1 text-left text-xs sm:text-sm break-words">{project.name}</span>
                  {project.is_favorite && (
                    <Star className="ml-1 h-3 w-3 text-yellow-500 fill-current" />
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Projects;
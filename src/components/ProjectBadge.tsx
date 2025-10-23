import type { Project } from '@doist/todoist-api-typescript';
import { Folder, Inbox, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectBadgeProps {
  project: Project;
  variant?: 'badge' | 'text' | 'full';
  className?: string;
}

const ProjectBadge: React.FC<ProjectBadgeProps> = ({ 
  project, 
  variant = 'badge',
  className 
}) => {
  const getProjectIcon = (project: Project) => {
    if (project.isInboxProject) return Inbox;
    if (project.isShared) return Users;
    return Folder;
  };

  const getProjectColor = (colorName: string) => {
    // Todoist color mapping for badges and text
    const colorMap: Record<string, { bg: string, text: string, border: string }> = {
      berry_red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      olive_green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
      lime_green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      mint_green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
      sky_blue: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
      light_blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      grape: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
      lavender: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      magenta: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
      salmon: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
      charcoal: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
      grey: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
      taupe: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    };
    return colorMap[colorName] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  };

  const colors = getProjectColor(project.color);
  const ProjectIcon = getProjectIcon(project);

  if (variant === 'badge') {
    return (
      <span 
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
          colors.bg,
          colors.text,
          colors.border,
          className
        )}
      >
        <ProjectIcon className="w-3 h-3 mr-1" />
        {project.name}
      </span>
    );
  }

  if (variant === 'text') {
    return (
      <span 
        className={cn(
          'inline-flex items-center text-xs',
          colors.text,
          className
        )}
      >
        <ProjectIcon className="w-3 h-3 mr-1" />
        {project.name}
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div 
        className={cn(
          'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border',
          colors.bg,
          colors.text,
          colors.border,
          className
        )}
      >
        <ProjectIcon className="w-4 h-4 mr-2" />
        <span>{project.name}</span>
        {project.isFavorite && (
          <span className="ml-1 text-yellow-500">★</span>
        )}
      </div>
    );
  }

  return null;
};

export default ProjectBadge;
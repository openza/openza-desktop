import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, Project } from '../types/database';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import TaskDetail from './TaskDetail';

interface TaskTabsProps {
  openTasks: Task[];
  activeTaskId: string | null;
  projects?: Project[];
  onTaskSwitch: (taskId: string) => void;
  onTaskClose: (taskId: string) => void;
  className?: string;
}

const TaskTabs: React.FC<TaskTabsProps> = ({
  openTasks,
  activeTaskId,
  projects = [],
  onTaskSwitch,
  onTaskClose,
  className = ''
}) => {
  // Create project map for quick lookups
  const projectMap = React.useMemo(() => {
    return new Map(projects.map(project => [project.id, project]));
  }, [projects]);

  // Deduplicate openTasks to prevent React key conflicts
  const deduplicatedTasks = React.useMemo(() => {
    const seen = new Set();
    return openTasks.filter(task => {
      if (seen.has(task.id)) {
        return false;
      }
      seen.add(task.id);
      return true;
    });
  }, [openTasks]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W or Cmd+W to close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTaskId) {
          onTaskClose(activeTaskId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTaskId, onTaskClose]);

  if (deduplicatedTasks.length === 0) {
    return null;
  }

  // If only one task is open, show it without tabs
  if (deduplicatedTasks.length === 1) {
    const task = deduplicatedTasks[0];
    const project = projectMap.get(task.project_id || '');
    
    return (
      <div className={className}>
        <TaskDetail 
          task={task} 
          onClose={() => onTaskClose(task.id)} 
          project={project}
        />
      </div>
    );
  }

  const truncateTitle = (title: string | undefined, maxLength: number = 20) => {
    if (!title) return 'Untitled Task';
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className={className}>
      <Tabs 
        value={activeTaskId || deduplicatedTasks[0]?.id} 
        onValueChange={onTaskSwitch}
        className="h-full flex flex-col"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {deduplicatedTasks.map((task, index) => (
            <TabsTrigger 
              key={`trigger-${task.id}-${index}`} 
              value={task.id}
              className="relative group flex items-center gap-2 min-w-0"
            >
              <span className="truncate max-w-[150px]">
                {truncateTitle(task.title)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClose(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600 rounded-sm p-0.5 ml-1"
                title="Close tab"
              >
                <X size={12} />
              </button>
            </TabsTrigger>
          ))}
        </TabsList>

        {deduplicatedTasks.map((task, index) => {
          const project = projectMap.get(task.project_id || '');
          
          return (
            <TabsContent 
              key={`content-${task.id}-${index}`} 
              value={task.id}
              className="flex-1 mt-4 overflow-hidden"
            >
              <TaskDetail 
                task={task} 
                onClose={() => onTaskClose(task.id)} 
                project={project}
                hideCloseButton={true} // Hide the close button since tabs handle closing
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default TaskTabs;
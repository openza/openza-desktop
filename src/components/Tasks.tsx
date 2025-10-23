import { useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Task } from '../types/database';
import TasksWithTabs from './TasksWithTabs';
import { useGlobalTasks } from '../hooks/useGlobalTasks';
const Tasks = () => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const search = useSearch({ from: '/tasks' });
  const projectId = (search as any)?.projectId;

  const { tasks, projects, isLoading, error } = useGlobalTasks(projectId);


  // Create proper filter based on projectId
  const taskFilter = projectId ? { type: 'project' as const, projectId } : 'all' as const;
  const pageTitle = projectId 
    ? projects.find(p => p.id === projectId)?.name || 'Project Tasks'
    : 'Tasks';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <p className="mb-2">Error loading tasks:</p>
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        ) : (
          <TasksWithTabs
            tasks={tasks}
            projects={projects}
            filter={taskFilter}
            title={pageTitle}
            emptyMessage="No tasks found"
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

export default Tasks;
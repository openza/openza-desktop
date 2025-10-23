import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useTaskSource } from '../contexts/TaskSourceContext';
import { useUnifiedTasks } from './useUnifiedTasks';
import { useTasks, useProjects } from './useDatabase';
import { useErrorHandler } from './useErrorHandler';
import type { Task, Project } from '../types/database';

interface GlobalTasksData {
  tasks: Task[];
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook that provides unified task data respecting the global task source selection
 * This hook should be used by all task-displaying components (Tasks, Today, Overdue, etc.)
 */
export const useGlobalTasks = (projectId?: string): GlobalTasksData => {
  const { activeProvider } = useAuth();
  const { taskSource } = useTaskSource();
  
  // Error handling
  const { handleError } = useErrorHandler({
    source: 'useGlobalTasks',
    onError: (error) => {
      // Could send to error tracking service
      console.warn('Global tasks error:', error);
    }
  });

  // Local database tasks
  const { data: localTasks, isLoading: localLoading, error: localError } = useTasks(
    projectId ? { project_id: projectId } : {}
  );
  const { data: localProjects, isLoading: localProjectsLoading } = useProjects();

  // Unified provider tasks (Todoist, Microsoft To-Do, etc.)
  const { data: unifiedData, isLoading: unifiedLoading, error: unifiedError } = useUnifiedTasks(
    ['global-tasks', projectId || 'all'],
    { 
      includeAllProviders: taskSource === 'all',
      provider: taskSource === 'provider' && activeProvider ? activeProvider : undefined
    }
  );

  // Combine tasks based on selected source
  const tasks = useMemo((): Task[] => {
    let result: Task[] = [];
    
    switch (taskSource) {
      case 'local':
        result = localTasks || [];
        break;
      case 'provider':
        result = unifiedData?.tasks || [];
        break;
      case 'all':
        const local = localTasks || [];
        const unified = unifiedData?.tasks || [];
        result = [...local, ...unified];
        break;
      default:
        result = [];
    }
    
    // Apply project filtering if a project is selected
    if (projectId) {
      return result.filter(task => task.project_id === projectId);
    }
    
    return result;
  }, [taskSource, localTasks, unifiedData?.tasks, projectId]);

  // Combine projects based on selected source
  const projects = useMemo((): Project[] => {
    switch (taskSource) {
      case 'local':
        return localProjects || [];
      case 'provider':
        return unifiedData?.projects || [];
      case 'all':
        const local = localProjects || [];
        const unified = unifiedData?.projects || [];
        return [...local, ...unified];
      default:
        return [];
    }
  }, [taskSource, localProjects, unifiedData?.projects]);

  // Determine loading state
  const isLoading = useMemo(() => {
    switch (taskSource) {
      case 'local':
        return localLoading || localProjectsLoading;
      case 'provider':
        return unifiedLoading;
      case 'all':
        return localLoading || localProjectsLoading || unifiedLoading;
      default:
        return false;
    }
  }, [taskSource, localLoading, localProjectsLoading, unifiedLoading]);

  // Determine error state with consistent error handling
  const error = useMemo(() => {
    let sourceError: Error | null = null;
    
    switch (taskSource) {
      case 'local':
        sourceError = localError;
        break;
      case 'provider':
        sourceError = unifiedError;
        break;
      case 'all':
        sourceError = localError || unifiedError;
        break;
      default:
        sourceError = null;
    }
    
    // Handle and normalize the error
    if (sourceError) {
      // Skip authentication errors - they're handled by the auth system
      const errorMessage = sourceError instanceof Error ? sourceError.message : String(sourceError);
      if (errorMessage.includes('No Microsoft To-Do access token') || 
          errorMessage.includes('No Todoist access token') ||
          errorMessage.includes('Please sign in again') ||
          errorMessage.includes('Authentication session expired')) {
        return null; // Don't treat auth errors as application errors
      }
      
      const userMessage = handleError(sourceError, { context: `Failed to load tasks from ${taskSource}` });
      return new Error(userMessage);
    }
    
    return null;
  }, [taskSource, localError, unifiedError, handleError]);

  return {
    tasks,
    projects,
    isLoading,
    error,
  };
};
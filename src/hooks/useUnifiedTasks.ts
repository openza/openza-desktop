import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useConvertedTasks } from './useConvertedTasks';
import { useMsToDoTasks } from './useMsToDoTasks';
import type { Task, Project, Label } from '../types/database';
import type { TaskProvider } from '../utils/auth';

export interface UnifiedTaskData {
  tasks: Task[];
  projects: Project[];
  labels: Label[];
  activeProvider: TaskProvider | null;
  availableProviders: TaskProvider[];
}

export interface UseUnifiedTasksOptions {
  provider?: TaskProvider;
  includeAllProviders?: boolean;
}

/**
 * Custom hook that provides unified access to tasks from all configured providers
 * Can be used to get data from the active provider or from all providers
 */
export const useUnifiedTasks = (
  queryKey: string[] = ['unified-tasks'],
  options: UseUnifiedTasksOptions = {}
) => {
  const { activeProvider, providers } = useAuth();
  const { provider: forcedProvider, includeAllProviders = false } = options;

  // Determine which provider(s) to use
  const targetProvider = forcedProvider || activeProvider;
  
  // Get available providers
  const availableProviders = useMemo(() => {
    const available: TaskProvider[] = [];
    if (providers.todoist.isAuthenticated) available.push('todoist');
    if (providers.msToDo.isAuthenticated) available.push('msToDo');
    return available;
  }, [providers]);

  // Fetch data from Todoist
  const todoistQuery = useConvertedTasks([...queryKey, 'todoist']);
  
  // Fetch data from Microsoft To-Do
  const msToDoQuery = useMsToDoTasks([...queryKey, 'mstodo']);

  // Determine loading and error states
  const isLoading = useMemo(() => {
    if (includeAllProviders) {
      return (
        (providers.todoist.isAuthenticated && todoistQuery.isLoading) ||
        (providers.msToDo.isAuthenticated && msToDoQuery.isLoading)
      );
    }
    
    if (targetProvider === 'todoist') {
      return providers.todoist.isAuthenticated && todoistQuery.isLoading;
    }
    
    if (targetProvider === 'msToDo') {
      return providers.msToDo.isAuthenticated && msToDoQuery.isLoading;
    }
    
    return false;
  }, [includeAllProviders, targetProvider, providers, todoistQuery.isLoading, msToDoQuery.isLoading]);

  const error = useMemo(() => {
    if (includeAllProviders) {
      return todoistQuery.error || msToDoQuery.error;
    }
    
    if (targetProvider === 'todoist') {
      return todoistQuery.error;
    }
    
    if (targetProvider === 'msToDo') {
      return msToDoQuery.error;
    }
    
    return null;
  }, [includeAllProviders, targetProvider, todoistQuery.error, msToDoQuery.error]);

  // Combine data from all sources
  const data = useMemo((): UnifiedTaskData | null => {
    const result: UnifiedTaskData = {
      tasks: [],
      projects: [],
      labels: [],
      activeProvider: targetProvider,
      availableProviders,
    };

    if (includeAllProviders) {
      // Combine data from all authenticated providers
      if (providers.todoist.isAuthenticated && todoistQuery.data) {
        result.tasks.push(...todoistQuery.data.tasks);
        result.projects.push(...todoistQuery.data.projects);
        result.labels.push(...todoistQuery.data.labels);
      }
      
      if (providers.msToDo.isAuthenticated && msToDoQuery.data) {
        result.tasks.push(...msToDoQuery.data.tasks);
        result.projects.push(...msToDoQuery.data.projects);
        result.labels.push(...msToDoQuery.data.labels);
      }
    } else {
      // Use data from the target provider only
      let sourceData = null;
      
      if (targetProvider === 'todoist' && todoistQuery.data) {
        sourceData = todoistQuery.data;
      } else if (targetProvider === 'msToDo' && msToDoQuery.data) {
        sourceData = msToDoQuery.data;
      }
      
      if (sourceData) {
        result.tasks = sourceData.tasks;
        result.projects = sourceData.projects;
        result.labels = sourceData.labels;
      }
    }

    // Sort tasks by creation date (most recent first)
    result.tasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Sort projects by name
    result.projects.sort((a, b) => a.name.localeCompare(b.name));

    // Sort labels by name
    result.labels.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [
    includeAllProviders,
    targetProvider,
    availableProviders,
    providers,
    todoistQuery.data,
    msToDoQuery.data,
  ]);

  return {
    data,
    isLoading,
    error,
    // Helper methods
    refetch: () => {
      if (includeAllProviders || targetProvider === 'todoist') {
        todoistQuery.refetch?.();
      }
      if (includeAllProviders || targetProvider === 'msToDo') {
        msToDoQuery.refetch?.();
      }
    },
    // Provider-specific data access
    todoistData: todoistQuery.data,
    msToDoData: msToDoQuery.data,
  };
};

/**
 * Hook to get tasks from a specific provider
 */
export const useProviderTasks = (provider: TaskProvider, queryKey: string[] = []) => {
  return useUnifiedTasks([...queryKey, provider], { provider });
};

/**
 * Hook to get tasks from all available providers
 */
export const useAllProviderTasks = (queryKey: string[] = []) => {
  return useUnifiedTasks([...queryKey, 'all'], { includeAllProviders: true });
};

/**
 * Hook to check provider availability and status
 */
export const useProviderStatus = () => {
  const { providers, activeProvider } = useAuth();
  
  return {
    activeProvider,
    available: {
      todoist: providers.todoist.isAuthenticated,
      msToDo: providers.msToDo.isAuthenticated,
    },
    hasAnyProvider: providers.todoist.isAuthenticated || providers.msToDo.isAuthenticated,
    hasMultipleProviders: providers.todoist.isAuthenticated && providers.msToDo.isAuthenticated,
  };
};
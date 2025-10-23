// React hooks for database operations using TanStack Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Task,
  Project,
  CreateTaskData,
  UpdateTaskData,
  CreateProjectData,
  TaskFilters,
  ProjectFilters,
  TaskStatistics,
} from '../types/database.js';

// Query keys for consistent caching
export const QUERY_KEYS = {
  tasks: (filters?: TaskFilters) => ['tasks', filters],
  task: (id: string) => ['task', id],
  projects: (filters?: ProjectFilters) => ['projects', filters],
  project: (id: string) => ['project', id],
  statistics: () => ['statistics'],
  search: (term: string) => ['search', term],
  todayTasks: () => ['tasks', 'today'],
  overdueTasks: () => ['tasks', 'overdue'],
  upcomingTasks: (days?: number) => ['tasks', 'upcoming', days],
  tasksByProject: (projectId: string) => ['tasks', 'project', projectId],
  completedTasks: (limit?: number) => ['tasks', 'completed', limit],
  tasksByContext: (context: string) => ['tasks', 'context', context],
  highPriorityTasks: () => ['tasks', 'high-priority'],
  tasksByIntegration: (integration: string) => ['tasks', 'integration', integration],
} as const;

// Task hooks
export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.tasks(filters),
    queryFn: async () => {
      const result = await window.electron.database.getTasks(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tasks');
      }
      return result.data!;
    },
    staleTime: Infinity, // Data is local, always fresh
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.task(id),
    queryFn: async () => {
      const result = await window.electron.database.getTaskById(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch task');
      }
      return result.data!;
    },
    staleTime: Infinity,
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      const result = await window.electron.database.createTask(taskData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }
      return result.data!;
    },
    onSuccess: (newTask) => {
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Add to specific task cache
      queryClient.setQueryData(QUERY_KEYS.task(newTask.id), newTask);
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTaskData }) => {
      const result = await window.electron.database.updateTask(id, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      return result.data!;
    },
    onSuccess: (updatedTask) => {
      // Update specific task cache
      queryClient.setQueryData(QUERY_KEYS.task(updatedTask.id), updatedTask);
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electron.database.deleteTask(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task');
      }
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from specific task cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.task(deletedId) });
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics() });
    },
  });
}

// Project hooks
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.projects(filters),
    queryFn: async () => {
      const result = await window.electron.database.getProjects(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch projects');
      }
      return result.data!;
    },
    staleTime: Infinity,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.project(id),
    queryFn: async () => {
      const result = await window.electron.database.getProjectById(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch project');
      }
      return result.data!;
    },
    staleTime: Infinity,
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      const result = await window.electron.database.createProject(projectData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }
      return result.data!;
    },
    onSuccess: (newProject) => {
      // Invalidate all project lists
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Add to specific project cache
      queryClient.setQueryData(QUERY_KEYS.project(newProject.id), newProject);
    },
  });
}

// Convenience hooks for common queries
export function useTodayTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.todayTasks(),
    queryFn: async () => {
      const result = await window.electron.database.getTodayTasks();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch today tasks');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - refresh more often for today view
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.overdueTasks(),
    queryFn: async () => {
      const result = await window.electron.database.getOverdueTasks();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch overdue tasks');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpcomingTasks(days: number = 7) {
  return useQuery({
    queryKey: QUERY_KEYS.upcomingTasks(days),
    queryFn: async () => {
      const result = await window.electron.database.getUpcomingTasks(days);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch upcoming tasks');
      }
      return result.data!;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useTasksByProject(projectId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tasksByProject(projectId),
    queryFn: async () => {
      const result = await window.electron.database.getTasksByProject(projectId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch project tasks');
      }
      return result.data!;
    },
    staleTime: Infinity,
    enabled: !!projectId,
  });
}

export function useCompletedTasks(limit: number = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.completedTasks(limit),
    queryFn: async () => {
      const result = await window.electron.database.getCompletedTasks(limit);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch completed tasks');
      }
      return result.data!;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - completed tasks change less frequently
  });
}

export function useTasksByContext(context: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tasksByContext(context),
    queryFn: async () => {
      const result = await window.electron.database.getTasksByContext(context);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch context tasks');
      }
      return result.data!;
    },
    staleTime: Infinity,
    enabled: !!context,
  });
}

export function useHighPriorityTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.highPriorityTasks(),
    queryFn: async () => {
      const result = await window.electron.database.getHighPriorityTasks();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch high priority tasks');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Search hook
export function useSearchTasks(searchTerm: string) {
  return useQuery({
    queryKey: QUERY_KEYS.search(searchTerm),
    queryFn: async () => {
      const result = await window.electron.database.searchTasks(searchTerm);
      if (!result.success) {
        throw new Error(result.error || 'Failed to search tasks');
      }
      return result.data!;
    },
    enabled: searchTerm.length >= 3, // Only search with 3+ characters
    staleTime: 30 * 1000, // 30 seconds - search results can be cached briefly
  });
}

// Statistics hook
export function useTaskStatistics() {
  return useQuery({
    queryKey: QUERY_KEYS.statistics(),
    queryFn: async () => {
      const result = await window.electron.database.getTaskStatistics();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
      return result.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Integration hooks
export function useTasksByIntegration(integration: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tasksByIntegration(integration),
    queryFn: async () => {
      const result = await window.electron.database.getTasksByIntegration(integration);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch integration tasks');
      }
      return result.data!;
    },
    staleTime: Infinity,
    enabled: !!integration,
  });
}

export function useUpdateTaskIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, integration, data }: { taskId: string; integration: string; data: any }) => {
      const result = await window.electron.database.updateTaskIntegration(taskId, integration, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task integration');
      }
      return result.data!;
    },
    onSuccess: (updatedTask, { integration }) => {
      // Update specific task cache
      queryClient.setQueryData(QUERY_KEYS.task(updatedTask.id), updatedTask);
      // Invalidate integration-specific queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasksByIntegration(integration) });
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Bulk operations
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: UpdateTaskData }>) => {
      const result = await window.electron.database.bulkUpdateTasks(updates);
      if (!result.success) {
        throw new Error(`Failed to update ${result.errors?.length || 0} tasks`);
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics() });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const result = await window.electron.database.bulkDeleteTasks(taskIds);
      if (!result.success) {
        throw new Error(`Failed to delete ${result.errors?.length || 0} tasks`);
      }
      return result;
    },
    onSuccess: (result, taskIds) => {
      // Remove from individual task caches
      taskIds.forEach(id => {
        queryClient.removeQueries({ queryKey: QUERY_KEYS.task(id) });
      });
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statistics() });
    },
  });
}

// Maintenance hooks
export function useDatabaseMaintenance() {
  return useMutation({
    mutationFn: async (operation: 'vacuum' | 'analyze') => {
      const result = operation === 'vacuum' 
        ? await window.electron.database.vacuum()
        : await window.electron.database.analyze();
      
      if (!result.success) {
        throw new Error(result.error || `Failed to ${operation} database`);
      }
      return result.data!;
    },
  });
}

export function useDatabaseHealthCheck() {
  return useQuery({
    queryKey: ['database', 'health'],
    queryFn: async () => {
      const result = await window.electron.database.healthCheck();
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 1, // Only retry once for health checks
  });
}
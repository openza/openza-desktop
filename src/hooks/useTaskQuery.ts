import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type { Task, Project, Label } from '@doist/todoist-api-typescript';

interface UseTaskQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
}

export function useTaskQuery<T = { tasks: Task[], projects: Project[], labels: Label[] }>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}: UseTaskQueryOptions) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const query = useQuery<T>({
    queryKey,
    queryFn,
    enabled: isAuthenticated && !authLoading, // Only run when authenticated
    staleTime,
  });

  return {
    ...query,
    isLoading: authLoading || query.isLoading,
  };
}
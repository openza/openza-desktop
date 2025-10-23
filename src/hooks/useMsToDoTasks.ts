import { useQuery } from '@tanstack/react-query';
import { getMsToDoTasksWithListsAndCategories, mapOutlookCategoryColor } from '../utils/msToDoClient';
import type { MsToDoTask, MsToDoTaskList, OutlookCategory } from '../utils/msToDoClient';
import { Task, Project } from '../types/database';
import { useAuth } from './useAuth';
import { convertUtcToUserTimezone } from '../utils/dateUtils';

/**
 * Convert Microsoft To-Do importance to priority number
 * MS To-Do: low | normal | high (UI only shows normal/high via star button)
 * Local: 1-4 (1=highest, 4=lowest)
 */
const convertImportanceToPriority = (importance: 'low' | 'normal' | 'high'): number => {
  switch (importance) {
    case 'high': return 1;    // Starred tasks → High priority badge
    case 'normal': return 3;  // Regular tasks → No badge (normal)
    case 'low': return 4;     // Rare/system → No badge (low)
    default: return 3;        // Default to normal (no badge)
  }
};

/**
 * Convert Microsoft To-Do status to local task status
 * MS To-Do: notStarted | inProgress | completed | waitingOnOthers | deferred
 * Local: pending | in_progress | completed | cancelled
 */
const convertStatusToLocal = (status: string): 'pending' | 'in_progress' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'completed': return 'completed';
    case 'inProgress': return 'in_progress';
    case 'deferred': return 'cancelled';
    case 'waitingOnOthers':
    case 'notStarted':
    default:
      return 'pending';
  }
};

/**
 * Convert Microsoft To-Do task list to local project format
 * This allows us to display MS To-Do lists as "projects" in the UI
 */
const convertMsToDoListToProject = (list: MsToDoTaskList): Project => ({
  id: `mstodo_list_${list.id}`,
  name: list.displayName,
  description: list.isShared ? 'Shared Microsoft To-Do list' : 'Microsoft To-Do list',
  color: '#0078d4', // Microsoft blue
  icon: 'mstodo', // Custom icon identifier
  parent_id: undefined,
  sort_order: 0,
  is_favorite: list.wellknownListName === 'flaggedEmails', // Flag special lists as favorites
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  integrations: {
    msToDo: {
      id: list.id,
      list_id: list.id,
      synced_at: new Date().toISOString(),
      sync_enabled: true,
      sync_fields: ['name', 'description'],
    }
  }
});

/**
 * Convert Microsoft To-Do task to local format for unified display
 */
const convertMsToDoToLocalFormat = (msToDoTask: MsToDoTask, listId?: string, categories: OutlookCategory[] = []): Task => ({
  id: `mstodo_${msToDoTask.id}`,
  title: msToDoTask.title,
  description: msToDoTask.body?.content || undefined,
  project_id: listId ? `mstodo_list_${listId}` : undefined,
  priority: convertImportanceToPriority(msToDoTask.importance),
  status: convertStatusToLocal(msToDoTask.status),
  due_date: msToDoTask.dueDateTime?.dateTime ? 
    (() => {
      const originalDateTime = msToDoTask.dueDateTime.dateTime;
      const originalTimeZone = msToDoTask.dueDateTime.timeZone;
      
      // For UTC timezone tasks, convert to user's local timezone
      if (originalTimeZone === 'UTC') {
        return convertUtcToUserTimezone(originalDateTime);
      } else {
        // For tasks with proper timezone info, extract date directly
        return originalDateTime.split('T')[0];
      }
    })() : undefined,
  energy_level: 2, // Default energy level
  context: 'work', // Default context - could be improved with category mapping
  focus_time: false, // Default value
  created_at: msToDoTask.createdDateTime,
  updated_at: msToDoTask.lastModifiedDateTime,
  completed_at: msToDoTask.completedDateTime?.dateTime || undefined,
  
  // Store original MS To-Do data for reference
  source_task: {
    msToDo: {
      id: msToDoTask.id,
      title: msToDoTask.title,
      body: msToDoTask.body,
      completedDateTime: msToDoTask.completedDateTime,
      dueDateTime: msToDoTask.dueDateTime,
      startDateTime: msToDoTask.startDateTime,
      importance: msToDoTask.importance,
      status: msToDoTask.status,
      categories: msToDoTask.categories,
      hasAttachments: msToDoTask.hasAttachments,
      isReminderOn: msToDoTask.isReminderOn,
      createdDateTime: msToDoTask.createdDateTime,
      lastModifiedDateTime: msToDoTask.lastModifiedDateTime,
      bodyLastModifiedDateTime: msToDoTask.bodyLastModifiedDateTime,
      listId,
    }
  },
  
  // Add integration tracking
  integrations: {
    msToDo: {
      id: msToDoTask.id,
      list_id: listId || '',
      synced_at: new Date().toISOString(),
      sync_enabled: true,
      sync_fields: ['title', 'description', 'status', 'due_date', 'priority'],
    }
  },
  
  // Map categories to labels with actual colors from Outlook categories
  labels: msToDoTask.categories.map((categoryName, index) => {
    const outlookCategory = categories.find(cat => cat.displayName === categoryName);
    const color = outlookCategory 
      ? mapOutlookCategoryColor(outlookCategory.color)
      : '#0078d4'; // Fallback to Microsoft blue
      
    return {
      id: `mstodo_category_${categoryName}`,
      name: categoryName,
      color,
      description: `Microsoft To-Do category: ${categoryName}`,
      sort_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  })
});

/**
 * Custom hook for fetching and converting Microsoft To-Do tasks
 */
export const useMsToDoTasks = (queryKey: string[]) => {
  const { providers } = useAuth();

  const { data: msToDoData, isLoading, error } = useQuery({
    queryKey: [...queryKey, 'mstodo-auth', providers.msToDo.isAuthenticated],
    queryFn: async () => {
      try {
        const result = await getMsToDoTasksWithListsAndCategories();
        return result;
      } catch (error) {
        // If it's an authentication error, silently fail - the auth state will be updated
        if (error instanceof Error && error.message.includes('access token found')) {
          console.log('MS To-Do authentication required - auth state will be updated');
          throw error; // Re-throw to trigger query error state
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: providers.msToDo.isAuthenticated,
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error instanceof Error && error.message.includes('access token found')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const data = msToDoData ? {
    tasks: msToDoData.tasks?.map(task => {
      // Now we have the listId from the enhanced API response and categories with colors
      return convertMsToDoToLocalFormat(task, task.listId, msToDoData.categories);
    }) || [],
    projects: msToDoData.lists?.map(convertMsToDoListToProject) || [],
    labels: [] // Labels are generated from categories in task conversion
  } : null;

  return { data, isLoading, error };
};

/**
 * Export conversion functions for use in other parts of the application
 */
export {
  convertMsToDoToLocalFormat,
  convertMsToDoListToProject,
  convertImportanceToPriority,
  convertStatusToLocal,
};
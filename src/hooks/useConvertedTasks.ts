import { useQuery } from '@tanstack/react-query';
import { getTasksWithProjects } from '../utils/todoistClient';
import type { Task as TodoistTask, Project as TodoistProject } from '@doist/todoist-api-typescript';
import { Task } from '../types/database';
import { useAuth } from './useAuth';
import { convertUtcToUserTimezone } from '../utils/dateUtils';

/**
 * Convert Todoist priority to unified priority system
 * Todoist: 1=Normal, 2=Medium, 3=High, 4=Very High
 * Unified: 1=High, 2=Medium, 3=Normal, 4=Low
 */
const convertTodoistPriorityToUnified = (todoistPriority: number): number => {
  switch (todoistPriority) {
    case 1: return 3; // Normal → Normal
    case 2: return 2; // Medium → Medium  
    case 3: return 1; // High → High
    case 4: return 1; // Very High → High (map to same as High)
    default: return 2; // Default to Medium
  }
};

// Convert Todoist tasks to local format for unified display
const convertTodoistToLocalFormat = (todoistTask: TodoistTask, allLabels: any[]): Task => ({
  id: `todoist_${todoistTask.id}`,
  title: todoistTask.content,
  description: todoistTask.description || undefined,
  project_id: todoistTask.projectId,
  priority: convertTodoistPriorityToUnified(todoistTask.priority),
  status: todoistTask.isCompleted ? 'completed' : 'pending',
  due_date: todoistTask.due ? 
    (() => {
      // Handle Todoist's actual structure: date field can contain UTC datetime
      const dateValue = todoistTask.due.date;
      
      // Check if the date field contains a UTC datetime string (ends with Z)
      if (dateValue && dateValue.includes('T') && dateValue.endsWith('Z')) {
        // This is a UTC datetime in the date field - convert to user timezone
        return convertUtcToUserTimezone(dateValue);
      }
      
      // If there's a datetime with timezone information, handle it properly
      if (todoistTask.due.datetime && todoistTask.due.timezone) {
        // For UTC datetime, convert to user timezone
        if (todoistTask.due.timezone === 'UTC' || todoistTask.due.datetime.endsWith('Z')) {
          return convertUtcToUserTimezone(todoistTask.due.datetime);
        } else {
          // For other timezones, extract the date part from datetime
          return todoistTask.due.datetime.split('T')[0];
        }
      }
      
      // For simple date strings (YYYY-MM-DD format), use directly
      return dateValue;
    })() : undefined,
  energy_level: 2,
  context: 'work',
  focus_time: false,
  created_at: todoistTask.createdAt,
  updated_at: todoistTask.createdAt,
  source_task: {
    todoist: {
      id: todoistTask.id,
      content: todoistTask.content,
      description: todoistTask.description,
      project_id: todoistTask.projectId,
      section_id: undefined,
      parent_id: todoistTask.parentId,
      order: todoistTask.order,
      priority: todoistTask.priority,
      labels: todoistTask.labels,
      completed: todoistTask.isCompleted,
      due: todoistTask.due,
      url: todoistTask.url,
      comment_count: todoistTask.commentCount,
      created_at: todoistTask.createdAt,
      date_modified: todoistTask.createdAt
    }
  },
  // Map Todoist labels to the expected Label format
  labels: todoistTask.labels?.map(labelName => {
    const labelData = allLabels.find(l => l.name === labelName);
    return {
      id: labelData?.id || `todoist_label_${labelName}`,
      name: labelName,
      color: labelData?.color || '#808080',
      description: `Todoist label: ${labelName}`,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }) || []
});

export const useConvertedTasks = (queryKey: string[]) => {
  const { isAuthenticated } = useAuth();

  const { data: todoistData, isLoading, error } = useQuery({
    queryKey: [...queryKey, 'todoist-auth', isAuthenticated],
    queryFn: () => getTasksWithProjects(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const data = todoistData ? {
    tasks: todoistData.tasks?.map(task => convertTodoistToLocalFormat(task, todoistData.labels || [])) || [],
    projects: todoistData.projects || [],
    labels: todoistData.labels || []
  } : null;

  return { data, isLoading, error };
};

/**
 * Export conversion functions for use in other parts of the application
 */
export {
  convertTodoistToLocalFormat,
  convertTodoistPriorityToUnified,
};
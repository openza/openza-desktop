import { secureStorage, STORAGE_KEYS } from './secureStorage';
import { tokenManager } from './tokenManager';
import { msToDoAuthManager } from './msToDoAuth';
import { authManager } from './auth';

// Microsoft Graph API Types for To-Do
export interface MsToDoTaskList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName?: string;
}

export interface MsToDoTask {
  id: string;
  title: string;
  body?: {
    content: string;
    contentType: string;
  };
  completedDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  startDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  importance: 'low' | 'normal' | 'high';
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  categories: string[];
  hasAttachments: boolean;
  isReminderOn: boolean;
  createdDateTime: string;
  lastModifiedDateTime: string;
  bodyLastModifiedDateTime: string;
}

export interface MsToDoChecklistItem {
  id: string;
  displayName: string;
  isChecked: boolean;
  createdDateTime: string;
  checkedDateTime?: string;
}

export interface OutlookCategory {
  id: string;
  displayName: string;
  color: string; // preset0, preset1, etc.
}

export interface MsToDoApiResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

export interface MsToDoError {
  error: {
    code: string;
    message: string;
    innerError?: {
      'request-id': string;
      date: string;
    };
  };
}

export interface CreateMsToDoTaskArgs {
  title: string;
  body?: string;
  dueDateTime?: string;
  importance?: 'low' | 'normal' | 'high';
  categories?: string[];
}

export interface UpdateMsToDoTaskArgs {
  title?: string;
  body?: string;
  dueDateTime?: string;
  importance?: 'low' | 'normal' | 'high';
  status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  categories?: string[];
}

class MsToDoClient {
  private static readonly BASE_URL = 'https://graph.microsoft.com/v1.0';
  private token: string;

  constructor(token: string) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Invalid Microsoft To-Do access token');
    }
    this.token = token;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, retryOnAuth = true): Promise<T> {
    const url = `${MsToDoClient.BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    // Handle token expiration with automatic refresh
    if (response.status === 401 && retryOnAuth) {
      console.log('MS To-Do 401 error - attempting token refresh...');
      try {
        const { tokenManager } = await import('./tokenManager');
        
        console.log('Attempting to refresh MS To-Do token using TokenManager...');
        const newToken = await tokenManager.getValidAccessToken('msToDo');
        
        if (newToken) {
          console.log('Token refresh successful, updating client token...');
          
          // Update the token for this client instance
          this.token = newToken;
          
          console.log('Retrying original request with new token...');
          // Retry the request with the new token (prevent infinite recursion)
          return this.makeRequest<T>(endpoint, options, false);
        } else {
          console.log('No valid token available - attempting direct authentication...');
          
          // Try one more time with direct MSAL authentication as fallback
          try {
            const { msToDoAuthManager } = await import('./msToDoAuth');
            console.log('Attempting MSAL interactive authentication as fallback...');
            
            const authResult = await msToDoAuthManager.startMsalInteractiveFlow();
            if (authResult && authResult.access_token) {
              console.log('Direct authentication successful, updating client token...');
              this.token = authResult.access_token;
              
              // Retry the original request with the new token
              return this.makeRequest<T>(endpoint, options, false);
            }
          } catch (directAuthError) {
            console.warn('Direct authentication also failed:', directAuthError);
          }
          
          // Only clear auth state if all attempts failed
          console.log('All authentication attempts failed - clearing auth state');
          const { authManager } = await import('./auth');
          await authManager.clearProviderToken('msToDo');
          throw new Error('Microsoft To-Do authentication expired. Please sign in again.');
        }
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
        
        // Don't immediately clear - the error might be temporary
        throw new Error(
          `Microsoft To-Do authentication issue. Please try again or re-authenticate if the problem persists. (${refreshError instanceof Error ? refreshError.message : 'Unknown refresh error'})`
        );
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as MsToDoError;
      throw new Error(
        `Microsoft To-Do API error ${response.status}: ${
          error.error?.message || response.statusText
        }`
      );
    }

    return response.json();
  }

  /**
   * Get all task lists for the user
   */
  async getTaskLists(): Promise<MsToDoTaskList[]> {
    const response = await this.makeRequest<MsToDoApiResponse<MsToDoTaskList>>('/me/todo/lists');
    return response.value;
  }

  /**
   * Get all Outlook categories for the user (used for category colors)
   * Note: This requires MailboxSettings.Read permission which may not be available
   */
  async getOutlookCategories(): Promise<OutlookCategory[]> {
    try {
      const response = await this.makeRequest<MsToDoApiResponse<OutlookCategory>>('/me/outlook/masterCategories');
      return response.value;
    } catch (error) {
      console.warn('Cannot access Outlook categories (insufficient permissions):', error);
      return []; // Return empty array if categories can't be accessed
    }
  }

  /**
   * Get tasks from a specific task list
   */
  async getTasks(listId: string, cursor?: string): Promise<{ tasks: MsToDoTask[]; nextCursor?: string }> {
    let endpoint = `/me/todo/lists/${listId}/tasks`;
    
    if (cursor) {
      // Extract the URL from the cursor
      const url = new URL(cursor);
      // Remove the base URL path (/v1.0) to avoid duplication
      let path = url.pathname + url.search;
      if (path.startsWith('/v1.0/')) {
        path = path.substring(5); // Remove '/v1.0'
      }
      endpoint = path;
    }

    const response = await this.makeRequest<MsToDoApiResponse<MsToDoTask>>(endpoint);
    
    return {
      tasks: response.value,
      nextCursor: response['@odata.nextLink'],
    };
  }

  /**
   * Get all tasks from all task lists with pagination support
   */
  async getAllTasks(): Promise<MsToDoTask[]> {
    const taskLists = await this.getTaskLists();
    const allTasks: MsToDoTask[] = [];

    // Get tasks from each list
    for (const list of taskLists) {
      let cursor: string | undefined;
      
      do {
        const response = await this.getTasks(list.id, cursor);
        allTasks.push(...response.tasks);
        cursor = response.nextCursor;
      } while (cursor);
    }

    return allTasks;
  }

  /**
   * Get tasks with their associated task lists, preserving the list relationship
   */
  async getTasksWithLists(): Promise<{ tasks: (MsToDoTask & { listId: string })[]; lists: MsToDoTaskList[] }> {
    const taskLists = await this.getTaskLists();
    const allTasks: (MsToDoTask & { listId: string })[] = [];

    // Get tasks from each list and preserve the list ID
    for (const list of taskLists) {
      let cursor: string | undefined;
      
      do {
        const response = await this.getTasks(list.id, cursor);
        // Add listId to each task
        const tasksWithListId = response.tasks.map(task => ({
          ...task,
          listId: list.id
        }));
        allTasks.push(...tasksWithListId);
        cursor = response.nextCursor;
      } while (cursor);
    }

    return { tasks: allTasks, lists: taskLists };
  }

  /**
   * Create a new task in a specific list
   */
  async createTask(listId: string, taskData: CreateMsToDoTaskArgs): Promise<MsToDoTask> {
    const body: any = {
      title: taskData.title,
    };

    if (taskData.body) {
      body.body = {
        content: taskData.body,
        contentType: 'text',
      };
    }

    if (taskData.dueDateTime) {
      body.dueDateTime = {
        dateTime: taskData.dueDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    if (taskData.importance) {
      body.importance = taskData.importance;
    }

    if (taskData.categories) {
      body.categories = taskData.categories;
    }

    return this.makeRequest<MsToDoTask>(`/me/todo/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update an existing task
   */
  async updateTask(listId: string, taskId: string, updates: UpdateMsToDoTaskArgs): Promise<MsToDoTask> {
    const body: any = {};

    if (updates.title !== undefined) {
      body.title = updates.title;
    }

    if (updates.body !== undefined) {
      body.body = {
        content: updates.body,
        contentType: 'text',
      };
    }

    if (updates.dueDateTime !== undefined) {
      body.dueDateTime = updates.dueDateTime ? {
        dateTime: updates.dueDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      } : null;
    }

    if (updates.importance !== undefined) {
      body.importance = updates.importance;
    }

    if (updates.status !== undefined) {
      body.status = updates.status;
    }

    if (updates.categories !== undefined) {
      body.categories = updates.categories;
    }

    return this.makeRequest<MsToDoTask>(`/me/todo/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.makeRequest<void>(`/me/todo/lists/${listId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Complete a task
   */
  async completeTask(listId: string, taskId: string): Promise<MsToDoTask> {
    return this.updateTask(listId, taskId, { status: 'completed' });
  }

  /**
   * Get checklist items for a task
   */
  async getChecklistItems(listId: string, taskId: string): Promise<MsToDoChecklistItem[]> {
    const response = await this.makeRequest<MsToDoApiResponse<MsToDoChecklistItem>>(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`
    );
    return response.value;
  }

  /**
   * Create a new checklist item
   */
  async createChecklistItem(
    listId: string, 
    taskId: string, 
    displayName: string
  ): Promise<MsToDoChecklistItem> {
    return this.makeRequest<MsToDoChecklistItem>(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`,
      {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      }
    );
  }
}

/**
 * Create a Microsoft To-Do client with a token
 */
/**
 * Maps Outlook category preset colors to hex values
 * Based on Microsoft's predefined color palette
 */
export const mapOutlookCategoryColor = (presetColor: string): string => {
  const colorMap: Record<string, string> = {
    'None': '#000000',
    'preset0': '#FF1A1A',     // Red
    'preset1': '#FF8C00',     // Orange  
    'preset2': '#F4C430',     // Peach/Yellow
    'preset3': '#32CD32',     // Green
    'preset4': '#00CED1',     // Teal
    'preset5': '#0078D4',     // Blue
    'preset6': '#8A2BE2',     // Purple
    'preset7': '#FF69B4',     // Pink/Cranberry
    'preset8': '#B8860B',     // Olive
    'preset9': '#4682B4',     // Steel Blue
    'preset10': '#DC143C',    // Dark Red
    'preset11': '#FF4500',    // Dark Orange
    'preset12': '#DAA520',    // Dark Yellow
    'preset13': '#228B22',    // Dark Green
    'preset14': '#008B8B',    // Dark Teal
    'preset15': '#0000CD',    // Dark Blue
    'preset16': '#4B0082',    // Dark Purple
    'preset17': '#DC143C',    // Dark Cranberry
    'preset18': '#556B2F',    // Dark Olive
    'preset19': '#2F4F4F',    // Dark Steel
    'preset20': '#8B0000',    // Dark Red 2
    'preset21': '#FF6347',    // Dark Orange 2
    'preset22': '#BDB76B',    // Dark Yellow 2
    'preset23': '#006400',    // Dark Green 2
    'preset24': '#5F9EA0',    // Dark Teal 2
  };
  
  return colorMap[presetColor] || '#0078d4'; // Default to Microsoft blue
};

export const createMsToDoClient = (token: string): MsToDoClient => {
  return new MsToDoClient(token);
};

/**
 * Get an authenticated Microsoft To-Do client
 */
export const getMsToDoClient = async (): Promise<MsToDoClient> => {
  // Use the new token manager to get a valid access token
  const token = await tokenManager.getValidAccessToken('msToDo');
  if (!token) {
    throw new Error('No Microsoft To-Do access token found. Please sign in again.');
  }
  return createMsToDoClient(token);
};

/**
 * Get all tasks with pagination support
 */
export const getAllMsToDoTasks = async (): Promise<MsToDoTask[]> => {
  const client = await getMsToDoClient();
  return client.getAllTasks();
};

/**
 * Get tasks with their associated lists
 */
export const getMsToDoTasksWithLists = async (): Promise<{ tasks: MsToDoTask[]; lists: MsToDoTaskList[] }> => {
  const client = await getMsToDoClient();
  return client.getTasksWithLists();
};

/**
 * Get tasks with their associated lists and categories (with colors)
 */
export const getMsToDoTasksWithListsAndCategories = async (): Promise<{ 
  tasks: MsToDoTask[]; 
  lists: MsToDoTaskList[]; 
  categories: OutlookCategory[] 
}> => {
  const client = await getMsToDoClient();
  
  // Fetch tasks and lists (required)
  const tasksWithLists = await client.getTasksWithLists();
  
  // Try to fetch categories (optional - may fail due to permissions)
  let categories: OutlookCategory[] = [];
  try {
    categories = await client.getOutlookCategories();
  } catch (error) {
    console.warn('Could not fetch Outlook categories (this is optional):', error instanceof Error ? error.message : error);
    // Continue without categories - the app will work fine
  }
  
  return {
    tasks: tasksWithLists.tasks,
    lists: tasksWithLists.lists,
    categories
  };
};
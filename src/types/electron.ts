// Electron API type definitions for renderer process

import {
  Task,
  Project,
  Label,
  CreateTaskData,
  UpdateTaskData,
  CreateProjectData,
  CreateTimeEntryData,
  TaskFilters,
  ProjectFilters,
  DatabaseResult,
  BulkOperationResult,
  TaskStatistics,
} from './database.js';

export interface ElectronAPI {
  send: (channel: string, data?: any) => void;
  on: (channel: string, func: (...args: any[]) => void) => void;

  secureStorage: {
    set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
    get: (key: string) => Promise<{ success: boolean; value?: string | null; error?: string }>;
    delete: (key: string) => Promise<{ success: boolean; error?: string }>;
    isAvailable: () => Promise<boolean>;
  };

  shell: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };

  oauth: {
    openWindow: (oauthUrl: string) => Promise<
      | { code: string; state: string; error: null }
      | { accessToken: string; state: string; error: null }
      | { error: string }
    >;
  };

  config: {
    getOAuthConfig: (provider: string) => Promise<{
      success: boolean;
      config?: {
        clientId: string;
        redirectUri: string;
        tenantId: string;
        protocolScheme?: string;
        timeoutMinutes?: number;
      };
      error?: string;
    }>;
    exchangeCode: (provider: string, code: string, codeVerifier: string) => Promise<{ success: boolean; error?: string }>;
    refreshToken: (provider: string, refreshToken: string) => Promise<{ success: boolean; error?: string }>;
  };

  msal: {
    getAuthCodeUrl: (request: {
      scopes: string[];
      redirectUri: string;
    }) => Promise<{ success: boolean; authUrl?: string; error?: string }>;
    acquireTokenByCode: (request: {
      scopes: string[];
      code: string;
      redirectUri: string;
    }) => Promise<{
      success: boolean;
      tokenData?: {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
        account?: {
          username?: string;
          name?: string;
          tenantId?: string;
          environment?: string;
        };
      };
      error?: string;
    }>;
    acquireTokenInteractive: (request: {
      scopes: string[];
    }) => Promise<{
      success: boolean;
      tokenData?: {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
        account?: {
          username?: string;
          name?: string;
          tenantId?: string;
          environment?: string;
        };
      };
      error?: string;
    }>;
    acquireTokenSilent: (request: {
      scopes: string[];
    }) => Promise<{
      success: boolean;
      tokenData?: {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
        account?: {
          username?: string;
          name?: string;
          tenantId?: string;
          environment?: string;
        };
      };
      error?: string;
    }>;
    getAccount: () => Promise<{
      success: boolean;
      account?: {
        username?: string;
        name?: string;
        tenantId?: string;
        environment?: string;
      } | null;
      error?: string;
    }>;
    signOut: () => Promise<{ success: boolean; error?: string }>;
  };

  database: {
    // Task operations
    createTask: (taskData: CreateTaskData) => Promise<DatabaseResult<Task>>;
    getTaskById: (id: string) => Promise<DatabaseResult<Task>>;
    getTasks: (filters?: TaskFilters) => Promise<DatabaseResult<Task[]>>;
    updateTask: (id: string, updates: UpdateTaskData) => Promise<DatabaseResult<Task>>;
    deleteTask: (id: string) => Promise<DatabaseResult<boolean>>;

    // Project operations
    createProject: (projectData: CreateProjectData) => Promise<DatabaseResult<Project>>;
    getProjectById: (id: string) => Promise<DatabaseResult<Project>>;
    getProjects: (filters?: ProjectFilters) => Promise<DatabaseResult<Project[]>>;

    // Integration operations
    updateTaskIntegration: (taskId: string, integration: string, data: any) => Promise<DatabaseResult<Task>>;
    getTasksByIntegration: (integration: string) => Promise<DatabaseResult<Task[]>>;

    // Search operations
    searchTasks: (searchTerm: string) => Promise<DatabaseResult<Task[]>>;

    // Statistics
    getTaskStatistics: () => Promise<DatabaseResult<TaskStatistics>>;

    // Convenience methods
    getTodayTasks: () => Promise<DatabaseResult<Task[]>>;
    getOverdueTasks: () => Promise<DatabaseResult<Task[]>>;
    getUpcomingTasks: (days?: number) => Promise<DatabaseResult<Task[]>>;
    getTasksByProject: (projectId: string) => Promise<DatabaseResult<Task[]>>;
    getCompletedTasks: (limit?: number) => Promise<DatabaseResult<Task[]>>;
    getTasksByContext: (context: string) => Promise<DatabaseResult<Task[]>>;
    getHighPriorityTasks: () => Promise<DatabaseResult<Task[]>>;

    // Bulk operations
    bulkUpdateTasks: (updates: Array<{ id: string; data: UpdateTaskData }>) => Promise<BulkOperationResult>;
    bulkDeleteTasks: (taskIds: string[]) => Promise<BulkOperationResult>;

    // Maintenance
    vacuum: () => Promise<DatabaseResult<boolean>>;
    analyze: () => Promise<DatabaseResult<boolean>>;
    healthCheck: () => Promise<{
      success: boolean;
      status: 'healthy' | 'error';
      message: string;
    }>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
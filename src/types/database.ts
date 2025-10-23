// Database type definitions for Openza

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_favorite: boolean;
  is_archived: boolean;
  integrations?: ExternalIntegrations;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority: number; // 1-4 (1=highest, 4=lowest)
  status: TaskStatus;
  due_date?: string; // ISO date string
  due_time?: string; // HH:MM format
  
  // Enhanced local features
  estimated_duration?: number; // minutes
  actual_duration?: number; // minutes
  energy_level: number; // 1-5
  context: TaskContext;
  focus_time: boolean;
  notes?: string;
  
  // External integration (wrapper pattern)
  source_task?: ExternalTaskData;
  integrations?: ExternalIntegrations;
  
  completed_at?: string;
  
  // Joined fields (from queries)
  project_name?: string;
  project_color?: string;
  labels?: Label[];
  time_entries?: TimeEntry[];
}

export interface Label extends BaseEntity {
  name: string;
  color: string;
  description?: string;
  sort_order: number;
  integrations?: ExternalIntegrations;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
}

export interface TimeEntry extends BaseEntity {
  task_id: string;
  start_time: string; // ISO datetime string
  end_time?: string; // ISO datetime string
  duration?: number; // calculated minutes
  description?: string;
  energy_used?: number; // 1-5 scale
  focus_quality?: number; // 1-5 scale
}

export interface TaskEnhancement extends BaseEntity {
  task_id: string;
  type: TaskEnhancementType;
  content: string;
  sort_order: number;
  completed: boolean;
}

export interface Integration extends BaseEntity {
  name: IntegrationName;
  is_active: boolean;
  config?: IntegrationConfig;
  last_sync_at?: string;
  sync_token?: string;
}

// Enums and types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskContext = 'work' | 'personal' | 'errands' | 'home' | 'office';
export type TaskEnhancementType = 'note' | 'checkpoint' | 'resource' | 'link';
export type IntegrationName = 'todoist' | 'msToDo' | 'notion' | 'github' | 'linear';

// External integration types
export interface ExternalIntegrations {
  todoist?: TodoistIntegration;
  msToDo?: MsToDoIntegration;
  notion?: NotionIntegration;
  github?: GitHubIntegration;
  [key: string]: any;
}

export interface TodoistIntegration {
  id: string;
  synced_at: string;
  last_modified?: string;
  sync_enabled: boolean;
  sync_fields: string[];
  project_id?: string;
  parent_id?: string;
}

export interface MsToDoIntegration {
  id: string;
  list_id: string;
  synced_at: string;
  last_modified?: string;
  sync_enabled: boolean;
  sync_fields: string[];
}

export interface NotionIntegration {
  page_id: string;
  synced_at: string;
  database_id?: string;
}

export interface GitHubIntegration {
  issue_number: number;
  repository: string;
  synced_at: string;
}

// External task data (complete original tasks)
export interface ExternalTaskData {
  todoist?: TodoistTaskData;
  msToDo?: MsToDoTaskData;
  notion?: NotionTaskData;
  github?: GitHubTaskData;
  [key: string]: any;
}

export interface TodoistTaskData {
  id: string;
  content: string;
  description?: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  priority: number;
  labels: string[];
  completed: boolean;
  due?: {
    date: string;
    datetime?: string;
    string: string;
    timezone?: string;
  };
  url: string;
  comment_count: number;
  assignee?: string;
  assigner?: string;
  created_at: string;
  date_modified: string;
}

export interface MsToDoTaskData {
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
  listId?: string; // Additional field to track which list this task belongs to
}

export interface NotionTaskData {
  id: string;
  title: string;
  status: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
}

export interface GitHubTaskData {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string }>;
  milestone?: { title: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

// Integration configuration types
export interface IntegrationConfig {
  todoist?: TodoistConfig;
  msToDo?: MsToDoConfig;
  notion?: NotionConfig;
  github?: GitHubConfig;
}

export interface TodoistConfig {
  client_id: string;
  access_token?: string;
  sync_frequency: number; // minutes
  auto_sync: boolean;
  sync_projects: string[]; // project IDs to sync
  sync_labels: string[]; // label names to sync
}

export interface MsToDoConfig {
  client_id: string;
  access_token?: string;
  refresh_token?: string;
  sync_frequency: number; // minutes
  auto_sync: boolean;
  sync_lists: string[]; // list IDs to sync
  sync_categories: string[]; // category names to sync
}

export interface NotionConfig {
  access_token?: string;
  database_id: string;
  property_mappings: Record<string, string>;
}

export interface GitHubConfig {
  access_token?: string;
  repository: string;
  label_filter?: string[];
  assignee_filter?: string;
}

// Query and filter types
export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  project_id?: string;
  parent_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  energy_level?: number;
  context?: TaskContext;
  focus_time?: boolean;
  has_integration?: IntegrationName;
  search?: string;
  labels?: string[];
  limit?: number;
  offset?: number;
}

export interface ProjectFilters {
  parent_id?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  has_integration?: IntegrationName;
  search?: string;
}

// Create/Update types
export interface CreateTaskData {
  id?: string; // Optional, will be generated if not provided
  title: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority?: number;
  status?: TaskStatus;
  due_date?: string;
  due_time?: string;
  estimated_duration?: number;
  energy_level?: number;
  context?: TaskContext;
  focus_time?: boolean;
  notes?: string;
  source_task?: ExternalTaskData;
  integrations?: ExternalIntegrations;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  project_id?: string;
  parent_id?: string;
  priority?: number;
  status?: TaskStatus;
  due_date?: string;
  due_time?: string;
  estimated_duration?: number;
  actual_duration?: number;
  energy_level?: number;
  context?: TaskContext;
  focus_time?: boolean;
  notes?: string;
  integrations?: ExternalIntegrations;
  completed_at?: string;
}

export interface CreateProjectData {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
  is_favorite?: boolean;
  integrations?: ExternalIntegrations;
}

export interface CreateTimeEntryData {
  id?: string;
  task_id: string;
  start_time: string;
  end_time?: string;
  description?: string;
  energy_used?: number;
  focus_quality?: number;
}

// Database operation result types
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  changes?: number;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: Array<{ id: string; error: string }>;
}

// Sync operation types
export interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'project' | 'label';
  local_id: string;
  external_id?: string;
  data?: any;
  conflict?: boolean;
}

export interface SyncResult {
  success: boolean;
  operations: SyncOperation[];
  conflicts: SyncOperation[];
  last_sync_token?: string;
  error?: string;
}

// Statistics and analytics types
export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  overdue: number;
  by_project: Record<string, number>;
  by_context: Record<string, number>;
  by_energy_level: Record<number, number>;
}

export interface ProductivityStatistics {
  tasks_completed_today: number;
  tasks_completed_this_week: number;
  total_time_tracked: number; // minutes
  average_task_duration: number; // minutes
  productivity_score: number; // 0-100
  energy_distribution: Record<number, number>;
  context_distribution: Record<string, number>;
}
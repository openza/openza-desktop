import { ipcMain } from 'electron';
import { DatabaseManager } from '../database/DatabaseManager.js';
import {
  CreateTaskData,
  UpdateTaskData,
  CreateProjectData,
  CreateTimeEntryData,
  TaskFilters,
  ProjectFilters,
} from '../../types/database.js';

let dbManager: DatabaseManager;

export function initializeDatabaseHandlers() {
  // Initialize database manager
  dbManager = DatabaseManager.getInstance();

  // Task operations
  ipcMain.handle('db:createTask', async (event, taskData: CreateTaskData) => {
    return dbManager.createTask(taskData);
  });

  ipcMain.handle('db:getTaskById', async (event, id: string) => {
    return dbManager.getTaskById(id);
  });

  ipcMain.handle('db:getTasks', async (event, filters: TaskFilters) => {
    return dbManager.getTasks(filters);
  });

  ipcMain.handle('db:updateTask', async (event, id: string, updates: UpdateTaskData) => {
    return dbManager.updateTask(id, updates);
  });

  ipcMain.handle('db:deleteTask', async (event, id: string) => {
    return dbManager.deleteTask(id);
  });

  // Project operations
  ipcMain.handle('db:createProject', async (event, projectData: CreateProjectData) => {
    return dbManager.createProject(projectData);
  });

  ipcMain.handle('db:getProjectById', async (event, id: string) => {
    return dbManager.getProjectById(id);
  });

  ipcMain.handle('db:getProjects', async (event, filters: ProjectFilters) => {
    return dbManager.getProjects(filters);
  });

  // Integration operations
  ipcMain.handle('db:updateTaskIntegration', async (event, taskId: string, integration: string, data: any) => {
    return dbManager.updateTaskIntegration(taskId, integration, data);
  });

  ipcMain.handle('db:getTasksByIntegration', async (event, integration: string) => {
    return dbManager.getTasksByIntegration(integration);
  });

  // Search operations
  ipcMain.handle('db:searchTasks', async (event, searchTerm: string) => {
    return dbManager.searchTasks(searchTerm);
  });

  // Statistics
  ipcMain.handle('db:getTaskStatistics', async (event) => {
    return dbManager.getTaskStatistics();
  });

  // Maintenance operations
  ipcMain.handle('db:vacuum', async (event) => {
    return dbManager.vacuum();
  });

  ipcMain.handle('db:analyze', async (event) => {
    return dbManager.analyze();
  });

  // Convenience methods for common queries
  ipcMain.handle('db:getTodayTasks', async (event) => {
    const today = new Date().toISOString().split('T')[0];
    return dbManager.getTasks({
      due_date_from: today,
      due_date_to: today,
      status: ['pending', 'in_progress']
    });
  });

  ipcMain.handle('db:getOverdueTasks', async (event) => {
    const today = new Date().toISOString().split('T')[0];
    return dbManager.getTasks({
      due_date_to: today,
      status: ['pending', 'in_progress']
    });
  });

  ipcMain.handle('db:getUpcomingTasks', async (event, days: number = 7) => {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + days);
    const futureDate = future.toISOString().split('T')[0];
    
    return dbManager.getTasks({
      due_date_from: today,
      due_date_to: futureDate,
      status: ['pending', 'in_progress']
    });
  });

  ipcMain.handle('db:getTasksByProject', async (event, projectId: string) => {
    return dbManager.getTasks({ project_id: projectId });
  });

  ipcMain.handle('db:getCompletedTasks', async (event, limit: number = 50) => {
    return dbManager.getTasks({ 
      status: 'completed',
      limit 
    });
  });

  ipcMain.handle('db:getTasksByContext', async (event, context: string) => {
    return dbManager.getTasks({ context: context as any });
  });

  ipcMain.handle('db:getHighPriorityTasks', async (event) => {
    return dbManager.getTasks({ 
      status: ['pending', 'in_progress']
    });
  });

  // Bulk operations
  ipcMain.handle('db:bulkUpdateTasks', async (event, updates: Array<{ id: string; data: UpdateTaskData }>) => {
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const result = dbManager.updateTask(update.id, update.data);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({ id: update.id, error: result.error });
        }
      } catch (error) {
        errors.push({ id: update.id, error: (error as Error).message });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length,
      errors
    };
  });

  ipcMain.handle('db:bulkDeleteTasks', async (event, taskIds: string[]) => {
    const results = [];
    const errors = [];

    for (const id of taskIds) {
      try {
        const result = dbManager.deleteTask(id);
        if (result.success) {
          results.push(id);
        } else {
          errors.push({ id, error: result.error });
        }
      } catch (error) {
        errors.push({ id, error: (error as Error).message });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length,
      errors
    };
  });

  // Database health check
  ipcMain.handle('db:healthCheck', async (event) => {
    try {
      // Try to run a simple query
      const result = dbManager.getProjects({ limit: 1 });
      
      if (result.success) {
        return {
          success: true,
          status: 'healthy',
          message: 'Database is accessible and responding'
        };
      } else {
        return {
          success: false,
          status: 'error',
          message: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: (error as Error).message
      };
    }
  });

  console.log('Database IPC handlers initialized');
}

export function closeDatabaseHandlers() {
  if (dbManager) {
    dbManager.close();
  }
}
import { ipcMain } from 'electron';
import { DatabaseManager } from '../database/DatabaseManager.js';

let dbManager;

export function initializeDatabaseHandlers() {
  // Initialize database manager
  dbManager = DatabaseManager.getInstance();

  // Task operations
  ipcMain.handle('db:createTask', async (event, taskData) => {
    return dbManager.createTask(taskData);
  });

  ipcMain.handle('db:getTaskById', async (event, id) => {
    return dbManager.getTaskById(id);
  });

  ipcMain.handle('db:getTasks', async (event, filters) => {
    return dbManager.getTasks(filters || {});
  });

  ipcMain.handle('db:updateTask', async (event, id, updates) => {
    return dbManager.updateTask(id, updates);
  });

  ipcMain.handle('db:deleteTask', async (event, id) => {
    return dbManager.deleteTask(id);
  });

  // Project operations
  ipcMain.handle('db:createProject', async (event, projectData) => {
    return dbManager.createProject(projectData);
  });

  ipcMain.handle('db:getProjectById', async (event, id) => {
    return dbManager.getProjectById(id);
  });

  ipcMain.handle('db:getProjects', async (event, filters) => {
    return dbManager.getProjects(filters || {});
  });

  // Label operations
  ipcMain.handle('db:createLabel', async (event, labelData) => {
    return dbManager.createLabel(labelData);
  });

  ipcMain.handle('db:getLabelById', async (event, id) => {
    return dbManager.getLabelById(id);
  });

  ipcMain.handle('db:getLabels', async (event) => {
    return dbManager.getLabels();
  });

  ipcMain.handle('db:assignLabelsToTask', async (event, taskId, labelIds) => {
    return dbManager.assignLabelsToTask(taskId, labelIds);
  });

  ipcMain.handle('db:removeLabelsFromTask', async (event, taskId, labelIds) => {
    return dbManager.removeLabelsFromTask(taskId, labelIds);
  });

  ipcMain.handle('db:getTaskLabels', async (event, taskId) => {
    return dbManager.getTaskLabels(taskId);
  });

  // Integration operations
  ipcMain.handle('db:updateTaskIntegration', async (event, taskId, integration, data) => {
    return dbManager.updateTaskIntegration(taskId, integration, data);
  });

  ipcMain.handle('db:getTasksByIntegration', async (event, integration) => {
    return dbManager.getTasksByIntegration(integration);
  });

  // Search operations
  ipcMain.handle('db:searchTasks', async (event, searchTerm) => {
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

  ipcMain.handle('db:getUpcomingTasks', async (event, days = 7) => {
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

  ipcMain.handle('db:getTasksByProject', async (event, projectId) => {
    return dbManager.getTasks({ project_id: projectId });
  });

  ipcMain.handle('db:getCompletedTasks', async (event, limit = 50) => {
    return dbManager.getTasks({ 
      status: 'completed',
      limit 
    });
  });

  ipcMain.handle('db:getTasksByContext', async (event, context) => {
    return dbManager.getTasks({ context: context });
  });

  ipcMain.handle('db:getHighPriorityTasks', async (event) => {
    return dbManager.getTasks({ 
      status: ['pending', 'in_progress']
    });
  });

  // Bulk operations
  ipcMain.handle('db:bulkUpdateTasks', async (event, updates) => {
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
        errors.push({ id: update.id, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length,
      errors
    };
  });

  ipcMain.handle('db:bulkDeleteTasks', async (event, taskIds) => {
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
        errors.push({ id, error: error.message });
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
        message: error.message
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
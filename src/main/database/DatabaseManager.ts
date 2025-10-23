import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  Task,
  Project,
  Label,
  TimeEntry,
  TaskEnhancement,
  Integration,
  CreateTaskData,
  UpdateTaskData,
  CreateProjectData,
  CreateTimeEntryData,
  TaskFilters,
  ProjectFilters,
  DatabaseResult,
  BulkOperationResult,
  TaskStatistics,
  ExternalIntegrations,
} from '../../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor() {
    const dbPath = path.join(app.getPath('userData'), 'openza.db');
    
    this.db = new Database(dbPath);
    this.configureDatabase();
    this.initializeDatabase();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private configureDatabase() {
    // Optimize for desktop application
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 1073741824'); // 1GB memory mapping
    this.db.pragma('cache_size = -64000');    // 64MB cache
  }

  private initializeDatabase() {
    try {
      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      this.db.exec(schema);
      
      this.runMigrations();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private runMigrations() {
    const currentVersion = this.getSchemaVersion();
    const migrations = this.getMigrations();
    
    for (const [version, migration] of migrations) {
      if (version > currentVersion) {
        console.log(`Running migration to version ${version}`);
        this.db.transaction(() => {
          migration(this.db);
          this.setSchemaVersion(version);
        })();
      }
    }
  }

  private getSchemaVersion(): number {
    try {
      const result = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
      return result.user_version;
    } catch {
      return 0;
    }
  }

  private setSchemaVersion(version: number) {
    this.db.exec(`PRAGMA user_version = ${version}`);
  }

  private getMigrations(): Map<number, (db: Database.Database) => void> {
    return new Map([
      [1, (db) => {
        // Initial schema already applied in initializeDatabase
        console.log('Migration 1: Initial schema');
      }],
      // Future migrations will be added here
    ]);
  }

  // Task operations
  createTask(taskData: CreateTaskData): DatabaseResult<Task> {
    try {
      const id = taskData.id || this.generateId();
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO tasks (
          id, title, description, project_id, parent_id, priority, status,
          due_date, due_time, estimated_duration, energy_level, 
          context, focus_time, notes, source_task, integrations,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        taskData.title,
        taskData.description || null,
        taskData.project_id || null,
        taskData.parent_id || null,
        taskData.priority || 2,
        taskData.status || 'pending',
        taskData.due_date || null,
        taskData.due_time || null,
        taskData.estimated_duration || null,
        taskData.energy_level || 2,
        taskData.context || 'work',
        taskData.focus_time || false,
        taskData.notes || null,
        taskData.source_task ? JSON.stringify(taskData.source_task) : null,
        taskData.integrations ? JSON.stringify(taskData.integrations) : null,
        now,
        now
      );

      const task = this.getTaskById(id);
      return { success: true, data: task.data!, changes: 1 };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getTaskById(id: string): DatabaseResult<Task> {
    try {
      const stmt = this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?
      `);
      
      const row = stmt.get(id) as any;
      if (!row) {
        return { success: false, error: 'Task not found' };
      }

      const task = this.mapRowToTask(row);
      return { success: true, data: task };
    } catch (error) {
      console.error('Error getting task:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getTasks(filters: TaskFilters = {}): DatabaseResult<Task[]> {
    try {
      let query = `
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE 1=1
      `;
      
      const params: any[] = [];

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query += ` AND t.status IN (${filters.status.map(() => '?').join(',')})`;
          params.push(...filters.status);
        } else {
          query += ` AND t.status = ?`;
          params.push(filters.status);
        }
      }

      if (filters.project_id) {
        query += ` AND t.project_id = ?`;
        params.push(filters.project_id);
      }

      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query += ` AND t.parent_id IS NULL`;
        } else {
          query += ` AND t.parent_id = ?`;
          params.push(filters.parent_id);
        }
      }

      if (filters.due_date_from) {
        query += ` AND t.due_date >= ?`;
        params.push(filters.due_date_from);
      }

      if (filters.due_date_to) {
        query += ` AND t.due_date <= ?`;
        params.push(filters.due_date_to);
      }

      if (filters.energy_level) {
        query += ` AND t.energy_level = ?`;
        params.push(filters.energy_level);
      }

      if (filters.context) {
        query += ` AND t.context = ?`;
        params.push(filters.context);
      }

      if (filters.focus_time !== undefined) {
        query += ` AND t.focus_time = ?`;
        params.push(filters.focus_time);
      }

      if (filters.has_integration) {
        query += ` AND json_extract(t.integrations, '$.${filters.has_integration}') IS NOT NULL`;
      }

      if (filters.search) {
        query = `
          SELECT t.*, p.name as project_name, p.color as project_color,
                 ts.rank
          FROM task_search ts
          JOIN tasks t ON t.rowid = ts.rowid
          LEFT JOIN projects p ON t.project_id = p.id
          WHERE task_search MATCH ?
          ORDER BY ts.rank
        `;
        params.unshift(filters.search);
      } else {
        query += ` ORDER BY t.priority ASC, t.due_date ASC NULLS LAST, t.created_at DESC`;
      }

      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];
      
      const tasks = rows.map(row => this.mapRowToTask(row));
      return { success: true, data: tasks };
    } catch (error) {
      console.error('Error getting tasks:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  updateTask(id: string, updates: UpdateTaskData): DatabaseResult<Task> {
    try {
      const setParts: string[] = [];
      const params: any[] = [];

      // Build dynamic UPDATE query
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'integrations' && value) {
          setParts.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else if (value !== undefined) {
          setParts.push(`${key} = ?`);
          params.push(value);
        }
      });

      if (setParts.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      setParts.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const query = `UPDATE tasks SET ${setParts.join(', ')} WHERE id = ?`;
      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);

      if (result.changes === 0) {
        return { success: false, error: 'Task not found' };
      }

      const task = this.getTaskById(id);
      return { success: true, data: task.data!, changes: result.changes };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  deleteTask(id: string): DatabaseResult<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = stmt.run(id);
      
      return { 
        success: result.changes > 0, 
        data: result.changes > 0,
        changes: result.changes 
      };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Project operations
  createProject(projectData: CreateProjectData): DatabaseResult<Project> {
    try {
      const id = projectData.id || this.generateId('proj_');
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO projects (
          id, name, description, color, icon, parent_id, sort_order,
          is_favorite, integrations, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        projectData.name,
        projectData.description || null,
        projectData.color || '#808080',
        projectData.icon || null,
        projectData.parent_id || null,
        projectData.sort_order || 0,
        projectData.is_favorite || false,
        projectData.integrations ? JSON.stringify(projectData.integrations) : null,
        now,
        now
      );

      const project = this.getProjectById(id);
      return { success: true, data: project.data!, changes: 1 };
    } catch (error) {
      console.error('Error creating project:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getProjectById(id: string): DatabaseResult<Project> {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      const row = stmt.get(id) as any;
      
      if (!row) {
        return { success: false, error: 'Project not found' };
      }

      const project = this.mapRowToProject(row);
      return { success: true, data: project };
    } catch (error) {
      console.error('Error getting project:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getProjects(filters: ProjectFilters = {}): DatabaseResult<Project[]> {
    try {
      let query = 'SELECT * FROM projects WHERE 1=1';
      const params: any[] = [];

      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query += ' AND parent_id IS NULL';
        } else {
          query += ' AND parent_id = ?';
          params.push(filters.parent_id);
        }
      }

      if (filters.is_favorite !== undefined) {
        query += ' AND is_favorite = ?';
        params.push(filters.is_favorite);
      }

      if (filters.is_archived !== undefined) {
        query += ' AND is_archived = ?';
        params.push(filters.is_archived);
      }

      if (filters.has_integration) {
        query += ` AND json_extract(integrations, '$.${filters.has_integration}') IS NOT NULL`;
      }

      if (filters.search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += ' ORDER BY sort_order ASC, name ASC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];
      
      const projects = rows.map(row => this.mapRowToProject(row));
      return { success: true, data: projects };
    } catch (error) {
      console.error('Error getting projects:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Integration operations
  updateTaskIntegration(taskId: string, integration: string, data: any): DatabaseResult<Task> {
    try {
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET integrations = json_set(
          COALESCE(integrations, '{}'),
          '$.' || ?, 
          ?
        ),
        updated_at = ?
        WHERE id = ?
      `);
      
      const result = stmt.run(
        integration,
        JSON.stringify(data),
        new Date().toISOString(),
        taskId
      );

      if (result.changes === 0) {
        return { success: false, error: 'Task not found' };
      }

      const task = this.getTaskById(taskId);
      return { success: true, data: task.data!, changes: result.changes };
    } catch (error) {
      console.error('Error updating task integration:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getTasksByIntegration(integration: string): DatabaseResult<Task[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE json_extract(t.integrations, '$.' || ?) IS NOT NULL
      `);
      
      const rows = stmt.all(integration) as any[];
      const tasks = rows.map(row => this.mapRowToTask(row));
      
      return { success: true, data: tasks };
    } catch (error) {
      console.error('Error getting tasks by integration:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Search operations
  searchTasks(searchTerm: string): DatabaseResult<Task[]> {
    return this.getTasks({ search: searchTerm });
  }

  // Statistics
  getTaskStatistics(): DatabaseResult<TaskStatistics> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks');
      const statusStmt = this.db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
      const projectStmt = this.db.prepare(`
        SELECT p.name, COUNT(t.id) as count 
        FROM projects p 
        LEFT JOIN tasks t ON p.id = t.project_id 
        GROUP BY p.id, p.name
      `);
      const contextStmt = this.db.prepare('SELECT context, COUNT(*) as count FROM tasks GROUP BY context');
      const energyStmt = this.db.prepare('SELECT energy_level, COUNT(*) as count FROM tasks GROUP BY energy_level');
      const overdueStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date < date('now') AND status != 'completed'
      `);

      const total = (totalStmt.get() as any).count;
      const statusRows = statusStmt.all() as any[];
      const projectRows = projectStmt.all() as any[];
      const contextRows = contextStmt.all() as any[];
      const energyRows = energyStmt.all() as any[];
      const overdue = (overdueStmt.get() as any).count;

      const stats: TaskStatistics = {
        total,
        completed: statusRows.find(r => r.status === 'completed')?.count || 0,
        pending: statusRows.find(r => r.status === 'pending')?.count || 0,
        in_progress: statusRows.find(r => r.status === 'in_progress')?.count || 0,
        overdue,
        by_project: Object.fromEntries(projectRows.map(r => [r.name, r.count])),
        by_context: Object.fromEntries(contextRows.map(r => [r.context, r.count])),
        by_energy_level: Object.fromEntries(energyRows.map(r => [r.energy_level, r.count])),
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Utility methods
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      project_id: row.project_id,
      parent_id: row.parent_id,
      priority: row.priority,
      status: row.status,
      due_date: row.due_date,
      due_time: row.due_time,
      estimated_duration: row.estimated_duration,
      actual_duration: row.actual_duration,
      energy_level: row.energy_level,
      context: row.context,
      focus_time: Boolean(row.focus_time),
      notes: row.notes,
      source_task: row.source_task ? JSON.parse(row.source_task) : undefined,
      integrations: row.integrations ? JSON.parse(row.integrations) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      
      // Joined data
      project_name: row.project_name,
      project_color: row.project_color,
    };
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      parent_id: row.parent_id,
      sort_order: row.sort_order,
      is_favorite: Boolean(row.is_favorite),
      is_archived: Boolean(row.is_archived),
      integrations: row.integrations ? JSON.parse(row.integrations) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private generateId(prefix: string = 'task_'): string {
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Database maintenance
  vacuum(): DatabaseResult<boolean> {
    try {
      this.db.exec('VACUUM');
      return { success: true, data: true };
    } catch (error) {
      console.error('Error running VACUUM:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  analyze(): DatabaseResult<boolean> {
    try {
      this.db.exec('ANALYZE');
      return { success: true, data: true };
    } catch (error) {
      console.error('Error running ANALYZE:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // For testing
  getDb(): Database.Database {
    return this.db;
  }
}
-- Openza Database Schema
-- Local-first task management with wrapper pattern for external integrations

-- Enable modern SQLite features
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- Core projects table with integration support
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#808080',
  icon TEXT,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Integration extensions (JSON)
  integrations TEXT, -- JSON: {"todoist": {"id": "123", "synced_at": "..."}}
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES projects(id)
);

-- Core tasks table with wrapper pattern
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  parent_id TEXT,
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date DATE,
  due_time TIME,
  
  -- Enhanced local features
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes  
  energy_level INTEGER DEFAULT 2, -- 1-5
  context TEXT DEFAULT 'work', -- work, personal, errands
  focus_time BOOLEAN DEFAULT FALSE,
  notes TEXT, -- Can be very large (1MB+)
  
  -- External task integration (wrapper pattern)
  source_task TEXT, -- JSON: Complete original external task
  integrations TEXT, -- JSON: Sync configuration and status
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_id) REFERENCES tasks(id)
);

-- Labels with integration support  
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#808080', 
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Integration extensions
  integrations TEXT, -- JSON: {"todoist": {"id": "123"}}
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task-label relationships
CREATE TABLE IF NOT EXISTS task_labels (
  task_id TEXT,
  label_id TEXT,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Time tracking
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER, -- calculated minutes
  description TEXT,
  energy_used INTEGER, -- 1-5 scale
  focus_quality INTEGER, -- 1-5 scale
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Task enhancements (notes, checkpoints, resources)
CREATE TABLE IF NOT EXISTS task_enhancements (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'note', 'checkpoint', 'resource'
  content TEXT NOT NULL, -- Can be large
  sort_order INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Integration configuration
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 'todoist', 'notion', etc.
  is_active BOOLEAN DEFAULT FALSE,
  config TEXT, -- JSON: Service configuration
  last_sync_at DATETIME,
  sync_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- JSON field indexes for external integrations
CREATE INDEX IF NOT EXISTS idx_tasks_todoist_id ON tasks(json_extract(source_task, '$.todoist.id'))
  WHERE json_extract(source_task, '$.todoist.id') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_enhancements_task_id ON task_enhancements(task_id);

-- Full-text search for notes and content
CREATE VIRTUAL TABLE IF NOT EXISTS task_search USING fts5(
  content='tasks',
  title, description, notes
);

-- Triggers to keep FTS index updated
CREATE TRIGGER IF NOT EXISTS task_search_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO task_search(rowid, title, description, notes) 
  VALUES (new.rowid, new.title, new.description, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS task_search_update AFTER UPDATE ON tasks BEGIN
  UPDATE task_search SET 
    title = new.title, 
    description = new.description, 
    notes = new.notes 
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS task_search_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM task_search WHERE rowid = old.rowid;
END;

-- Insert default data
INSERT OR IGNORE INTO projects (id, name, description, color, icon, created_at) VALUES 
  ('proj_inbox', 'Inbox', 'Default inbox for new tasks', '#808080', 'inbox', CURRENT_TIMESTAMP),
  ('proj_work', 'Work', 'Work-related tasks', '#3b82f6', 'briefcase', CURRENT_TIMESTAMP),
  ('proj_personal', 'Personal', 'Personal tasks and goals', '#10b981', 'user', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO labels (id, name, color, created_at) VALUES 
  ('label_urgent', 'urgent', '#ef4444', CURRENT_TIMESTAMP),
  ('label_important', 'important', '#f59e0b', CURRENT_TIMESTAMP),
  ('label_learning', 'learning', '#3b82f6', CURRENT_TIMESTAMP),
  ('label_review', 'review', '#8b5cf6', CURRENT_TIMESTAMP);
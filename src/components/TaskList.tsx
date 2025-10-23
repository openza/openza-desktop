import { useMemo } from 'react';
import { Task, Project } from '../types/database';
import TaskCard from './TaskCard';

export type TaskFilter = 
  | 'all' 
  | 'today' 
  | 'overdue' 
  | 'labeled'
  | { type: 'project'; projectId: string };

interface TaskListProps {
  tasks: Task[];
  projects?: Project[];
  filter: TaskFilter;
  title: string;
  emptyMessage?: string;
  className?: string;
  sortByLabels?: boolean;
  sortByProject?: boolean;
  hideTitle?: boolean;
  onTaskClick?: (task: Task, event?: React.MouseEvent) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  projects = [],
  filter,
  title,
  emptyMessage = "No tasks found",
  sortByLabels = false,
  sortByProject = false,
  hideTitle = false,
  onTaskClick
}) => {
  // Create project map for quick lookups
  const projectMap = useMemo(() => {
    return new Map(projects.map(project => [project.id, project]));
  }, [projects]);

  // Filter and sort tasks based on the filter type
  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let filtered = tasks.filter(task => task.status !== 'completed');

    switch (filter) {
      case 'all':
        break;
      
      case 'today':
        filtered = filtered.filter(task => 
          task.due_date === today
        );
        break;
      
      case 'overdue':
        filtered = filtered.filter(task => 
          task.due_date && task.due_date < today
        );
        break;
      
      case 'labeled':
        filtered = filtered.filter(task => 
          task.labels && task.labels.length > 0
        );
        break;
      
      default:
        if (typeof filter === 'object' && filter.type === 'project') {
          filtered = filtered.filter(task => task.project_id === filter.projectId);
        }
        break;
    }

    // Apply sorting based on priority: labels > project > default
    return filtered.sort((a, b) => {
      // Sort by labels if requested (highest priority)
      if (sortByLabels) {
        // Get first label for each task (for sorting)
        const aFirstLabel = a.labels?.[0]?.name || '';
        const bFirstLabel = b.labels?.[0]?.name || '';
        
        // Tasks without labels go to the end
        if (!a.labels || a.labels.length === 0) return 1;
        if (!b.labels || b.labels.length === 0) return -1;
        
        // Sort alphabetically by first label
        const labelComparison = aFirstLabel.localeCompare(bFirstLabel);
        if (labelComparison !== 0) return labelComparison;
        
        // If labels are the same, fall through to secondary sorting
      }
      
      // Sort by project if requested (and not overridden by labels)
      if (sortByProject && !sortByLabels) {
        // Get project names for sorting
        const aProject = projectMap.get(a.project_id || '');
        const bProject = projectMap.get(b.project_id || '');
        const aProjectName = aProject?.name || 'No Project';
        const bProjectName = bProject?.name || 'No Project';
        
        // Tasks without projects go to the end
        if (!a.project_id && b.project_id) return 1;
        if (a.project_id && !b.project_id) return -1;
        
        // Sort alphabetically by project name
        const projectComparison = aProjectName.localeCompare(bProjectName);
        if (projectComparison !== 0) return projectComparison;
        
        // If projects are the same, fall through to secondary sorting
      }
      
      // Secondary sorting: priority, then due date, then created date
      // Priority first (1 = highest, 4 = lowest)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Due date second (earlier dates first, null dates last)
      if (a.due_date && b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      
      // Created date last (newest first)
      return b.created_at.localeCompare(a.created_at);
    });
  }, [tasks, filter, sortByLabels, sortByProject, projectMap]);

  const shouldShowProjectBadge = filter === 'all' || filter === 'today' || filter === 'overdue' || filter === 'labeled' || (typeof filter === 'object' && Object.keys(filter).length === 0);
  const isOverdueView = filter === 'overdue';

  return (
    <div className={hideTitle ? "h-full flex flex-col" : "h-full bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100 flex flex-col"}>
      {!hideTitle && (
        <h1 className="text-lg sm:text-xl font-semibold text-foreground mb-3 truncate">
          {title}
        </h1>
      )}
      <div className="flex-1 overflow-hidden">
        <div className={`${hideTitle ? 'h-full' : 'bg-white rounded-2xl shadow-xl'} p-3 h-full flex flex-col`}>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1">
            {filteredTasks.map((task) => {
              const taskProject = projectMap.get(task.project_id || '');
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  project={taskProject}
                  onTaskClick={onTaskClick || (() => {})}
                  showProjectBadge={shouldShowProjectBadge}
                  variant={isOverdueView ? 'overdue' : 'default'}
                />
              );
            })}
              {filteredTasks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
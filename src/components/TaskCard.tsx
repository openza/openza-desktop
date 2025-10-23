import { Task, Project } from '../types/database';
import LabelBadge, { getLabelColor } from './LabelBadge';
import { formatDueDate } from '../utils/dateUtils';
import { cn } from '@/lib/utils';

// Priority configuration - provider-specific
const PRIORITY_CONFIG = {
  // Default/Unified system
  default: {
    1: { label: 'High', color: 'bg-red-500', textColor: 'text-white', icon: '🔥' },
    2: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-white', icon: '⚡' },
    3: { label: 'Normal', color: 'bg-blue-500', textColor: 'text-white', icon: '📋' },
    4: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white', icon: '⏳' },
  },
  // MS To-Do specific (uses "Important" terminology)
  msToDo: {
    1: { label: 'Important', color: 'bg-blue-600', textColor: 'text-white', icon: '⭐' },
    2: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-white', icon: '⚡' },
    3: { label: 'Normal', color: 'bg-blue-500', textColor: 'text-white', icon: '📋' },
    4: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white', icon: '⏳' },
  },
  // Todoist specific
  todoist: {
    1: { label: 'High', color: 'bg-red-500', textColor: 'text-white', icon: '🔥' },
    2: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-white', icon: '⚡' },
    3: { label: 'Normal', color: 'bg-blue-500', textColor: 'text-white', icon: '📋' },
    4: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white', icon: '⏳' },
  },
} as const;

type TaskProvider = 'msToDo' | 'todoist' | 'default';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onTaskClick: (task: Task, event?: React.MouseEvent) => void;
  showProjectBadge?: boolean;
  variant?: 'default' | 'overdue';
  className?: string;
  showPriority?: boolean;
}

// Priority Badge Component
const PriorityBadge: React.FC<{ 
  priority: number; 
  variant?: 'default' | 'compact' | 'text';
  provider?: TaskProvider;
}> = ({ 
  priority, 
  variant = 'default',
  provider = 'default'
}) => {
  const providerConfig = PRIORITY_CONFIG[provider] || PRIORITY_CONFIG.default;
  const config = providerConfig[priority as keyof typeof providerConfig] || providerConfig[2];
  
  if (variant === 'compact') {
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 text-xs font-medium rounded-full',
          config.color,
          config.textColor
        )}
        title={`Priority: ${config.label}`}
      >
        {priority}
      </span>
    );
  }
  
  if (variant === 'text') {
    return (
      <span 
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md',
          config.color,
          config.textColor
        )}
        title={`Priority: ${config.label}`}
      >
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </span>
    );
  }
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
        config.color,
        config.textColor
      )}
      title={`Priority: ${config.label}`}
    >
      <span className="text-xs">{config.icon}</span>
      {priority}
    </span>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onTaskClick,
  showProjectBadge = true,
  variant = 'default',
  className,
  showPriority = true
}) => {
  // Determine task provider for context-specific priority display
  const getTaskProvider = (): TaskProvider => {
    if (task.source_task?.msToDo) return 'msToDo';
    if (task.source_task?.todoist) return 'todoist';
    return 'default';
  };

  const taskProvider = getTaskProvider();

  // Get border color from first label if available
  const getBorderClass = () => {
    if (variant === 'overdue') return 'border-red-100';
    
    if (task.labels && task.labels.length > 0) {
      const firstLabel = task.labels[0];
      if (firstLabel) {
        const labelColors = getLabelColor(firstLabel.color);
        return labelColors.border;
      }
    }
    
    return 'border-gray-100';
  };
  
  const borderClass = getBorderClass();

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 xl:p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 border cursor-pointer overflow-hidden hover:shadow-sm',
        borderClass,
        className
      )}
      onClick={(e) => onTaskClick(task, e)}
    >
      <input
        type="checkbox"
        checked={task.status === 'completed'}
        className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500 flex-shrink-0 mt-0.5"
        readOnly
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3
            className={cn(
              'text-xs sm:text-sm font-medium truncate flex-1',
              task.status === 'completed'
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            )}
          >
{(task as { title?: string; content?: string }).title || (task as { title?: string; content?: string }).content}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {task.labels.slice(0, 2).map((label) => (
                  <LabelBadge 
                    key={label.id} 
                    label={label} 
                    variant="small"
                  />
                ))}
                {task.labels.length > 2 && (
                  <span className="text-xs text-gray-500 font-normal">
                    +{task.labels.length - 2}
                  </span>
                )}
              </div>
            )}
            {/* Priority Badge - moved to right, only show for High and Medium */}
            {showPriority && (task.priority === 1 || task.priority === 2) && (
              <PriorityBadge priority={task.priority} variant="text" provider={taskProvider} />
            )}
          </div>
        </div>
        
        {task.description && (
          <p className="text-gray-500 text-xs mt-1 line-clamp-2 break-words">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project name - moved to left side */}
            {project && showProjectBadge && (
              <span className="text-xs text-gray-600 font-normal flex-shrink-0">
                {project.name}
              </span>
            )}
            
            {task.due_date && (
              <p className={cn(
                'text-xs truncate font-normal',
                (() => {
                  const dueInfo = formatDueDate(task.due_date);
                  if (variant === 'overdue' || dueInfo.isOverdue) {
                    return 'text-red-600';
                  } else if (dueInfo.isToday) {
                    return 'text-orange-600';
                  } else if (dueInfo.isTomorrow) {
                    return 'text-blue-600';
                  } else {
                    return 'text-gray-600';
                  }
                })()
              )}>
                {(() => {
                  const dueInfo = formatDueDate(task.due_date);
                  return dueInfo.text;
                })()}
              </p>
            )}
            
            {/* Enhanced local features indicators */}
            <div className="flex items-center gap-1">
              {task.energy_level && task.energy_level > 2 && (
                <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-700 rounded">
                  {task.energy_level === 3 && '🟠'}
                  {task.energy_level === 4 && '🔴'}
                  {task.energy_level === 5 && '⚡'}
                </span>
              )}
              {task.focus_time && (
                <span className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded">
                  🧠
                </span>
              )}
              {task.estimated_duration && (
                <span className="text-xs text-gray-500">
                  {task.estimated_duration}min
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Task source indicator - subtle */}
            {!task.source_task ? (
              <span className="text-xs px-1 py-0.5 text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                Local
              </span>
            ) : task.source_task.todoist ? (
              <span className="text-xs px-1 py-0.5 text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                Todoist
              </span>
            ) : task.source_task.msToDo ? (
              <span className="text-xs px-1 py-0.5 text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                MS To-Do
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
export { PriorityBadge, PRIORITY_CONFIG };
export type { TaskProvider };
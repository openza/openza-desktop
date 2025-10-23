import React from 'react';
import { X } from 'lucide-react';
import ProjectBadge from './ProjectBadge';
import LabelBadge from './LabelBadge';
import { formatDueDate, formatCreatedDate } from '../utils/dateUtils';
import type { Task, Project } from '../types/database';
import type { Label } from '@doist/todoist-api-typescript';



interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  isModal?: boolean; // Optional prop to distinguish between modal and panel styling/layout if needed
  project?: Project; // Optional project information
  labels?: Label[]; // Optional labels information
  hideCloseButton?: boolean; // Optional prop to hide the close button (for tabs)
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose, isModal, project, labels = [], hideCloseButton = false }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 truncate flex-1 mr-2">
          {task.title}
        </h2>
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      <div className={`${isModal ? 'space-y-6' : 'space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]'}`}>

        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-gray-900 whitespace-pre-wrap break-words">{task.description}</p>
          </div>
        )}

        {task.due_date && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
            <p className={`font-medium ${(() => {
              const dueInfo = formatDueDate(task.due_date);
              if (dueInfo.isOverdue && task.status !== 'completed') {
                return 'text-red-600';
              } else if (dueInfo.isToday) {
                return 'text-orange-600';
              } else if (dueInfo.isTomorrow) {
                return 'text-blue-600';
              } else {
                return 'text-gray-900';
              }
            })()}`}>
              {formatDueDate(task.due_date).text}
              {task.source_task?.todoist?.due?.isRecurring && ' ↻'}
            </p>
          </div>
        )}

        {project && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Project</h3>
            <ProjectBadge project={project} variant="full" />
          </div>
        )}

        {task.source_task?.todoist?.labels && task.source_task.todoist.labels.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {task.source_task.todoist.labels.map((labelName) => {
                const labelObj = labels.find(l => l.name === labelName);
                if (!labelObj) return null;
                return (
                  <LabelBadge 
                    key={labelObj.id} 
                    label={labelObj} 
                    variant="default"
                  />
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
          <p className="text-gray-900">
            {task.status === 'completed' ? 'Completed' : 'Active'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
          <p className="text-gray-900">
            {formatCreatedDate(task.created_at)}
          </p>
        </div>

        {task.status === 'completed' && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Completed At</h3>
            <p className="text-gray-900">
              {task.completed_at ? formatCreatedDate(task.completed_at) : 'Completed'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;

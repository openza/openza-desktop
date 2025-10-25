import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import ProjectBadge from './ProjectBadge';
import LabelBadge from './LabelBadge';
import { formatDueDate, formatCreatedDate } from '../utils/dateUtils';
import { useDeleteTask } from '../hooks/useDatabase';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteTaskMutation = useDeleteTask();

  // Check if this is a local task (can be deleted)
  const isLocalTask = !task.source_task;

  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Task deleted successfully');
      setShowDeleteDialog(false);
      onClose(); // Close the detail view after deletion
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDeleting(false);
    }
  };
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

        {/* Labels - Show for both local tasks and Todoist tasks */}
        {((task.labels && task.labels.length > 0) || (task.source_task?.todoist?.labels && task.source_task.todoist.labels.length > 0)) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Labels</h3>
            <div className="flex flex-wrap gap-2">
              {/* Local task labels */}
              {task.labels && task.labels.map((label) => (
                <LabelBadge
                  key={label.id}
                  label={label}
                  variant="default"
                />
              ))}

              {/* Todoist task labels */}
              {task.source_task?.todoist?.labels && task.source_task.todoist.labels.map((labelName) => {
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

        {/* Delete button - only for local tasks */}
        {isLocalTask && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-slate-900">Delete Task</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{task.title}"</span>?
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <span className="animate-pulse">Deleting...</span>
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskDetail;

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useCreateTask, useProjects } from '../hooks/useDatabase';
import { CreateTaskData } from '../types/database';
import { toast } from 'sonner';
import { Calendar, Flag, ChevronDown } from 'lucide-react';

interface CreateTaskFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

export function CreateTaskForm({ onClose, onSuccess, defaultProjectId }: CreateTaskFormProps) {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    project_id: defaultProjectId || '',
    priority: 2,
    notes: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDetails, setShowDetails] = useState(false);

  const { data: projects } = useProjects();
  const createTaskMutation = useCreateTask();

  // Find the Inbox project to use as default
  const inboxProject = useMemo(() => {
    return projects?.find(p => p.name.toLowerCase() === 'inbox');
  }, [projects]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate title
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    // Validate due date (warn if in the past)
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        errors.due_date = 'Due date is in the past';
      }
    }

    // Validate defer_until (must be in future if set)
    if (formData.defer_until) {
      const deferDate = new Date(formData.defer_until);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deferDate < today) {
        errors.defer_until = 'Defer until date must be in the future';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    try {
      // Prepare task data with Inbox fallback
      const taskData: CreateTaskData = {
        ...formData,
        // If no project selected, use Inbox as default
        project_id: formData.project_id || inboxProject?.id || undefined,
      };

      await createTaskMutation.mutateAsync(taskData);

      // Show success toast
      toast.success('Task created successfully!');

      // Reset form
      setFormData({
        title: '',
        project_id: defaultProjectId || '',
        priority: 2,
        notes: '',
      });
      setValidationErrors({});
      setShowDetails(false);

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  const handleInputChange = (field: keyof CreateTaskData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const priorityLabels = {
    1: { label: 'High', color: 'text-red-600' },
    2: { label: 'Medium', color: 'text-yellow-600' },
    3: { label: 'Normal', color: 'text-green-600' },
    4: { label: 'Low', color: 'text-gray-500' },
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="p-4">
        {/* Task name input */}
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Task name"
          className="w-full text-lg font-medium border-none outline-none mb-2 placeholder-gray-400"
          required
          autoFocus
        />

        {/* Notes/Description */}
        <textarea
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Notes (Markdown supported)"
          rows={2}
          className="w-full text-sm border-none outline-none resize-none placeholder-gray-400 mb-3"
        />

        {/* Quick actions row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Due Date */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            {formData.due_date || 'Date'}
          </button>

          {/* Priority */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <Flag className="h-4 w-4" />
            <span className={priorityLabels[formData.priority as keyof typeof priorityLabels]?.color}>
              {priorityLabels[formData.priority as keyof typeof priorityLabels]?.label || 'Medium'}
            </span>
          </button>

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <span>···</span>
          </button>
        </div>

        {/* Expandable details section */}
        {showDetails && (
          <div className="border-t border-gray-200 pt-3 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Due Date */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => handleInputChange('due_date', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {validationErrors.due_date && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ {validationErrors.due_date}</p>
                )}
              </div>

              {/* Defer Until */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Defer Until</label>
                <input
                  type="date"
                  value={formData.defer_until || ''}
                  onChange={(e) => handleInputChange('defer_until', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {validationErrors.defer_until && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {validationErrors.defer_until}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  value={formData.priority || 2}
                  onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={1}>🔴 High</option>
                  <option value={2}>🟡 Medium</option>
                  <option value={3}>🟢 Normal</option>
                  <option value={4}>⚪ Low</option>
                </select>
              </div>

              {/* Project - only show if different from default */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Project</label>
                <select
                  value={formData.project_id || ''}
                  onChange={(e) => handleInputChange('project_id', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Inbox</option>
                  {projects?.filter(p => p.name.toLowerCase() !== 'inbox').map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer with project selector and buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          {/* Project selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <span>📥</span>
              <span>{projects?.find(p => p.id === formData.project_id)?.name || 'Inbox'}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!formData.title.trim() || createTaskMutation.isPending}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {createTaskMutation.isPending ? 'Adding...' : 'Add task'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

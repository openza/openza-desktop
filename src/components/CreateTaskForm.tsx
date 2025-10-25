import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useCreateTask, useProjects } from '../hooks/useDatabase';
import { CreateTaskData } from '../types/database';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

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
  const [notesExpanded, setNotesExpanded] = useState(false);

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
      toast.success('Task created successfully!', {
        description: taskData.project_id ? `Added to ${projects?.find(p => p.id === taskData.project_id)?.name || 'project'}` : 'Added to Inbox',
      });

      // Reset form
      setFormData({
        title: '',
        project_id: defaultProjectId || '',
        priority: 2,
        notes: '',
      });
      setValidationErrors({});

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-3xl w-full shadow-xl border-0">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">+</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Task</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Quick capture with rich notes support
              </p>
            </div>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2 text-gray-700">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="What needs to be done?"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
              validationErrors.title
                ? 'border-red-500 focus:ring-red-500 focus:border-transparent'
                : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }`}
            required
            autoFocus
          />
          {validationErrors.title && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span> {validationErrors.title}
            </p>
          )}
        </div>

        {/* Notes - Expandable textarea with markdown hint */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                  Markdown formatting supported
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {notesExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <div className="relative">
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional details, notes, or thoughts... (Markdown supported)"
              rows={notesExpanded ? 12 : 4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none transition-all"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Markdown supported: headers, lists, links, code blocks, etc.
          </p>
        </div>

        {/* Two column layout for metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Project */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium mb-2 text-gray-700">
              Project
            </label>
            <select
              id="project"
              value={formData.project_id || ''}
              onChange={(e) => handleInputChange('project_id', e.target.value || undefined)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
            >
              <option value="">No Project (defaults to Inbox)</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-2 text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority || 2}
              onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
            >
              <option value={1}>🔴 High</option>
              <option value={2}>🟡 Medium</option>
              <option value={3}>🟢 Normal</option>
              <option value={4}>⚪ Low</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium mb-2 text-gray-700">
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => handleInputChange('due_date', e.target.value || undefined)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                validationErrors.due_date
                  ? 'border-yellow-500 focus:ring-yellow-500 focus:border-transparent'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            {validationErrors.due_date && (
              <p className="mt-1.5 text-sm text-yellow-600 flex items-center gap-1">
                <span>⚠️</span> {validationErrors.due_date}
              </p>
            )}
          </div>

          {/* Defer Until */}
          <div>
            <label htmlFor="defer_until" className="block text-sm font-medium mb-2 text-gray-700">
              Defer Until
            </label>
            <input
              id="defer_until"
              type="date"
              value={formData.defer_until || ''}
              onChange={(e) => handleInputChange('defer_until', e.target.value || undefined)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                validationErrors.defer_until
                  ? 'border-red-500 focus:ring-red-500 focus:border-transparent'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
              }`}
            />
            {validationErrors.defer_until && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span> {validationErrors.defer_until}
              </p>
            )}
            {!validationErrors.defer_until && (
              <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                Hide task until this date (GTD "Someday/Maybe")
              </p>
            )}
          </div>
        </div>

        {/* TODO: Add Tags/Labels multi-select component
             - Requires implementing getLabels() in DatabaseManager
             - Requires implementing assignLabelsToTask() in DatabaseManager
             - Requires adding useLabels hook in useDatabase.ts
             - Will sync with Todoist labels and MS To-Do categories
        */}

        {/* Submit Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
              <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Local Task
            </span>
          </div>
          <div className="flex gap-3">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} className="px-6">
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!formData.title.trim() || createTaskMutation.isPending}
              className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
    </div>
  );
}

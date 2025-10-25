import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useCreateTask, useProjects, useLabels, useAssignLabelsToTask, useCreateLabel } from '../hooks/useDatabase';
import { CreateTaskData } from '../types/database';
import { toast } from 'sonner';
import { Calendar, Flag, ChevronDown, Tag, X, MoreHorizontal, Zap } from 'lucide-react';

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
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Individual popover states
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [showPriorityPopover, setShowPriorityPopover] = useState(false);
  const [showLabelsPopover, setShowLabelsPopover] = useState(false);
  const [showProjectPopover, setShowProjectPopover] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Label creation
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const { data: projects } = useProjects();
  const { data: labels } = useLabels();
  const createTaskMutation = useCreateTask();
  const assignLabelsMutation = useAssignLabelsToTask();
  const createLabelMutation = useCreateLabel();

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

      const task = await createTaskMutation.mutateAsync(taskData);

      // Assign labels to the task if any selected
      if (selectedLabelIds.length > 0) {
        await assignLabelsMutation.mutateAsync({
          taskId: task.id,
          labelIds: selectedLabelIds
        });
      }

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
      setSelectedLabelIds([]);

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

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      const newLabel = await createLabelMutation.mutateAsync({
        name: newLabelName,
        color: '#808080', // Default gray color
      });

      // Add newly created label to selected labels
      setSelectedLabelIds(prev => [...prev, newLabel.id]);
      setNewLabelName('');
      setIsCreatingLabel(false);
      toast.success(`Label "${newLabelName}" created!`);
    } catch (error) {
      toast.error('Failed to create label');
    }
  };

  const priorityOptions = [
    { value: 1, label: 'High', icon: '🔴', color: 'text-red-600', description: 'Do first' },
    { value: 2, label: 'Medium', icon: '🟡', color: 'text-yellow-600', description: 'Important' },
    { value: 3, label: 'Normal', icon: '🟢', color: 'text-green-600', description: 'Standard' },
    { value: 4, label: 'Low', icon: '⚪', color: 'text-gray-500', description: 'When possible' },
  ];

  const currentPriority = priorityOptions.find(p => p.value === formData.priority) || priorityOptions[1];

  // Date shortcuts
  const getDateShortcuts = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return [
      { label: 'Today', date: today.toISOString().split('T')[0], subtitle: 'Sat' },
      { label: 'Tomorrow', date: tomorrow.toISOString().split('T')[0], subtitle: 'Sun' },
      { label: 'End of week', date: endOfWeek.toISOString().split('T')[0], subtitle: endOfWeek.toLocaleDateString('en-US', { weekday: 'short' }) },
      { label: 'Next week', date: nextWeek.toISOString().split('T')[0], subtitle: nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
    ];
  };

  const selectedProject = projects?.find(p => p.id === formData.project_id);
  const selectedLabelsData = labels?.filter(l => selectedLabelIds.includes(l.id)) || [];

  return (
    <Card className="max-w-2xl mx-auto border-slate-200">
      <form onSubmit={handleSubmit} className="p-4">
        {/* Task name input */}
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Task name"
          className="w-full text-lg font-medium border-none outline-none mb-2 placeholder-gray-400 focus:ring-0"
          required
          autoFocus
        />

        {/* Notes/Description */}
        <textarea
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Notes (Markdown supported)"
          rows={2}
          className="w-full text-sm border-none outline-none resize-none placeholder-gray-400 mb-3 focus:ring-0"
        />

        {/* Quick actions row with popovers */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Date Popover */}
          <Popover open={showDatePopover} onOpenChange={setShowDatePopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                {formData.due_date || 'Date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                {getDateShortcuts().map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() => {
                      handleInputChange('due_date', shortcut.date);
                      setShowDatePopover(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors text-left"
                  >
                    <span className="font-medium text-slate-700">{shortcut.label}</span>
                    <span className="text-xs text-slate-500">{shortcut.subtitle}</span>
                  </button>
                ))}
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => {
                      handleInputChange('due_date', e.target.value || undefined);
                      setShowDatePopover(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {formData.due_date && (
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('due_date', undefined);
                      setShowDatePopover(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Clear date
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Priority Popover */}
          <Popover open={showPriorityPopover} onOpenChange={setShowPriorityPopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <Flag className="h-4 w-4" />
                <span className={currentPriority.color}>{currentPriority.label}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <div className="space-y-1">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => {
                      handleInputChange('priority', priority.value);
                      setShowPriorityPopover(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors text-left"
                  >
                    <span className="text-lg">{priority.icon}</span>
                    <div className="flex-1">
                      <div className={`font-medium ${priority.color}`}>{priority.label}</div>
                      <div className="text-xs text-slate-500">{priority.description}</div>
                    </div>
                    {formData.priority === priority.value && (
                      <span className="text-amber-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Labels Popover */}
          <Popover open={showLabelsPopover} onOpenChange={setShowLabelsPopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <Tag className="h-4 w-4" />
                {selectedLabelIds.length > 0 ? `${selectedLabelIds.length} label${selectedLabelIds.length > 1 ? 's' : ''}` : 'Labels'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2">
                {/* Label list */}
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {labels && labels.length > 0 ? (
                    labels.map((label) => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => {
                          setSelectedLabelIds(prev =>
                            prev.includes(label.id)
                              ? prev.filter(id => id !== label.id)
                              : [...prev, label.id]
                          );
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors text-left"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLabelIds.includes(label.id)}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="flex-1 text-slate-700">{label.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500 text-center">
                      No labels yet
                    </div>
                  )}
                </div>

                {/* Create new label */}
                <div className="pt-2 border-t border-slate-200">
                  {isCreatingLabel ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateLabel();
                          } else if (e.key === 'Escape') {
                            setIsCreatingLabel(false);
                            setNewLabelName('');
                          }
                        }}
                        placeholder="Label name"
                        className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateLabel}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingLabel(true)}
                      className="w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded transition-colors flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Create new label
                    </button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Project Popover */}
          <Popover open={showProjectPopover} onOpenChange={setShowProjectPopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <span>📁</span>
                {selectedProject?.name || 'Inbox'}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <div className="max-h-64 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('project_id', undefined);
                    setShowProjectPopover(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors text-left"
                >
                  <span>📥</span>
                  <span className="flex-1">Inbox</span>
                  {!formData.project_id && (
                    <span className="text-amber-600">✓</span>
                  )}
                </button>
                {projects?.filter(p => p.name.toLowerCase() !== 'inbox').map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      handleInputChange('project_id', project.id);
                      setShowProjectPopover(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors text-left"
                  >
                    <span style={{ color: project.color }}>●</span>
                    <span className="flex-1">{project.name}</span>
                    {formData.project_id === project.id && (
                      <span className="text-amber-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Selected labels chips */}
        {selectedLabelsData.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedLabelsData.map(label => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-800 rounded-full border border-amber-200"
              >
                {label.name}
                <button
                  type="button"
                  onClick={() => setSelectedLabelIds(prev => prev.filter(id => id !== label.id))}
                  className="hover:bg-amber-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Expandable more options */}
        {showMoreOptions && (
          <div className="border-t border-slate-200 pt-3 mb-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Defer Until (Someday/Maybe)
              </label>
              <input
                type="date"
                value={formData.defer_until || ''}
                onChange={(e) => handleInputChange('defer_until', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {validationErrors.defer_until && (
                <p className="text-xs text-red-600 mt-1">⚠️ {validationErrors.defer_until}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Task will be hidden until this date (GTD tickler file)
              </p>
            </div>
          </div>
        )}

        {/* Footer with action buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!formData.title.trim() || createTaskMutation.isPending}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md transition-all"
          >
            {createTaskMutation.isPending ? (
              <>
                <Zap className="h-4 w-4 mr-1 animate-pulse" />
                Adding...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1" />
                Add task
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useCreateTask, useProjects } from '../hooks/useDatabase';
import { CreateTaskData, TaskContext } from '../types/database';

interface CreateTaskFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

export function CreateTaskForm({ onClose, onSuccess, defaultProjectId }: CreateTaskFormProps) {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    project_id: defaultProjectId || '',
    priority: 2,
    context: 'work' as TaskContext,
    energy_level: 2,
    focus_time: false,
    notes: '',
  });

  const { data: projects } = useProjects();
  const createTaskMutation = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    try {
      await createTaskMutation.mutateAsync(formData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        project_id: defaultProjectId || '',
        priority: 2,
        context: 'work' as TaskContext,
        energy_level: 2,
        focus_time: false,
        notes: '',
      });
      
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleInputChange = (field: keyof CreateTaskData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="p-6 max-w-2xl">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Create Local Task</h2>
        <p className="text-sm text-gray-600 mt-1">
          Create a new task with enhanced local features
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional details..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Two column layout for smaller fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium mb-1">
              Project
            </label>
            <select
              id="project"
              value={formData.project_id || ''}
              onChange={(e) => handleInputChange('project_id', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Project</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority || 2}
              onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>🔴 High</option>
              <option value={2}>🟡 Medium</option>
              <option value={3}>🟢 Normal</option>
              <option value={4}>⚪ Low</option>
            </select>
          </div>

          {/* Context */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium mb-1">
              Context
            </label>
            <select
              id="context"
              value={formData.context || 'work'}
              onChange={(e) => handleInputChange('context', e.target.value as TaskContext)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="work">💼 Work</option>
              <option value="personal">👤 Personal</option>
              <option value="errands">🏃 Errands</option>
              <option value="home">🏠 Home</option>
              <option value="office">🏢 Office</option>
            </select>
          </div>

          {/* Energy Level */}
          <div>
            <label htmlFor="energy" className="block text-sm font-medium mb-1">
              Energy Level
            </label>
            <select
              id="energy"
              value={formData.energy_level || 2}
              onChange={(e) => handleInputChange('energy_level', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>🟢 Low</option>
              <option value={2}>🟡 Medium</option>
              <option value={3}>🟠 High</option>
              <option value={4}>🔴 Peak</option>
              <option value={5}>⚡ Flow State</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium mb-1">
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => handleInputChange('due_date', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estimated Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium mb-1">
              Est. Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="5"
              step="5"
              value={formData.estimated_duration || ''}
              onChange={(e) => handleInputChange('estimated_duration', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Focus Time Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            id="focus_time"
            type="checkbox"
            checked={formData.focus_time || false}
            onChange={(e) => handleInputChange('focus_time', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="focus_time" className="text-sm font-medium">
            🧠 Requires deep focus
          </label>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Any additional notes or thoughts..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!formData.title.trim() || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>

      {/* Badge indicator */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Local Task</span>
          </span>
          <span>Enhanced features: time tracking, energy levels, context</span>
        </div>
      </div>
    </Card>
  );
}
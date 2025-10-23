import React from 'react';
import { useTaskSource } from '../contexts/TaskSourceContext';
import { useAuth } from '../hooks/useAuth';

interface TaskSourceSelectorProps {
  className?: string;
}

const TaskSourceSelector: React.FC<TaskSourceSelectorProps> = ({ className = '' }) => {
  const { taskSource, setTaskSource, availableSources, getSourceLabel } = useTaskSource();
  const { activeProvider, providers } = useAuth();

  if (!availableSources.provider) {
    // If no providers are available, don't show the dropdown
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="task-source-select" className="text-sm text-gray-600 whitespace-nowrap">
        Source:
      </label>
      <select
        id="task-source-select"
        value={taskSource}
        onChange={(e) => setTaskSource(e.target.value as any)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="local">Local Only</option>
        {availableSources.provider && (
          <option value="provider">
            {activeProvider === 'todoist' ? 'Todoist Only' : 'Microsoft To-Do Only'}
          </option>
        )}
        {availableSources.all && <option value="all">All Sources</option>}
      </select>
    </div>
  );
};

export default TaskSourceSelector;
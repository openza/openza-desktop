import { useState, useMemo } from 'react';
import LabelBadge from './LabelBadge';
import TasksWithTabs from './TasksWithTabs';
import { useGlobalTasks } from '../hooks/useGlobalTasks';

const NextAction = () => {
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);

  const { tasks, projects, isLoading, error } = useGlobalTasks();

  // Get unique labels from labeled tasks with counts - works with both Todoist and Microsoft To-Do
  const availableLabels = useMemo(() => {
    if (!tasks) return [];
    const labeledTasks = tasks.filter(task => 
      task.status !== 'completed' && task.labels && task.labels.length > 0
    );
    const labelCounts = new Map<string, { id: string; name: string; color: string; count: number }>();
    
    labeledTasks.forEach(task => {
      task.labels?.forEach(label => {
        if (labelCounts.has(label.name)) {
          // Increment count for existing label
          const existing = labelCounts.get(label.name)!;
          labelCounts.set(label.name, { ...existing, count: existing.count + 1 });
        } else {
          // Add new label with count of 1
          labelCounts.set(label.name, {
            id: label.id,
            name: label.name,
            color: label.color || '#808080',
            count: 1
          });
        }
      });
    });
    
    return Array.from(labelCounts.values());
  }, [tasks]);

  // Filter tasks by selected label - works with both Todoist and Microsoft To-Do
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!selectedLabelFilter) return tasks;
    return tasks.filter(task => 
      task.labels?.some(label => label.name === selectedLabelFilter)
    );
  }, [tasks, selectedLabelFilter]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            Loading next actions...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading next actions:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">
            Error loading next actions
          </h2>
          <p className="text-gray-600">
            {error instanceof Error
              ? error.message
              : 'Please try again later'}
          </p>
        </div>
      </div>
    );
  }

  if (!tasks || !projects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            No next actions available
          </h2>
        </div>
      </div>
    );
  }

  const totalLabeledTasks = tasks ? tasks.filter(task => 
    task.status !== 'completed' && task.labels && task.labels.length > 0
  ).length : 0;

  const labelFilters = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setSelectedLabelFilter(null)}
        className={`px-4 py-2 rounded-full text-sm font-normal transition-colors ${
          selectedLabelFilter === null
            ? 'bg-gray-900 text-white'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        All Labels ({totalLabeledTasks})
      </button>
      {availableLabels.map((label) => (
        <button
          key={label.id}
          onClick={() => setSelectedLabelFilter(label.name)}
          className="transition-all duration-200 hover:scale-105"
        >
          <LabelBadge 
            label={label} 
            variant="default"
            isSelected={selectedLabelFilter === label.name}
            count={label.count}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white">
        {labelFilters}
      </div>
      <div className="flex-1 overflow-hidden">
        <TasksWithTabs
          tasks={filteredTasks.filter(task => task.status !== 'completed' && task.labels && task.labels.length > 0)}
          projects={projects}
          filter={{}}
          title="Next Actions"
          emptyMessage={selectedLabelFilter ? `No tasks with "${selectedLabelFilter}" label` : "No labeled tasks found"}
          sortByLabels={true}
          hideTitle={true}
        />
      </div>
    </div>
  );
};

export default NextAction;
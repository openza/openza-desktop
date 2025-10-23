import { useMemo } from 'react';
import TasksWithTabs from './TasksWithTabs';
import { useGlobalTasks } from '../hooks/useGlobalTasks';

const Overdue = () => {

  const { tasks, projects, isLoading, error } = useGlobalTasks();

  // Filter overdue tasks
  const overdueTasks = useMemo(() => {
    if (!tasks) return [];
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => 
      task.status !== 'completed' && task.due_date && task.due_date < today
    );
  }, [tasks]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            Loading tasks...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading tasks:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-purple-100">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">
            Error loading tasks
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
            No tasks available
          </h2>
        </div>
      </div>
    );
  }

  return (
    <TasksWithTabs
      tasks={overdueTasks}
      projects={projects}
      filter={{}}
      title="Overdue"
      emptyMessage="No overdue tasks"
      className="h-full"
    />
  );
};

export default Overdue;

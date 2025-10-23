import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LayoutDashboard, Plus } from 'lucide-react';
import { useTaskStatistics, useTasks } from '../hooks/useDatabase';
import { useUnifiedTasks } from '../hooks/useUnifiedTasks';
import { useTaskSource } from '../contexts/TaskSourceContext';

const Dashboard = () => {
  const { taskSource } = useTaskSource();
  const { data: statistics, isLoading: statsLoading } = useTaskStatistics();
  
  // Fetch data based on selected task source
  const { data: localTasks, isLoading: localTasksLoading } = useTasks();
  const { data: unifiedData, isLoading: unifiedTasksLoading } = useUnifiedTasks(
    ['dashboard', taskSource], 
    taskSource === 'all' 
      ? { includeAllProviders: true }
      : { provider: undefined } // Use active provider only
  );
  
  // Choose the appropriate data source based on task source
  const tasks = taskSource === 'local' 
    ? (localTasks || [])
    : (unifiedData?.tasks || []);
    
  const tasksLoading = taskSource === 'local' ? localTasksLoading : unifiedTasksLoading;
  
  // Debug logging
  console.log('Dashboard data source:', { 
    taskSource, 
    tasksCount: tasks.length,
    localTasksCount: localTasks?.length || 0,
    unifiedTasksCount: unifiedData?.tasks?.length || 0,
    isLocalMode: taskSource === 'local'
  });
  

  const isLoading = statsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // Calculate statistics from unified tasks (includes all providers)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const activeTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  }).length;
  
  // Calculate context and energy level distributions
  const tasksByContext = tasks.reduce((acc, task) => {
    acc[task.context] = (acc[task.context] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const tasksByEnergyLevel = tasks.reduce((acc, task) => {
    acc[task.energy_level.toString()] = (acc[task.energy_level.toString()] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-gray-500">Local and synced tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks}</div>
            <p className="text-xs text-gray-500">Pending and in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-gray-500">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks}</div>
            <p className="text-xs text-gray-500">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Context and Energy Distribution */}
      {(Object.keys(tasksByContext).length > 0 || Object.keys(tasksByEnergyLevel).length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Tasks by Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(tasksByContext).map(([context, count]) => (
                  <div key={context} className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {context === 'work' && '💼'} 
                      {context === 'personal' && '👤'} 
                      {context === 'errands' && '🏃'} 
                      {context === 'home' && '🏠'} 
                      {context === 'office' && '🏢'} 
                      {context}
                    </span>
                    <span className="text-sm font-normal">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Tasks by Energy Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(tasksByEnergyLevel).map(([level, count]) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-sm">
                      {level === '1' && '🟢 Low'}
                      {level === '2' && '🟡 Medium'}
                      {level === '3' && '🟠 High'}
                      {level === '4' && '🔴 Peak'}
                      {level === '5' && '⚡ Flow'}
                    </span>
                    <span className="text-sm font-normal">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

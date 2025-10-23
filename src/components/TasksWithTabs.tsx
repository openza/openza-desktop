import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Task, Project } from '../types/database';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import TaskList, { TaskFilter } from './TaskList';
import TaskDetail from './TaskDetail';

// Define tab types
export type TabType = 
  | { type: 'tasks'; id: 'tasks' }
  | { type: 'task'; id: string; task: Task };

interface TasksWithTabsProps {
  tasks: Task[];
  projects?: Project[];
  filter: TaskFilter;
  title: string;
  emptyMessage?: string;
  className?: string;
  sortByLabels?: boolean;
  sortByProject?: boolean;
  hideTitle?: boolean;
}

const TasksWithTabs: React.FC<TasksWithTabsProps> = ({
  tasks,
  projects = [],
  filter,
  title,
  emptyMessage = "No tasks found",
  sortByLabels = false,
  sortByProject = true,
  hideTitle = false,
  className = ''
}) => {
  // Tab state management
  const [openTabs, setOpenTabs] = useState<TabType[]>([{ type: 'tasks', id: 'tasks' }]);
  const [activeTabId, setActiveTabId] = useState<string>('tasks');
  
  // Sorting state management
  const [sortOption, setSortOption] = useState<'default' | 'project' | 'labels'>('project');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Create project map for quick lookups
  const projectMap = React.useMemo(() => {
    return new Map(projects.map(project => [project.id, project]));
  }, [projects]);

  // Task management functions
  const openTaskTab = (task: Task, forceNewTab: boolean = false) => {
    const taskTabId = `task-${task.id}`;
    const existingTab = openTabs.find(tab => tab.id === taskTabId);

    if (!forceNewTab && !existingTab) {
      // Normal click - open new tab or switch to existing
      setOpenTabs(prev => [...prev, { type: 'task', id: taskTabId, task }]);
      setActiveTabId(taskTabId);
    } else if (forceNewTab) {
      // Ctrl+click - always open new tab (but prevent duplicates)
      if (!existingTab) {
        setOpenTabs(prev => [...prev, { type: 'task', id: taskTabId, task }]);
      }
      setActiveTabId(taskTabId);
    } else {
      // Tab already exists, just switch to it
      setActiveTabId(taskTabId);
    }
  };

  const closeTab = (tabId: string) => {
    // Cannot close the main "Tasks" tab
    if (tabId === 'tasks') return;

    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // If closing the active tab, switch to the next available tab
      if (activeTabId === tabId) {
        if (newTabs.length > 1) {
          // Switch to the last tab that's not the Tasks tab
          const lastTab = newTabs[newTabs.length - 1];
          setActiveTabId(lastTab.id);
        } else {
          // Only Tasks tab left, switch to it
          setActiveTabId('tasks');
        }
      }
      
      return newTabs;
    });
  };

  const switchToTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // Handle task click with Obsidian-style behavior
  const handleTaskClick = (task: Task, event?: React.MouseEvent) => {
    const forceNewTab = event?.ctrlKey || event?.metaKey;
    openTaskTab(task, forceNewTab);
  };

  // Handle keyboard shortcuts and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W or Cmd+W to close current tab (except Tasks tab)
      if ((e.ctrlKey || e.metaKey) && e.key === 'w' && activeTabId !== 'tasks') {
        e.preventDefault();
        closeTab(activeTabId);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.sort-dropdown')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeTabId]);

  const truncateTitle = (title: string | undefined, maxLength: number = 20) => {
    if (!title) return 'Untitled Task';
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className={`h-full ${className}`}>
      <Tabs 
        value={activeTabId} 
        onValueChange={switchToTab}
        className="h-full flex flex-col"
      >
        <div className="flex items-center justify-between bg-gray-50 border-b">
          <TabsList className="flex-1 justify-start overflow-x-auto bg-transparent p-0 h-auto">
            {openTabs.map((tab, index) => (
              <TabsTrigger 
                key={`tab-${tab.id}-${index}`} 
                value={tab.id}
                className="relative group flex items-center gap-2 min-w-0 px-4 py-2 border-r border-gray-200 data-[state=active]:bg-white data-[state=active]:border-b-white data-[state=active]:shadow-sm rounded-none"
              >
                <span className="truncate max-w-[150px]">
                  {tab.type === 'tasks' ? title : truncateTitle((tab as any).task?.title)}
                </span>
                {tab.type === 'task' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-60 hover:opacity-100 transition-all duration-200 hover:bg-red-100 hover:text-red-600 rounded-full p-1 ml-1 text-gray-400 hover:scale-110 cursor-pointer"
                    title="Close tab"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        closeTab(tab.id);
                      }
                    }}
                  >
                    <X size={14} />
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Sort dropdown - only show for tasks tab */}
          {activeTabId === 'tasks' && (
            <div className="relative mr-4 sort-dropdown">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span>Sort: {sortOption === 'default' ? 'Priority' : sortOption === 'project' ? 'Project' : 'Labels'}</span>
                <ChevronDown size={14} />
              </button>
              
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[140px]">
                  <button
                    onClick={() => {
                      setSortOption('default');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortOption === 'default' ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    Priority
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('project');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortOption === 'project' ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    Project
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('labels');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sortOption === 'labels' ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    Labels
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tasks tab content */}
        <TabsContent 
          value="tasks"
          className="flex-1 mt-0 overflow-hidden h-full"
        >
          <TaskList
            tasks={tasks}
            projects={projects}
            filter={filter}
            title=""
            emptyMessage={emptyMessage}
            sortByLabels={sortOption === 'labels'}
            sortByProject={sortOption === 'project'}
            hideTitle={true}
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        {/* Individual task tabs */}
        {openTabs
          .filter(tab => tab.type === 'task')
          .map((tab, index) => {
            const taskTab = tab as { type: 'task'; id: string; task: Task };
            const project = projectMap.get(taskTab.task.project_id || '');
            
            return (
              <TabsContent 
                key={`content-${tab.id}-${index}`} 
                value={tab.id}
                className="flex-1 mt-0 overflow-y-auto p-6"
              >
                <TaskDetail 
                  task={taskTab.task} 
                  onClose={() => closeTab(tab.id)} 
                  project={project}
                  hideCloseButton={false}
                />
              </TabsContent>
            );
          })}
      </Tabs>
    </div>
  );
};

export default TasksWithTabs;
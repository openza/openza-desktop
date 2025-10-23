import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProviderStatus } from '../hooks/useUnifiedTasks';

export type TaskSource = 'local' | 'provider' | 'all';

interface TaskSourceContextType {
  taskSource: TaskSource;
  setTaskSource: (source: TaskSource) => void;
  availableSources: {
    local: boolean;
    provider: boolean;
    all: boolean;
  };
  getSourceLabel: () => string;
}

const TaskSourceContext = createContext<TaskSourceContextType | undefined>(undefined);

interface TaskSourceProviderProps {
  children: ReactNode;
}

export const TaskSourceProvider: React.FC<TaskSourceProviderProps> = ({ children }) => {
  const { activeProvider } = useAuth();
  const providerStatus = useProviderStatus();
  
  // Initialize with appropriate default based on what's available
  const getInitialSource = (): TaskSource => {
    if (providerStatus.hasAnyProvider) {
      return 'all'; // Show all sources by default if providers are available
    }
    return 'local'; // Fall back to local if no providers
  };

  const [taskSource, setTaskSource] = useState<TaskSource>(() => getInitialSource());
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  
  // Automatically switch to 'all' when the first provider becomes available
  // This ensures users see their newly connected tasks immediately, but only once
  useEffect(() => {
    if (providerStatus.hasAnyProvider && taskSource === 'local' && !hasAutoSwitched) {
      // Switch to 'all' sources when first provider connects and user is in local mode
      setTaskSource('all');
      setHasAutoSwitched(true);
    }
  }, [providerStatus.hasAnyProvider, taskSource, hasAutoSwitched]);

  const availableSources = {
    local: true, // Local tasks are always available
    provider: providerStatus.hasAnyProvider,
    all: providerStatus.hasAnyProvider,
  };

  const getSourceLabel = (): string => {
    switch (taskSource) {
      case 'local':
        return 'Local Only';
      case 'provider':
        if (activeProvider === 'todoist') return 'Todoist Only';
        if (activeProvider === 'msToDo') return 'Microsoft To-Do Only';
        return 'Provider Only';
      case 'all':
        return 'All Sources';
      default:
        return 'Unknown';
    }
  };

  return (
    <TaskSourceContext.Provider
      value={{
        taskSource,
        setTaskSource,
        availableSources,
        getSourceLabel,
      }}
    >
      {children}
    </TaskSourceContext.Provider>
  );
};

export const useTaskSource = (): TaskSourceContextType => {
  const context = useContext(TaskSourceContext);
  if (context === undefined) {
    throw new Error('useTaskSource must be used within a TaskSourceProvider');
  }
  return context;
};
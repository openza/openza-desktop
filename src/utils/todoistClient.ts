import { TodoistApi, type GetTasksArgs, type Task, type Project, type Label } from '@doist/todoist-api-typescript';
import { secureStorage, STORAGE_KEYS } from './secureStorage';

export const createTodoistClient = (token: string) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Invalid Todoist access token');
  }
  return new TodoistApi(token);
};

export const getTodoistClient = async () => {
  const { tokenManager } = await import('./tokenManager');
  const token = await tokenManager.getValidAccessToken('todoist');
  if (!token) {
    throw new Error('No Todoist access token found. Please sign in again.');
  }
  return createTodoistClient(token);
};

export const getAllTasks = async (args: GetTasksArgs = {}): Promise<Task[]> => {
  const client = await getTodoistClient();
  const allTasks: Task[] = [];
  let cursor: string | null = null;
  
  do {
    const params: GetTasksArgs = {
      ...args,
      limit: 50,
      ...(cursor && { cursor })
    };
    
    const response = await client.getTasks(params);
    allTasks.push(...response.results);
    cursor = response.nextCursor;
  } while (cursor !== null);
  
  return allTasks;
};

export const getTasksWithProjects = async (args: GetTasksArgs = {}): Promise<{ tasks: Task[], projects: Project[], labels: Label[] }> => {
  const [tasks, projects, labels] = await Promise.all([
    getAllTasks(args),
    getAllProjects(),
    getAllLabels()
  ]);
  
  return { tasks, projects, labels };
};

export const getAllProjects = async (): Promise<Project[]> => {
  const client = await getTodoistClient();
  const allProjects: Project[] = [];
  let cursor: string | null = null;
  
  do {
    const response = await client.getProjects({
      ...(cursor && { cursor })
    });
    allProjects.push(...response.results);
    cursor = response.nextCursor;
  } while (cursor !== null);
  
  return allProjects;
};

export const getAllLabels = async (): Promise<Label[]> => {
  const client = await getTodoistClient();
  const allLabels: Label[] = [];
  let cursor: string | null = null;
  
  do {
    const response = await client.getLabels({
      ...(cursor && { cursor })
    });
    allLabels.push(...response.results);
    cursor = response.nextCursor;
  } while (cursor !== null);
  
  return allLabels;
};

import type { Task } from './types';
import { getGoogleAuthToken } from './GoogleAuth';
import { getOneTaskById } from './ListAllTasks';
import KanbanPlugin from '../main';

//=======================================
//Complete the tasks
//=======================================

export async function GoogleCompleteTask(
  plugin: KanbanPlugin,
  task: Task,
  taskListId: string
): Promise<boolean> {
  task.children?.forEach((subTask) =>
    GoogleCompleteTask(plugin, subTask, taskListId)
  );

  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  task.status = 'completed';
  task.completed = new Date().toISOString();
  delete task.taskListName;

  try {
    const response = await fetch(task.selfLink, {
      method: 'PUT',
      headers: requestHeaders,
      body: JSON.stringify(task),
    });
    await response.json();
  } catch (error) {
    return false;
  }
  return true;
}

export async function GoogleCompleteTaskById(
  plugin: KanbanPlugin,
  taskId: string,
  taskListId: string
): Promise<boolean> {
  const task = await getOneTaskById(plugin, taskId, taskListId);
  return await GoogleCompleteTask(plugin, task, taskListId);
}

//=======================================
//Uncomplete the tasks
//=======================================

export async function GoogleUnCompleteTask(
  plugin: KanbanPlugin,
  task: Task,
  taskListId: string
): Promise<boolean> {
  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  task.status = 'needsAction';
  task.completed = '';
  delete task.taskListName;

  try {
    const response = await fetch(task.selfLink, {
      method: 'PUT',
      headers: requestHeaders,
      body: JSON.stringify(task),
    });
    await response.json();
  } catch (error) {
    return false;
  }

  task.children?.forEach((subTask) =>
    GoogleUnCompleteTask(plugin, subTask, taskListId)
  );

  return true;
}

export async function GoogleUnCompleteTaskById(
  plugin: KanbanPlugin,
  taskId: string,
  taskListId: string
): Promise<boolean> {
  const task = await getOneTaskById(plugin, taskId, taskListId);
  return await GoogleUnCompleteTask(plugin, task, taskListId);
}

import { getGoogleAuthToken } from './GoogleAuth';
import type { Task, TaskInput } from './types';
import KanbanPlugin from 'src/main';

export async function CreateGoogleTask(
  plugin: KanbanPlugin,
  taskInput: TaskInput
): Promise<Task> {
  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  const createBody = {
    title: taskInput.title,
    notes: taskInput.details,
    due: taskInput.due,
  };
  try {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskInput.taskListId}/tasks`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(createBody),
      }
    );
    if (response.status == 200) {
      const task = await response.json();
      return task;
    }
  } catch (error) {
    console.error(error);
  }
}

export async function CreateGoogleTaskFromOldTask(
  plugin: KanbanPlugin,
  newTask: Task
) {
  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  const listId = newTask.parent;
  delete newTask.parent;

  try {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(newTask),
      }
    );
    if (response.status == 200) {
      await response.json();
    }
  } catch (error) {
    console.error(error);
  }
}

import type { Task } from './types';

import { getGoogleAuthToken } from './GoogleAuth';
import KanbanPlugin from 'src/main';

export async function UpdateGoogleTask(
  plugin: KanbanPlugin,
  task: Task
): Promise<boolean> {
  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  try {
    const response = await fetch(`${task.selfLink}`, {
      method: 'PATCH',
      headers: requestHeaders,
      body: JSON.stringify(task),
    });

    if (response.status == 200) {
      await response.json();
    }
  } catch (error) {
    console.error(error);
    return false;
  }

  return true;
}

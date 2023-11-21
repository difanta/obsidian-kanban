import { getGoogleAuthToken } from './GoogleAuth';
import KanbanPlugin from 'src/main';

export async function DeleteGoogleTask(
  plugin: KanbanPlugin,
  selfLink: string
): Promise<boolean> {
  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.append(
    'Authorization',
    'Bearer ' + (await getGoogleAuthToken(plugin))
  );
  requestHeaders.append('Content-Type', 'application/json');

  try {
    const response = await fetch(selfLink, {
      method: 'DELETE',
      headers: requestHeaders,
    });
    if (response.status == 204) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}

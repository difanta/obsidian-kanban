import type { Task, TaskInput } from './types';
import { getOneTaskById } from './ListAllTasks';
import { Item } from '../components/types';
import KanbanPlugin from 'src/main';

export function ItemToTaskInput(item: Item): TaskInput {
  console.log(item);
  return {
    title: item.data.title,
    details: item.data.titleRaw,
    taskListId: 'boh',
    due: item.data.metadata.date.toISOString(),
  };
}

export async function ItemToTask(
  plugin: KanbanPlugin,
  item: Item,
  deleting: boolean
): Promise<Task> {
  const oldTask = await getOneTaskById(plugin, item.data.blockId);
  if (!oldTask) throw new Error('task not found');

  const newTask: Task = JSON.parse(JSON.stringify(oldTask));

  newTask.title = item.data.title;
  newTask.due = item.data.metadata.date
    ? item.data.metadata.date.toISOString()
    : newTask.due;
  newTask.status = item.data.isComplete ? 'completed' : 'needsAction';
  if (oldTask.status === 'needsAction' && item.data.isComplete)
    newTask.completed = new Date().toISOString();
  if (deleting) newTask.deleted = true;

  if (JSON.stringify(oldTask) !== JSON.stringify(newTask))
    newTask.updated = new Date().toISOString();

  return newTask;
}

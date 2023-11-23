import type { Task, TaskInput, TaskList } from './types';
import { getOneTaskById } from './ListAllTasks';
import { Item, ItemTemplate, Lane, LaneTemplate } from '../components/types';
import KanbanPlugin from 'src/main';
import { moment } from 'obsidian';
import { generateInstanceId } from 'src/components/helpers';
import { StateManager } from 'src/StateManager';
import { HeadlessStateManager } from './HeadlessStateManager';

export function ItemToTaskInput(item: Item, lane: Lane): TaskInput {
  return {
    title: item.data.title,
    details: '',
    taskListId: lane.data.blockId,
    due: item.data.metadata.date ? item.data.metadata.date.toISOString() : '',
  };
}

export async function ItemToTask(
  plugin: KanbanPlugin,
  item: Item,
  taskListId: string,
  deleting: boolean
): Promise<Task> {
  console.log(item);
  const oldTask = await getOneTaskById(plugin, item.data.blockId, taskListId);
  if (!oldTask) throw new Error('task not found');

  const newTask: Task = JSON.parse(JSON.stringify(oldTask));

  newTask.title = item.data.title;
  newTask.due = item.data.metadata.date
    ? item.data.metadata.date.toISOString()
    : '';
  newTask.status = item.data.isComplete ? 'completed' : 'needsAction';
  if (oldTask.status === 'needsAction' && item.data.isComplete)
    newTask.completed = new Date().toISOString();
  if (deleting) newTask.deleted = true;

  if (JSON.stringify(oldTask) !== JSON.stringify(newTask))
    newTask.updated = new Date().toISOString();

  return newTask;
}

export function taskListToLane(
  taskList: TaskList,
  oldLane?: Lane,
  items?: Item[]
): Lane {
  return {
    children: items ?? [],
    id: oldLane?.id ?? generateInstanceId(),
    data: {
      title: taskList.title,
      blockId: taskList.id,
      shouldMarkItemsComplete: oldLane?.data.shouldMarkItemsComplete,
      maxItems: oldLane?.data.maxItems,
      dom: oldLane?.data.dom,
      forceEditMode: oldLane?.data.forceEditMode,
      sorted: oldLane?.data.sorted,
    },
    ...LaneTemplate,
  };
}

export function taskToItem(
  stateManager: StateManager | HeadlessStateManager,
  task: Task,
  oldItem?: Item
): Item {
  const dateFormat = stateManager.getSetting('date-format');
  const timeFormat = stateManager.getSetting('time-format');
  const dateTrigger = stateManager.getSetting('date-trigger');
  const timeTrigger = stateManager.getSetting('time-trigger');
  const date = task.due ? moment(task.due) : undefined;
  const dateStr = date?.format(dateFormat);
  const timeStr = date?.format(timeFormat);

  return {
    id: oldItem?.id ?? generateInstanceId(),
    data: {
      blockId: task.id,
      title: task.title,
      titleRaw:
        task.title +
        (task.due
          ? `${dateTrigger}{${dateStr}} ${timeTrigger}{${timeStr}}`
          : ''),
      isComplete: task.status === 'completed' ? true : false,
      titleSearch: task.title,
      metadata: {
        date: date,
        dateStr,
        time: date,
        timeStr,
        fileAccessor: oldItem?.data.metadata.fileAccessor,
        file: oldItem?.data.metadata.file,
        fileMetadata: oldItem?.data.metadata.fileMetadata,
        fileMetadataOrder: oldItem?.data.metadata.fileMetadataOrder,
        tags: oldItem?.data.metadata.tags ?? [],
      },
      dom: oldItem?.data.dom,
      forceEditMode: oldItem?.data.forceEditMode,
    },
    ...ItemTemplate,
  };
}

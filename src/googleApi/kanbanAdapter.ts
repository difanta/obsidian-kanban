import type { Task, TaskInput, TaskList } from './types';
import { getOneTaskById } from './ListAllTasks';
import { Item, ItemTemplate, Lane, LaneTemplate } from '../components/types';
import KanbanPlugin from 'src/main';
import { moment } from 'obsidian';
import { generateInstanceId } from 'src/components/helpers';
import { StateManager } from 'src/StateManager';
import { HeadlessStateManager } from './HeadlessStateManager';
import update from 'immutability-helper';

export function ItemToTaskInput(item: Item, lane: Lane): TaskInput {
  return {
    title: item.data.title,
    details: '',
    taskListId: lane.data.blockId,
    due: item.data.metadata.date
      ? item.data.metadata.date.utc().toISOString()
      : '',
  };
}

export async function ItemToTask(
  plugin: KanbanPlugin,
  item: Item,
  taskListId: string,
  deleting: boolean
): Promise<Task> {
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
  if (oldLane)
    return update(oldLane, {
      children: {
        $set: items ?? [],
      },
      data: {
        title: {
          $set: taskList.title,
        },
        blockId: {
          $set: taskList.id,
        },
      },
    });
  else
    return {
      children: items ?? [],
      id: generateInstanceId(),
      data: {
        title: taskList.title,
        blockId: taskList.id,
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
  const dateTrigger = stateManager.getSetting('date-trigger');
  const timeTrigger = stateManager.getSetting('time-trigger');
  const date = task.due ? moment(task.due) : undefined;
  const dateStr = date?.format(dateFormat);
  const timeStr = oldItem?.data.metadata.timeStr;
  const time = oldItem?.data.metadata.time;

  const titleRaw =
    task.title +
    (date
      ? ` ${dateTrigger}{${dateStr}}` +
        (time ? ` ${timeTrigger}{${timeStr}}` : '')
      : '');

  if (oldItem)
    return update(oldItem, {
      data: {
        blockId: { $set: task.id },
        title: { $set: task.title },
        titleRaw: {
          $set: titleRaw,
        },
        titleSearch: {
          $set: task.title,
        },
        isComplete: {
          $set: task.status === 'completed' ? true : false,
        },
        metadata: {
          date: {
            $set: date,
          },
          dateStr: {
            $set: dateStr,
          },
          time: {
            $set: time,
          },
          timeStr: {
            $set: timeStr,
          },
        },
      },
    });
  else
    return {
      id: generateInstanceId(),
      data: {
        blockId: task.id,
        title: task.title,
        titleRaw,
        titleSearch: task.title,
        isComplete: task.status === 'completed' ? true : false,
        metadata: {
          date,
          dateStr,
          time,
          timeStr,
          tags: [],
        },
      },
      ...ItemTemplate,
    };
}

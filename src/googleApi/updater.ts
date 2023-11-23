import { TFile } from 'obsidian';
import { DataTypes, Item, Lane } from '../components/types';
import { CreateGoogleTask } from './GoogleCreateTask';
import { UpdateGoogleTask } from './GoogleUpdateTask';
import { DeleteGoogleTask } from './GoogleDeleteTask';
import {
  ItemToTask,
  ItemToTaskInput,
  taskListToLane,
  taskToItem,
} from './kanbanAdapter';
import KanbanPlugin from '../main';
import { HeadlessStateManager } from './HeadlessStateManager';
import { getAllTaskLists, getAllTasksFromList } from './ListAllTasks';
import { StateManager } from 'src/StateManager';
import { getBoardModifiers } from 'src/helpers/boardModifiers';
import { Task, TaskList } from './types';
import { moment } from 'obsidian';

export function register(plugin: KanbanPlugin) {
  plugin.registerEvent(
    this.app.workspace.on(
      //@ts-ignore
      'kanban:card-added',
      async (file: TFile, item: Item, lane: Lane) => {
        if (!lane.data.blockId) throw new Error('missing lane id');
        const stateManager = plugin.getStateManager(file);
        const task = await CreateGoogleTask(
          plugin,
          ItemToTaskInput(item, lane)
        );
        item.data.blockId = task.id;

        if (!stateManager) throw new Error('Board is not open');

        await stateManager.setState(async (board) => {
          await stateManager.updateItemContent(
            item,
            item.data.titleRaw + `^${task.id}`
          );
          return board;
        });
      }
    )
  );

  plugin.registerEvent(
    this.app.workspace.on(
      //@ts-ignore
      'kanban:card-updated',
      async (file: TFile, oldItem: Item, item: Item, lane: Lane) => {
        console.log('updated');
        if (!lane.data.blockId) throw new Error('missing lane id');
        const task = await ItemToTask(plugin, item, lane.data.blockId, false);
        console.log(task);
        await UpdateGoogleTask(plugin, task);
      }
    )
  );

  plugin.registerEvent(
    this.app.workspace.on(
      //@ts-ignore
      `kanban:${DataTypes['Item']}-deleted`,
      async (file: TFile, item: Item, lane: Lane) => {
        console.log('deleted');
        if (!lane.data.blockId) throw new Error('missing lane id');
        const task = await ItemToTask(plugin, item, lane.data.blockId, true);
        await DeleteGoogleTask(plugin, task.selfLink);
      }
    )
  );
}

export async function onReady(plugin: KanbanPlugin) {
  const file = app.vault.getFiles()[0];
  await syncLanesFromGTask(
    [
      {
        file,
        lane_ids: ['djVLRFhNMHJoWDBhQ0FCUw'],
      },
    ],
    plugin
  );
}

export async function syncLanesFromGTask(
  file_lanes: { file: TFile; lane_ids: string[] }[],
  plugin: KanbanPlugin
) {
  const GTaskLists = await getAllTaskLists(plugin);
  await Promise.all(
    file_lanes.map(async ({ file, lane_ids }) => {
      const stateManager =
        plugin.getStateManager(file) ??
        new HeadlessStateManager(
          window.app,
          file,
          await window.app.vault.read(file),
          () => {},
          () => plugin.settings
        );
      await stateManager.newBoardPromise;

      await Promise.all(
        lane_ids.map(async (lane_id) => {
          const GTaskList = GTaskLists.find(
            (taskList) => taskList.id === lane_id
          );
          const { path, lane } = findLane(stateManager, lane_id);

          // lane was set to sync and does not exist anymore on GTask
          if (!GTaskList) removeLane(plugin, stateManager, lane_id, path);

          const tasks = await getAllTasksFromList(plugin, GTaskList.id);

          const { mergedTaskList, mergedLane } = await mergeTaskListAndLane(
            stateManager,
            { ...GTaskList, tasks },
            lane
          );

          await saveLane(stateManager, mergedLane, path);
        })
      );
    })
  );
}

export async function mergeTaskListAndLane(
  stateManager: StateManager | HeadlessStateManager,
  taskList: TaskList & { tasks: Task[] },
  lane?: Lane
): Promise<{
  mergedTaskList: TaskList & {
    tasks: { task: Task; modified: boolean }[];
    modified: boolean;
  };
  mergedLane: Lane & {
    modified: boolean;
  };
}> {
  const { tasks, ..._taskList } = taskList;
  const mergedTaskList = {
    ..._taskList,
    tasks: tasks.map((task) => ({ task, modified: false })),
    modified: false,
  };

  if (!lane) {
    // create the lane
    return {
      mergedTaskList,
      mergedLane: {
        ...taskListToLane(
          mergedTaskList,
          undefined,
          mergedTaskList.tasks.map((task) =>
            taskToItem(stateManager, task.task)
          )
        ),
        modified: true,
      },
    };
  } else {
    const laneFromTaskList = taskListToLane(
      taskList,
      lane,
      taskList.tasks.map((task) =>
        taskToItem(
          stateManager,
          task,
          lane.children.find((item) => item.data.blockId === task.id)
        )
      )
    );

    return {
      mergedTaskList,
      mergedLane: { ...laneFromTaskList, modified: true },
    };
  }
}

export async function saveLane(
  stateManager: StateManager | HeadlessStateManager,
  mergedLane: Lane & { modified: boolean },
  path?: number[]
) {
  if (mergedLane.modified) {
    if (path) getBoardModifiers(stateManager).updateLane(path, mergedLane);
    else getBoardModifiers(stateManager).addLane(mergedLane);
  }
}

export function findLane(
  stateManager: StateManager | HeadlessStateManager,
  lane_id: string
): { path: number[]; lane: Lane } | { path: undefined; lane: undefined } {
  const board = stateManager.state;
  const lane_idx = board.children.findIndex(
    (lane) => lane.data.blockId === lane_id
  );
  return lane_idx !== -1
    ? {
        path: [lane_idx],
        lane: board.children[lane_idx],
      }
    : { path: undefined, lane: undefined };
}

export function removeLane(
  plugin: KanbanPlugin,
  stateManager: StateManager | HeadlessStateManager,
  lane_id: string,
  path?: number[]
) {
  if (path) getBoardModifiers(stateManager).deleteEntity(path);
  // remove from settings
  //plugin.settings["file_lanes"].find(({ file, lanes }) => { lanes.splice(lanes.findIndex((_lane_id) => lane_id === lane_id)) })
  //plugin.saveSettings();
}

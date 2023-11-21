import { TFile } from 'obsidian';
import { Item, Lane } from '../components/types';
import { CreateGoogleTask } from './GoogleCreateTask';
import { UpdateGoogleTask } from './GoogleUpdateTask';
import { DeleteGoogleTask } from './GoogleDeleteTask';
import { ItemToTask, ItemToTaskInput } from './kanbanAdapter';
import KanbanPlugin from '../main';
import { getBoardModifiers } from 'src/helpers/boardModifiers';

export function register(plugin: KanbanPlugin) {
  plugin.registerEvent(
    this.app.workspace.on(
      //@ts-ignore
      'kanban:card-added',
      async (file: TFile, item: Item, lane: Lane) => {
        console.log('added', item, lane);
        if (!lane.data.blockId) throw new Error('missing lane id');
        const task = await CreateGoogleTask(
          plugin,
          ItemToTaskInput(item, lane)
        );
        item.data.blockId = task.id;

        const stateManager = plugin.stateManagers.get(file);

        await stateManager.setState(async (board) => {
          await stateManager.updateItemContent(
            item,
            item.data.titleRaw + 'o' + `^${task.id}`
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
      'kanban:card-deleted',
      async (file: TFile, item: Item, lane: Lane) => {
        console.log('deleted');
        if (!lane.data.blockId) throw new Error('missing lane id');
        const task = await ItemToTask(plugin, item, lane.data.blockId, true);
        await DeleteGoogleTask(plugin, task.selfLink);
      }
    )
  );
}

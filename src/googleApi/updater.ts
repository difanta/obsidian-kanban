import { TFile } from 'obsidian';
import { Item } from '../components/types';
import { CreateGoogleTask } from './GoogleCreateTask';
import { UpdateGoogleTask } from './GoogleUpdateTask';
import { DeleteGoogleTask } from './GoogleDeleteTask';
import { ItemToTask, ItemToTaskInput } from './kanbanAdapter';
import KanbanPlugin from '../main';

export function register(plugin: KanbanPlugin) {
  this.app.workspace.on(
    //@ts-ignore
    'kanban:card-added',
    async (file: TFile, item: Item) => {
      console.log('added');
      await CreateGoogleTask(this, ItemToTaskInput(item));
    }
  );

  this.app.workspace.on(
    //@ts-ignore
    'kanban:card-updated',
    async (file: TFile, oldItem: Item, item: Item) => {
      console.log('updated');
      const task = await ItemToTask(plugin, item, false);
      console.log(task);
      await UpdateGoogleTask(this, task);
    }
  );

  this.app.workspace.on(
    //@ts-ignore
    'kanban:card-deleted',
    async (file: TFile, item: Item) => {
      console.log('deleted');
      const task = await ItemToTask(plugin, item, true);
      await DeleteGoogleTask(this, task.selfLink);
    }
  );
}

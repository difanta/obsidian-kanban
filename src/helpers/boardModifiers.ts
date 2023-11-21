import update from 'immutability-helper';
import { moment } from 'obsidian';

import { Path } from 'src/dnd/types';
import {
  appendEntities,
  getEntityFromPath,
  getEntityStackFromPath,
  insertEntity,
  moveEntity,
  prependEntities,
  removeEntity,
  updateEntity,
  updateParentEntity,
} from 'src/dnd/util/data';
import { StateManager } from 'src/StateManager';

import { generateInstanceId } from '../components/helpers';
import { DataTypes, Item, Lane } from '../components/types';

export interface BoardModifiers {
  appendItems: (path: Path, items: Item[]) => void;
  prependItems: (path: Path, items: Item[]) => void;
  insertItems: (path: Path, items: Item[]) => void;
  splitItem: (path: Path, items: Item[]) => void;
  moveItemToTop: (path: Path) => void;
  moveItemToBottom: (path: Path) => void;
  addLane: (lane: Lane) => void;
  insertLane: (path: Path, lane: Lane) => void;
  updateLane: (path: Path, lane: Lane) => void;
  archiveLane: (path: Path) => void;
  archiveLaneItems: (path: Path) => void;
  deleteEntity: (path: Path) => void;
  updateItem: (path: Path, item: Item) => void;
  archiveItem: (path: Path) => void;
  duplicateEntity: (path: Path) => void;
}

export function getBoardModifiers(stateManager: StateManager): BoardModifiers {
  const appendArchiveDate = (item: Item) => {
    const archiveDateFormat = stateManager.getSetting('archive-date-format');
    const archiveDateSeparator = stateManager.getSetting(
      'archive-date-separator'
    );
    const archiveDateAfterTitle = stateManager.getSetting(
      'append-archive-date'
    );

    const newTitle = [moment().format(archiveDateFormat)];

    if (archiveDateSeparator) newTitle.push(archiveDateSeparator);

    newTitle.push(item.data.titleRaw);

    if (archiveDateAfterTitle) newTitle.reverse();

    const titleRaw = newTitle.join(' ');
    return stateManager.updateItemContent(item, titleRaw);
  };

  return {
    appendItems: async (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const lane = stack[stack.length - 2];

        items.forEach((item) =>
          stateManager.app.workspace.trigger(
            'kanban:card-added',
            stateManager.file,
            item,
            lane
          )
        );
        return appendEntities(boardData, path, items);
      });
    },

    prependItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const lane = stack[stack.length - 2];

        items.forEach((item) =>
          stateManager.app.workspace.trigger(
            'kanban:card-added',
            stateManager.file,
            item,
            lane
          )
        );

        return prependEntities(boardData, path, items);
      });
    },

    insertItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const lane = stack[stack.length - 2];

        items.forEach((item) =>
          stateManager.app.workspace.trigger(
            'kanban:card-added',
            stateManager.file,
            item,
            lane
          )
        );

        return insertEntity(boardData, path, items);
      });
    },

    splitItem: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const lane = stack[stack.length - 2];

        items.forEach((item) =>
          stateManager.app.workspace.trigger(
            'kanban:card-added',
            stateManager.file,
            item,
            lane
          )
        );

        return insertEntity(removeEntity(boardData, path), path, items);
      });
    },

    moveItemToTop: (path: Path) => {
      stateManager.setState((boardData) =>
        moveEntity(boardData, path, [path[0], 0])
      );
    },

    moveItemToBottom: (path: Path) => {
      stateManager.setState((boardData) => {
        const laneIndex = path[0];
        const lane = boardData.children[laneIndex];
        return moveEntity(boardData, path, [laneIndex, lane.children.length]);
      });
    },

    addLane: (lane: Lane) => {
      stateManager.app.workspace.trigger(
        'kanban:lane-added',
        stateManager.file,
        lane
      );

      stateManager.setState((boardData) =>
        appendEntities(boardData, [], [lane])
      );
    },

    insertLane: (path: Path, lane: Lane) => {
      stateManager.app.workspace.trigger(
        'kanban:lane-added',
        stateManager.file,
        lane
      );

      stateManager.setState((boardData) =>
        insertEntity(boardData, path, [lane])
      );
    },

    updateLane: (path: Path, lane: Lane) => {
      stateManager.app.workspace.trigger(
        'kanban:lane-updated',
        stateManager.file,
        lane
      );

      stateManager.setState((boardData) =>
        updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: lane,
            },
          },
        })
      );
    },

    archiveLane: (path: Path) => {
      stateManager.setState(async (boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        stateManager.app.workspace.trigger(
          'kanban:lane-archived',
          stateManager.file,
          lane
        );

        try {
          return update(removeEntity(boardData, path), {
            data: {
              archive: {
                $unshift: stateManager.getSetting('archive-with-date')
                  ? await Promise.all(items.map(appendArchiveDate))
                  : items,
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    archiveLaneItems: (path: Path) => {
      stateManager.setState(async (boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        stateManager.app.workspace.trigger(
          'kanban:lane-cards-archived',
          stateManager.file,
          items,
          lane
        );

        try {
          return update(
            updateEntity(boardData, path, {
              children: {
                $set: [],
              },
            }),
            {
              data: {
                archive: {
                  $unshift: stateManager.getSetting('archive-with-date')
                    ? await Promise.all(items.map(appendArchiveDate))
                    : items,
                },
              },
            }
          );
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    deleteEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const entity = stack[stack.length - 1]; // last entity is the target
        const lane =
          entity.type === DataTypes['Item']
            ? stack[stack.length - 2]
            : undefined; // if the entity is an item we want to extract also the lane, which is the penultimate entity

        stateManager.app.workspace.trigger(
          `kanban:${entity.type}-deleted`,
          stateManager.file,
          entity,
          lane
        );

        return removeEntity(boardData, path);
      });
    },

    updateItem: (path: Path, item: Item) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const oldItem = stack[stack.length - 1]; // last entity is the target
        const lane = stack[stack.length - 2]; // we want to extract also the lane, which is the penultimate entity
        // supposing lane doesnt change ??

        stateManager.app.workspace.trigger(
          'kanban:card-updated',
          stateManager.file,
          oldItem,
          item,
          lane
        );

        return updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: item,
            },
          },
        });
      });
    },

    archiveItem: (path: Path) => {
      stateManager.setState(async (boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const item = stack[stack.length - 1]; // last entity is the target
        const lane = stack[stack.length - 2]; // we want to extract also the lane, which is the penultimate entity

        stateManager.app.workspace.trigger(
          'kanban:card-archived',
          stateManager.file,
          path,
          item,
          lane
        );

        try {
          return update(removeEntity(boardData, path), {
            data: {
              archive: {
                $push: [
                  stateManager.getSetting('archive-with-date')
                    ? await appendArchiveDate(item)
                    : item,
                ],
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    duplicateEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const stack = getEntityStackFromPath(boardData, path);
        const entity = stack[stack.length - 1]; // last entity is the target
        const lane =
          entity.type === DataTypes['Item']
            ? stack[stack.length - 2]
            : undefined; // if the entity is an item we want to extract also the lane, which is the penultimate entity

        stateManager.app.workspace.trigger(
          `kanban:${entity.type}-duplicated`,
          stateManager.file,
          path,
          entity,
          lane
        );

        const entityWithNewID = update(entity, {
          id: {
            $set: generateInstanceId(),
          },
        });

        return insertEntity(boardData, path, [entityWithNewID]);
      });
    },
  } as BoardModifiers;
}

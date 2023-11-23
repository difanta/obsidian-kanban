import { compare } from 'fast-json-patch';
import { JSONPatchDocument, immutableJSONPatch } from 'immutable-json-patch';

import { Board, Item } from 'src/components/types';
import { StateManager } from 'src/StateManager';
import { HeadlessStateManager } from 'src/googleApi/HeadlessStateManager';

import { BaseFormat } from './common';
import {
  astToUnhydratedBoard,
  boardToMd,
  newItem,
  reparseBoard,
  updateItemContent,
} from './formats/list';
import { hydrateBoard, hydratePostOp } from './helpers/hydrateBoard';
import { parseMarkdown } from './parseMarkdown';

export class ListFormat implements BaseFormat {
  stateManager: StateManager | HeadlessStateManager;

  constructor(stateManager: StateManager | HeadlessStateManager) {
    this.stateManager = stateManager;
  }

  newItem(content: string, isComplete?: boolean, forceEdit?: boolean) {
    return newItem(this.stateManager, content, isComplete, forceEdit);
  }

  updateItemContent(item: Item, content: string) {
    return updateItemContent(this.stateManager, item, content);
  }

  boardToMd(board: Board) {
    return boardToMd(board);
  }

  mdToBoard(md: string) {
    const { ast, settings, frontmatter } = parseMarkdown(this.stateManager, md);
    const newBoard = astToUnhydratedBoard(
      this.stateManager,
      settings,
      frontmatter,
      ast,
      md
    );

    if (!this.stateManager.hasError() && this.stateManager.state) {
      const ops = compare(this.stateManager.state, newBoard);
      const filtered = ops.filter((op) =>
        ['/id', '/dom', '/date', '/time', '/titleSearch', '/file'].every(
          (postFix) => !op.path.endsWith(postFix)
        )
      );

      const patchedBoard = immutableJSONPatch(
        this.stateManager.state,
        filtered as JSONPatchDocument
      ) as Board;

      return this.stateManager instanceof StateManager
        ? hydratePostOp(this.stateManager, patchedBoard, filtered)
        : (new Promise((resolve) => {
            resolve(patchedBoard);
          }) as Promise<Board>);
    }

    return this.stateManager instanceof StateManager
      ? hydrateBoard(this.stateManager, newBoard)
      : (new Promise((resolve) => {
          resolve(newBoard);
        }) as Promise<Board>);
  }

  reparseBoard() {
    return reparseBoard(this.stateManager, this.stateManager.state);
  }
}

// applySteps: replays a step stream onto a board snapshot. This is what the phone's step player
// does with animations, so it is strict: a stream that under-reports what the engine did throws
// here instead of silently diverging on screen.

import {
  cloneBoard,
  clonePiece,
  cellAt,
  inBounds,
  isEmptyOpen,
  removePiece,
  setPiece,
  swapPieces,
  posKey,
} from './board.js';
import { formatPos } from './text.js';

/** @typedef {import('./constants.js').Board} Board */

/**
 * @param {Board} board  never mutated
 * @param {object[]} steps  never mutated
 * @returns {Board} a new board
 */
export const applySteps = (board, steps) => {
  let b = cloneBoard(board);
  const fail = (msg) => {
    throw new Error(`applySteps: ${msg}`);
  };
  const check = (pos, what) => {
    if (!inBounds(b, pos)) fail(`${what} ${formatPos(pos)} is off the board`);
  };
  for (const step of steps) {
    switch (step.type) {
      case 'swap': {
        if (step.illegal) break;
        for (const p of [step.a, step.b]) {
          check(p, 'swap cell');
          if (cellAt(b, p).piece === undefined)
            fail(`legal swap touches an empty cell ${formatPos(p)}`);
        }
        swapPieces(b, step.a, step.b);
        break;
      }
      case 'clear': {
        const keys = new Set();
        for (const p of step.cells) {
          check(p, 'clear cell');
          if (cellAt(b, p).piece === undefined) fail(`clear of an empty cell ${formatPos(p)}`);
          keys.add(posKey(p));
        }
        for (const p of step.cells) removePiece(b, p);
        for (const { pos, piece } of step.created) {
          if (!keys.has(posKey(pos)))
            fail(`created special at ${formatPos(pos)} is not among the cleared cells`);
          setPiece(b, pos, clonePiece(piece));
        }
        break;
      }
      case 'fall': {
        const lifted = step.moves.map(({ from }) => {
          check(from, 'fall from');
          const piece = removePiece(b, from);
          if (piece === undefined) fail(`fall from an empty cell ${formatPos(from)}`);
          return piece;
        });
        step.moves.forEach(({ to }, i) => {
          check(to, 'fall to');
          if (!isEmptyOpen(cellAt(b, to)))
            fail(`fall into an occupied or blocked cell ${formatPos(to)}`);
          setPiece(b, to, lifted[i]);
        });
        break;
      }
      case 'spawn': {
        for (const { pos, piece } of step.cells) {
          check(pos, 'spawn cell');
          if (!isEmptyOpen(cellAt(b, pos)))
            fail(`spawn into an occupied or blocked cell ${formatPos(pos)}`);
          setPiece(b, pos, clonePiece(piece));
        }
        break;
      }
      case 'shuffle':
        b = cloneBoard(step.board);
        break;
      default:
        fail(`unsupported step type '${step.type}'`);
    }
  }
  return b;
};

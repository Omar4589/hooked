// applySteps: replays a step stream onto a board snapshot. This is what the phone's step player
// does with animations, so it is strict: a stream that under-reports what the engine did throws
// here instead of silently diverging on screen.

import {
  cloneBoard,
  clonePiece,
  cellAt,
  inBounds,
  isAdjacent,
  isEmptyOpen,
  isPlainBall,
  removePiece,
  setPiece,
  swapPieces,
  posKey,
} from './board.js';
import { formatPos } from './text.js';
import { blastArea, ripArea, takeableIn } from './blast.js';
import { METER_FULL, YARN_OVER_SPECIALS } from './constants.js';

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
      case 'blast':
      case 'frogRip': {
        check(step.pos, `${step.type} origin`);
        // Re-derive the cells from the step's own fields: that is what proves it neither
        // under-reports (a piece the engine took but the stream never mentioned) nor over-reports
        // (a cell it could not have taken).
        const area = step.type === 'blast' ? blastArea(b, step) : ripArea(b, step.color, step.pos);
        const expected = takeableIn(b, area);
        const named = new Set(step.cells.map(posKey));
        if (named.size !== step.cells.length) fail(`${step.type} names a cell twice`);
        for (const p of expected) {
          if (!named.has(posKey(p))) fail(`${step.type} under-reports ${formatPos(p)}`);
        }
        const covered = new Set(expected.map(posKey));
        for (const p of step.cells) {
          check(p, `${step.type} cell`);
          if (!covered.has(posKey(p))) {
            fail(`${step.type} names ${formatPos(p)}, which it does not cover or cannot take`);
          }
        }
        for (const p of step.cells) removePiece(b, p);
        break;
      }
      case 'meter': {
        if (!Number.isInteger(step.charge) || step.charge < 0) fail('meter charge must be a count');
        if (step.full !== METER_FULL) fail(`meter full must be ${METER_FULL}`);
        break;
      }
      case 'meterDrop': {
        check(step.pos, 'meterDrop cell');
        const replaced = cellAt(b, step.pos).piece;
        const plain =
          replaced !== undefined &&
          replaced.kind === 'yarn' &&
          replaced.special === undefined &&
          replaced.knotted !== true;
        if (!plain) fail(`meterDrop onto ${formatPos(step.pos)}, which holds no plain yarn ball`);
        setPiece(b, step.pos, clonePiece(step.piece));
        break;
      }
      case 'blocker': {
        check(step.pos, 'blocker cell');
        if (!Number.isInteger(step.layersLeft) || step.layersLeft < 0) {
          fail('blocker layersLeft must be a count');
        }
        const cell = cellAt(b, step.pos);
        const where = formatPos(step.pos);
        if (step.kind === 'tangle') {
          const layers = cell.tangle === undefined ? 0 : cell.tangle;
          if (layers !== step.layersLeft + 1) {
            fail(
              `blocker tangle at ${where}: expected ${step.layersLeft + 1} layers, found ${layers}`,
            );
          }
          // The button rides out on the last layer, and only then: a cell cannot carry `buried`
          // without a tangle, so the step says so exactly when it happens.
          const frees = step.layersLeft === 0 && cell.buried === true;
          if (frees && step.buried !== true)
            fail(`blocker tangle at ${where} must carry buried: true`);
          if (!frees && step.buried !== undefined)
            fail(`blocker tangle at ${where} frees no button`);
          if (step.layersLeft > 0) cell.tangle = step.layersLeft;
          else {
            delete cell.tangle;
            delete cell.buried;
          }
        } else if (step.kind === 'moth') {
          if (cell.moth !== true) fail(`blocker moth at ${where}: no moth there`);
          if (step.layersLeft !== 0) fail(`blocker moth at ${where}: a moth has one layer`);
          delete cell.moth;
        } else if (step.kind === 'knot') {
          // Credit only: the knotted ball left through the clear or blast that took it, and a
          // special this cascade created may already be standing on its cell.
          if (step.layersLeft !== 0) fail(`blocker knot at ${where}: a knot has one layer`);
          if (cell.piece !== undefined && cell.piece.knotted === true) {
            fail(`blocker knot at ${where}: the knotted ball is still there`);
          }
        } else if (step.kind === 'stitch') {
          const layers = cell.stitch === undefined ? 0 : cell.stitch;
          if (layers !== step.layersLeft + 1) {
            fail(
              `blocker stitch at ${where}: expected ${step.layersLeft + 1} layers, found ${layers}`,
            );
          }
          if (step.layersLeft > 0) cell.stitch = step.layersLeft;
          else delete cell.stitch;
        } else {
          fail(`unknown blocker kind '${step.kind}'`);
        }
        break;
      }
      case 'mothSpread': {
        check(step.from, 'mothSpread from');
        check(step.to, 'mothSpread to');
        if (cellAt(b, step.from).moth !== true) {
          fail(`mothSpread from ${formatPos(step.from)}: no moth there`);
        }
        if (!isAdjacent(step.from, step.to)) {
          fail(`mothSpread to ${formatPos(step.to)}: not adjacent`);
        }
        const target = cellAt(b, step.to);
        const edible =
          target.open === true &&
          !(target.tangle > 0) &&
          target.moth !== true &&
          isPlainBall(target.piece);
        if (!edible) fail(`mothSpread to ${formatPos(step.to)}: no plain yarn ball to eat`);
        removePiece(b, step.to);
        target.moth = true;
        break;
      }
      case 'beadExit': {
        check(step.pos, 'beadExit cell');
        const piece = cellAt(b, step.pos).piece;
        if (piece === undefined || piece.kind !== 'bead') {
          fail(`beadExit at ${formatPos(step.pos)}: no bead there`);
        }
        removePiece(b, step.pos);
        break;
      }
      case 'yarnOver': {
        const counts = [step.coins, step.moves];
        if (counts.some((n) => !Number.isInteger(n) || n < 0)) {
          fail('yarnOver coins and moves must be counts');
        }
        const seen = new Set();
        for (const { pos, piece } of step.specials) {
          check(pos, 'yarnOver cell');
          if (seen.has(posKey(pos))) fail('yarnOver names a cell twice');
          seen.add(posKey(pos));
          const ball = cellAt(b, pos).piece;
          if (!isPlainBall(ball)) fail(`yarnOver at ${formatPos(pos)}: no plain yarn ball`);
          const rides =
            piece !== undefined &&
            piece.kind === 'yarn' &&
            piece.color === ball.color &&
            piece.knotted !== true &&
            YARN_OVER_SPECIALS.includes(piece.special);
          if (!rides) fail(`yarnOver at ${formatPos(pos)}: the special must ride the ball`);
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

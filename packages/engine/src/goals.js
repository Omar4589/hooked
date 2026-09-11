// Goals (DESIGN.md §6). A level is won when it has goals and every one of them is done.
//
// Two kinds of bookkeeping. Stitch and clear goals are *live*: what is left is whatever the board
// still shows, which is why a multiplying moth can push a clear goal back above its total.
// Collect, beads and buried are *counted*: events tick them down and they stop at zero.

import { cellAt } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Blocker} Blocker */
/** @typedef {import('./constants.js').GoalState} GoalState */
/** @typedef {import('./constants.js').Removed} Removed */
/** @typedef {import('./level.js').Level} Level */

/** Counted from the board every time it is asked for, rather than tracked. @param {object} goal */
export const isLiveGoal = (goal) => goal.type === 'stitch' || goal.type === 'clear';

const countCells = (board, fn) => {
  let n = 0;
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (fn(cellAt(board, { x, y }))) n += 1;
    }
  }
  return n;
};

/** Squares still to stitch. @param {Board} board */
export const countStitch = (board) => countCells(board, (cell) => cell.stitch > 0);

/** Buttons still buried under a tangle. @param {Board} board */
export const countBuried = (board) => countCells(board, (cell) => cell.buried === true);

/**
 * How many of one blocker the board still holds: tangled cells (buried ones included), moths, or
 * knotted balls.
 * @param {Board} board
 * @param {Blocker} blocker
 */
export const countBlocker = (board, blocker) => {
  if (blocker === 'tangle') return countCells(board, (cell) => cell.tangle > 0);
  if (blocker === 'moth') return countCells(board, (cell) => cell.moth === true);
  return countCells(board, (cell) => cell.piece !== undefined && cell.piece.knotted === true);
};

const totalFor = (goal, level, board) => {
  switch (goal.type) {
    case 'stitch':
      return countStitch(board);
    case 'clear':
      return countBlocker(board, goal.blocker);
    case 'beads':
      return goal.count === undefined ? level.beads.total : goal.count;
    case 'buried':
      return goal.count === undefined ? countBuried(board) : goal.count;
    default:
      return goal.count === undefined ? 0 : goal.count;
  }
};

/**
 * The level's goals with the totals its board implies. Mutable: the counted ones tick down as
 * the game runs.
 * @param {Level} level
 * @param {Board} board  the board the level starts from
 * @returns {GoalState[]}
 */
export const createGoals = (level, board) =>
  level.goals.map((goal) => {
    const total = totalFor(goal, level, board);
    return { ...goal, total, remaining: total };
  });

const tick = (goal, n) => {
  goal.remaining = Math.max(0, goal.remaining - n);
};

/**
 * Collect goals count every ball of their colour that left the board, cascades and blasts
 * included (§6). Knotted balls and balls carrying a special count; the frog and beads have no
 * colour and never do.
 * @param {GoalState[]} goals  mutated
 * @param {Removed[]} removed
 */
export const creditRemoved = (goals, removed) => {
  for (const goal of goals) {
    if (goal.type !== 'collect') continue;
    let n = 0;
    for (const { piece } of removed) {
      if (piece !== undefined && piece.kind === 'yarn' && piece.color === goal.color) n += 1;
    }
    if (n > 0) tick(goal, n);
  }
};

/**
 * What the steps of a move are worth to the counted goals: a delivered bead, a button dug out
 * with the last layer of its tangle.
 * @param {GoalState[]} goals  mutated
 * @param {object[]} steps
 */
export const creditSteps = (goals, steps) => {
  let beads = 0;
  let buried = 0;
  for (const step of steps) {
    if (step.type === 'beadExit') beads += 1;
    else if (step.type === 'blocker' && step.kind === 'tangle' && step.buried === true) buried += 1;
  }
  for (const goal of goals) {
    if (goal.type === 'beads' && beads > 0) tick(goal, beads);
    if (goal.type === 'buried' && buried > 0) tick(goal, buried);
  }
};

/**
 * The goals as `state()` reports them: fresh objects, with the live ones recounted.
 * @param {GoalState[]} goals
 * @param {Board} board
 * @returns {GoalState[]}
 */
export const snapshotGoals = (goals, board) =>
  goals.map((goal) => ({
    ...goal,
    remaining: isLiveGoal(goal)
      ? goal.type === 'stitch'
        ? countStitch(board)
        : countBlocker(board, goal.blocker)
      : goal.remaining,
  }));

/**
 * Won: the level asked for something, and none of it is left. A level with no goals is never
 * won — the sandboxes and the fixtures play until the moves run out.
 * @param {GoalState[]} goals
 * @param {Board} board
 */
export const allGoalsMet = (goals, board) =>
  goals.length > 0 && snapshotGoals(goals, board).every((goal) => goal.remaining === 0);

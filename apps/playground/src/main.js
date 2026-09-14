import { COLORS, ENGINE_VERSION } from '@hooked/engine';
import { LEVEL_FORMAT_VERSION, listLevels } from '@hooked/levels';

// The six yarn hexes, kept in step with apps/mobile/src/art/palette.js (DESIGN.md §15). The
// playground is a debug view of the engine, not the game, so it copies the values rather than
// depending on the phone app; palette.js is the source of truth and these follow it.
const PALETTE = {
  olive: '#78824F',
  mustard: '#D8AE4B',
  blush: '#E9C2BE',
  rust: '#AE5338',
  lavender: '#9791C7',
  cocoa: '#4D352E',
};

const status = document.querySelector('#status');
const palette = document.querySelector('#palette');

status.innerHTML =
  `<code>@hooked/engine</code> ${ENGINE_VERSION} · ` +
  `<code>@hooked/levels</code> format v${LEVEL_FORMAT_VERSION}, ${listLevels().length} levels`;

for (const color of COLORS) {
  const ball = document.createElement('div');
  ball.className = 'ball';
  ball.title = color;
  ball.style.background = PALETTE[color];
  palette.appendChild(ball);
}

import { COLORS, ENGINE_VERSION } from '@hooked/engine';
import { LEVEL_FORMAT_VERSION, listLevels } from '@hooked/levels';

// Placeholder hexes for the six yarn colors (DESIGN.md §15). Real art arrives in phase 5.
const PALETTE = {
  olive: '#7a8450',
  mustard: '#d4a73a',
  blush: '#e3b2ad',
  rust: '#b5563a',
  lavender: '#9b95c9',
  cocoa: '#5a3e36',
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

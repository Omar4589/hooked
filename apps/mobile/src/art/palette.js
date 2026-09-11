// Placeholder hexes for the six yarn colors (docs/DESIGN.md §15). Real SVG yarn balls
// replace the colored circles in phase 5; until then every piece is one of these.
export const PALETTE = Object.freeze({
  olive: '#7a8450',
  mustard: '#d4a73a',
  blush: '#e3b2ad',
  rust: '#b5563a',
  lavender: '#9b95c9',
  cocoa: '#5a3e36',
});

// Board and screen background: warm cream ("oat"), deliberately not a piece color.
export const CREAM = '#f6efe4';

// Phase 2 only: a thin ring marks a ball that carries a special. The engine makes them on 4+
// matches from phase 1, so without a mark a four-match leaves behind a ball that swaps oddly and
// looks like every other one. Phase 3 replaces it with the real overlays.
//
// Which ring depends on the ball: white reads on olive, rust and cocoa but all but vanishes on
// blush (1.9:1), so the three light yarns take a dark ring instead. Every pairing below is at
// least 4:1.
const RING_LIGHT = 'rgba(255, 255, 255, 0.85)';
const RING_DARK = 'rgba(58, 42, 36, 0.8)';

/** Relative luminance (WCAG), so the split is measured rather than eyeballed. */
const luminance = (hex) => {
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel(((n >> 16) & 255) / 255) +
    0.7152 * channel(((n >> 8) & 255) / 255) +
    0.0722 * channel((n & 255) / 255)
  );
};

/** The ring color that shows on a given yarn. @param {string} [color] */
export const ringFor = (color) =>
  luminance(PALETTE[color] ?? PALETTE.cocoa) > 0.25 ? RING_DARK : RING_LIGHT;

// Placeholder tokens for the cell layer (phase 4): a faint grid so holes read as gaps, the
// tangle's stack of layers, and the stitch square before and after it is stitched. Phase 5
// replaces all of it with the drawn tiles, so nothing here is a colour a piece uses.
export const GRID_LINE = 'rgba(90, 62, 54, 0.12)';
export const TANGLE_FILL = 'rgba(90, 62, 54, 0.18)';
export const TANGLE_LINE = 'rgba(90, 62, 54, 0.6)';
export const STITCH_LINE = 'rgba(90, 62, 54, 0.45)';
export const STITCH_FILL = 'rgba(122, 132, 80, 0.35)';

// Yarn Over palette — single source of truth for piece colours.
//
// Hue families come from the reference photos; the hexes themselves are
// authored, not sampled. The photos were shot under warm indoor light and
// sample out as near-neutral greys, so they set the hue family and the mood
// and nothing more.
//
// The values below are luminance-tuned. The art brief requires that no two
// yarns are confusable in greyscale, and the original placeholders failed it:
// lavender and mustard sat 14.7 apart. These six are spread 58 / 100 / 124 /
// 150 / 176 / 202, with hue preserved. The tightest step is rust to olive at
// 23.79; every other step clears 25.6. So the spread survives a minimum gap of
// 23 but not 24 — assertGreyscaleSpread(24) throws on that pair. The guard's
// own default is 18, and palette.test.js pins 18 and 20.
// Changing a hex means re-checking that spread — see assertGreyscaleSpread().
export const PALETTE = Object.freeze({
  olive: '#78824F',
  mustard: '#D8AE4B',
  blush: '#E9C2BE',
  rust: '#AE5338',
  lavender: '#9791C7',
  cocoa: '#4D352E',
});

// Display names, for the in-game pattern book. Nothing draws them yet.
export const YARN_NAMES = Object.freeze({
  olive: 'Olive Grove',
  mustard: 'Mustard Seed',
  blush: 'Blush Petal',
  rust: 'Rust Clay',
  lavender: 'Lavender Dusk',
  cocoa: 'Cocoa Bean',
});

// Canonical order for anything that iterates colours (shop, pattern book,
// level authoring). Object key order is not a contract; this is.
export const COLOR_KEYS = Object.freeze(['olive', 'mustard', 'blush', 'rust', 'lavender', 'cocoa']);

// Board and screen background: warm cream ("oat"), deliberately not a piece
// colour. OAT is the name used in the art docs and in pieces.js; CREAM is kept
// because the app already imports it.
export const CREAM = '#F6EFE4';
export const OAT = CREAM;

/** Relative luminance (WCAG), so colour decisions are measured, not eyeballed. */
export const luminance = (hex) => {
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel(((n >> 16) & 255) / 255) +
    0.7152 * channel(((n >> 8) & 255) / 255) +
    0.0722 * channel((n & 255) / 255)
  );
};

/** Perceived grey value 0-255, the axis the greyscale requirement is measured on. */
export const greyValue = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};

/**
 * Guards the art brief's rule that no two yarns merge in greyscale.
 * Worth calling from a unit test so a future colour tweak cannot quietly
 * break board readability.
 */
export const assertGreyscaleSpread = (minGap = 18) => {
  const sorted = COLOR_KEYS.map((k) => [k, greyValue(PALETTE[k])]).sort((a, b) => a[1] - b[1]);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i][1] - sorted[i - 1][1];
    if (gap < minGap) {
      throw new Error(
        `Yarn colours ${sorted[i - 1][0]} and ${sorted[i][0]} are ${gap.toFixed(1)} apart in ` +
          `greyscale (minimum ${minGap}). They will be confusable on the board.`,
      );
    }
  }
  return true;
};

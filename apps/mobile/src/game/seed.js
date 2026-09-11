// A fresh attempt gets a fresh seed (docs/DESIGN.md §3 "Randomness is per attempt"), so Retry
// deals a different board rather than replaying the one that was just lost.

/** @returns {string} */
export const newSeed = () => String(Date.now());

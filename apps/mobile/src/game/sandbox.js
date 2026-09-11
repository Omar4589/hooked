// Phase 2 scaffold. The app needs a board to play and the level loader arrives in phase 4, so
// until then it plays one development board from @hooked/levels (levels/dev/, never listed by
// listLevels()). Phase 4 deletes this file and asks the loader for the level instead; it is the
// only place in the app that names a level file, and src/game/sandbox.test.js keeps it that way.

import level from '@hooked/levels/levels/dev/sandbox-9x9.json';

export { level };

/** A fresh attempt gets a fresh seed (docs/DESIGN.md §3 "Randomness is per attempt"). */
export const newSeed = () => String(Date.now());

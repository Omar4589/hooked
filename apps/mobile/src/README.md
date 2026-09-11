# apps/mobile/src

Layout from docs/DESIGN.md §11. Each folder is created when its phase lands; `art/`, `game/`,
`screens/` and `nav.js` exist today.

| Folder | Holds | Arrives |
|---|---|---|
| `game/` | `Board.jsx`, `Piece.jsx`, the swipe (`useSwipe.js`) and the step player (`move.js` + `animate.js`) now; HUD, GoalsBar and Meter with the level rules | phase 2 (board), phase 4 (HUD) |
| `room/` | Room scene, placement, shop, creatures, beauty | phase 6 |
| `screens/` | `HomeScreen.jsx` and `PlayScreen.jsx` now; Room, Shop, LevelCard, Result, PatternBook, Settings | phase 0 hello world, the board in phase 2, the rest in phases 4–6 |
| `meta/` | `storage.js` (expo-sqlite/kv-store behind one module), progress store, coins, lives, boosters, streaks, daily basket | phase 6 |
| `art/` | `palette.js` now (placeholder hexes); yarn sprites, specials, creatures, decor, rooms, project illustrations | phase 0 placeholder, real art in phase 5 |

Screens are registered in `../App.jsx` (React Navigation native-stack) and navigate through
`nav.js`, never through the navigator directly. `config.js` reads the API URL the build was
cut with.

`game/` splits in two on purpose. The geometry, the swipe maths, the view model and the whole
move timeline (`geometry.js`, `input.js`, `model.js`, `move.js`, `animate.js`, `timings.js`)
import nothing from react or react-native, so `npm run test:mobile` runs them in node — including
a test that replays real games through the engine's own `applySteps` and checks the board the
player would draw. The components around them (`Board.jsx`, `Piece.jsx`, `useSwipe.js`) are
checked on a phone. Anything a gesture or an animated style calls runs on the UI thread and so
carries a `'worklet'` directive; `sandbox.js` is the phase-2 scaffold that names the development
level, and phase 4 deletes it.

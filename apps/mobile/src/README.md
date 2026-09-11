# apps/mobile/src

Layout from docs/DESIGN.md §11. Each folder is created when its phase lands; `art/`, `game/`,
`screens/` and `nav.js` exist today.

| Folder | Holds | Arrives |
|---|---|---|
| `game/` | `Board.jsx`, `Piece.jsx`, `Cell.jsx`, `GoalsPanel.jsx`, the gestures (`gestures.js`), the step player (`move.js` + `animate.js`), `seed.js` and a placeholder `Meter.jsx`; the meter dial and the real art arrive with phase 5 | phase 2 (board), phase 3 (specials), phase 4 (cells, goals, move counter) |
| `room/` | Room scene, placement, shop, creatures, beauty | phase 6 |
| `screens/` | `HomeScreen.jsx`, `PlayScreen.jsx` and `ResultScreen.jsx` now; Room, Shop, LevelCard, PatternBook, Settings | phase 0 hello world, the board in phase 2, Result in phase 4, the rest in phase 6 |
| `meta/` | `storage.js` (expo-sqlite/kv-store behind one module), progress store, coins, lives, boosters, streaks, daily basket | phase 6 |
| `art/` | `palette.js` now (placeholder hexes); yarn sprites, specials, creatures, decor, rooms, project illustrations | phase 0 placeholder, real art in phase 5 |

Screens are registered in `../App.jsx` (React Navigation native-stack) and navigate through
`nav.js`, never through the navigator directly. `config.js` reads the API URL the build was
cut with.

`game/` splits in two on purpose. The geometry, the swipe maths, the view model and the whole
move timeline (`geometry.js`, `input.js`, `model.js`, `move.js`, `animate.js`, `timings.js`)
import nothing from react or react-native, so `npm run test:mobile` runs them in node — including
a test that replays real games through the engine's own `applySteps` and checks the board the
player would draw. The components around them (`Board.jsx`, `Piece.jsx`, `Cell.jsx`, `gestures.js`) are
checked on a phone. Anything a gesture or an animated style calls runs on the UI thread and so
carries a `'worklet'` directive. Levels come from `@hooked/levels` (`listDevLevels`,
`loadLevel`) and never from a file this app names: `game/sandbox.test.js` keeps it that way.

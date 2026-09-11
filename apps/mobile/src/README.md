# apps/mobile/src

Layout from docs/DESIGN.md §11. Each folder is created when its phase lands; `art/`,
`screens/` and `nav.js` exist today.

| Folder | Holds | Arrives |
|---|---|---|
| `game/` | Board, Piece, HUD, GoalsBar, Meter, gestures, the step player | phase 2 |
| `room/` | Room scene, placement, shop, creatures, beauty | phase 6 |
| `screens/` | `HomeScreen.jsx` now; Room, Shop, LevelCard, Play, Result, PatternBook, Settings | phase 0 hello world, the rest in phases 4–6 |
| `meta/` | `storage.js` (expo-sqlite/kv-store behind one module), progress store, coins, lives, boosters, streaks, daily basket | phase 6 |
| `art/` | `palette.js` now (placeholder hexes); yarn sprites, specials, creatures, decor, rooms, project illustrations | phase 0 placeholder, real art in phase 5 |

Screens are registered in `../App.jsx` (React Navigation native-stack) and navigate through
`nav.js`, never through the navigator directly. `config.js` reads the API URL the build was
cut with.

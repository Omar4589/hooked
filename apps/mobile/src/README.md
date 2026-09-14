# apps/mobile/src

Layout from docs/DESIGN.md §11. Each folder is created when its phase lands; `art/`, `game/`,
`screens/` and `nav.js` exist today.

| Folder | Holds | Arrives |
|---|---|---|
| `game/` | `Board.jsx`, `Piece.jsx`, `Cell.jsx`, `GoalsPanel.jsx`, `Meter.jsx` (the frog meter's dial), the gestures (`gestures.js`), the step player (`move.js` + `animate.js`) and `seed.js` | phase 2 (board), phase 3 (specials), phase 4 (cells, goals, move counter), phase 5 (the real art, the dial, the frog's poses) |
| `room/` | Room scene, placement, shop, creatures, beauty | phase 6 |
| `screens/` | `HomeScreen.jsx`, `PlayScreen.jsx`, `LevelCard.jsx` and `ResultScreen.jsx` now; Room, Shop, PatternBook, Settings | phase 0 hello world, the board in phase 2, Result in phase 4, the level card in phase 5, the rest in phase 6 |
| `meta/` | `storage.js` (expo-sqlite/kv-store behind one module), progress store, coins, lives, boosters, streaks, daily basket | phase 6 |
| `art/` | `palette.js` (the six yarn hexes and the greyscale guard), `pieces.js` (every board SVG as a string factory — the designer's delivery), `compose.js` (glues those strings into the images the board draws), `sprites.js` (parses each composed string once into a react-native-svg AST), `type.js` (the four Fredoka families), and the project registry the win screen draws from: `projects.js` (the key a level names) and `illustrations.js` (the two PNGs that key opens), with the coaster's six files at 1×/2×/3× beside them; creatures, decor and rooms are still to come | phase 0 placeholder hexes, the board's art in phase 5, the project illustration with the vertical slice, creatures and rooms with the room in phase 6 |

Screens are registered in `../App.jsx` (React Navigation native-stack) and navigate through
`nav.js`, never through the navigator directly. `config.js` reads the API URL the build was
cut with.

`game/` splits in two on purpose. The geometry, the swipe maths, the view model and the whole
move timeline (`geometry.js`, `input.js`, `model.js`, `move.js`, `animate.js`, `timings.js`)
import nothing from react or react-native, so `npm run test:mobile` runs them in node — including
a test that replays real games through the engine's own `applySteps` and checks the board the
player would draw. The components around them (`Board.jsx`, `Piece.jsx`, `Cell.jsx`,
`GoalsPanel.jsx`, `Meter.jsx`, `gestures.js`) are checked on a phone. Anything a gesture or an
animated style calls runs on the UI thread and so carries a `'worklet'` directive. Levels come
from `@hooked/levels` (`listDevLevels`, `loadLevel`) and never from a file this app names:
`game/sandbox.test.js` keeps it that way.

`Meter.jsx` lives here but is not mounted here: §11 hangs the dial under the goals panel, so
`PlayScreen` draws it and `Board` publishes its props through `onMeter`. The charge it shows is
sampled off the move's `meterFrames` against the board's clock rather than read from
`game.state()`, which says 0 by the time a move ends — the engine zeroes the charge inside the
same call that fills it.

`LevelCard.jsx` lives in `screens/` but is not registered in `../App.jsx`: the card is a step
inside `PlayScreen`, not a route — §11 was written the other way round and now says so ("**The
level card is not a route**", owner, 2026-09-13). It has to be, because what it covers is the
board's own mount: `PlayScreen` measures the arena on one commit and mounts `<Board>` on the next,
so the expensive commit lands after `onLayout` returns whatever screen is on top of it. The
deferral is `PlayScreen`'s — once the arena is measured it schedules two `requestAnimationFrame`s,
so a frame has actually gone out with the card on it before the flag that mounts the board is set.
`Board` reports back through a new `onReady`, fired from its root's own `onLayout`, which is the
commit that carries the cells and the pieces; and a 4 s timer flips the card's Play regardless, so
a signal that never arrives degrades to a wait rather than to a trapped player.

`art/` splits the same way, for a sharper reason. `palette.js`, `pieces.js` and `compose.js` are
plain data and plain strings, so the test run covers them too — `npm run test:mobile` runs
`node --test` over `src/*/*.test.js`, both folders — and what it checks is the markup itself: what
overlays what, in what order, on which viewBox, and that a composed piece never repeats an id.
`sprites.js` cannot be tested there and never will be: it imports `react-native-svg`, and that
import reaches `react-native` itself, whose Flow-typed source plain node will not parse. That is
why it holds nothing but parse-and-remember — each composed string becomes one react-native-svg
AST, at module load or the first time the board asks for it, and every component drawing that
picture is handed the same one. Merging it back into `compose.js` would look like tidying and
would silently delete `compose.test.js`'s reach.

`illustrations.js` is out of node for a different reason and stays split for the same one. It
imports nothing: it is a flat object literal of `require()` calls on PNG files, and under
`node --test` neither spelling survives — `require` is not defined in an ES module scope, and an
`import` of a `.png` throws `ERR_UNKNOWN_FILE_EXTENSION` — so a test that reached it would fail,
and only it: `node --test` runs each file in its own process, so the rest of the run survives. Everything node can execute is in
`projects.js`, which is one function: `projectKeyOf(level)`, the `project` key a level carries
(§10) or null. `projects.test.js` covers the Metro half the way `pieces.test.js` polices its own
import list, by reading the source as text — it parses every `require()` path, checks that PNG and
its `@2x`/`@3x` siblings are on disk, and checks the map and the level files agree in both
directions: every key is a project some level carries, and every *shipped* level's project is a
key. That scan is why the file has to stay a flat literal with one quoted path per `require()`,
and why the list of projects that have art lives there and is never mirrored into `projects.js` to
get it under node: two lists drift, and this drift lands on the win screen, whose only way out is
Home. The contact sheet the cut-outs were checked against is not in this folder — no alpha
channel, labels baked into the pixels, so it is not a shipping asset — and lives in
`docs/design/reference/`.

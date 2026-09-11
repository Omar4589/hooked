# Book 1 — Kitchen & Coasters (levels 1–15)

The level-by-level plan the v0.6 note in DESIGN.md promised. Teaching order follows §9
(Fishdom's own): swap and Puff (1), Bobble (3), Tangles (4), the frog meter (5), Popcorn (7),
Knots and booster slots (8), Yarn Bomb (10), Buried (11), the first wall (12), the book's big
project (15). Room: the Craft Nook. Numbers are starting points; phase 6's bot sims tune moves,
colors and blocker density to the §11 targets (easy 60–80 %, medium 35–50 %, hard 15–25 % for
the greedy bot). `hard` uses the labels from §8; only level 12 is flagged.

| # | Project | Teaches (`tutorial`) | Goals | Board | Colors | Moves | Meter | Hard | Nook slot |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Coaster (olive) | `swap`, then `puff` | Stitch, 1 layer | 5×5 round-ish | 5 | 20 | none | – | coaster stack on the side table |
| 2 | Coaster (blush) | practice | Stitch, 1 layer | 6×6 | 5 | 20 | none | – | coaster stack |
| 3 | Coaster (mustard) | `bobble` | Stitch, 1 layer | 7×7 | 5 | 22 | none | – | coaster stack |
| 4 | Dishcloth | `tangle` | Clear tangles (1 layer) | 7×7 | 5 | 24 | none | – | dishcloth over the shelf rail |
| 5 | Mug cozy | `meter` (starts with a Bobble placed) | Collect 30 olive | 7×7 | 5 | 24 | frog | – | mug with cozy on the shelf |
| 6 | Potholder | mixed goals | Stitch + a few 1-layer tangles | 8×8 | 5 | 26 | frog | – | potholder on a wall hook |
| 7 | Potholder (rust) | `popcorn` (open board, 6-matches possible) | Collect 40 rust | 8×8 open | 5 | 26 | frog | – | potholder hook |
| 8 | Untangle the stash | `knot`, then `boosters` (three free Scissors) | Clear knots | 8×8 | 6 | 26 | frog | – | yarn basket by the chair |
| 9 | Puff Flower | collect in rings | Collect 3 colors (30 / 20 / 10) | 8×8 round | 5 | 28 | frog | – | framed on the shelf |
| 10 | Dishcloth (chevron) | `yarnbomb` (open board) | Stitch, 2-layer center | 9×9 | 5 | 28 | frog | – | dishcloth rail |
| 11 | Button jar | `buried` | Buried 8 | 9×9 | 6 | 28 | frog | – | button jar on the shelf |
| 12 | Mug cozy (striped) | first wall | Collect 50 mustard + Clear tangles | 9×9, tangle bar | 6 | 24 | frog | `tricky` | mug on the shelf |
| 13 | Coaster set (4) | shaped board | Stitch, four marked squares | 9×9 with holes | 6 | 26 | frog | – | coaster stack |
| 14 | Coaster set (8) | stitch + tangles | Stitch, eight squares behind 1-layer tangles | 9×9 | 6 | 26 | frog | – | coaster stack |
| 15 | Twelve Coasters | the finale | Stitch exactly 12 squares in two rows of six | 9×9 | 6 | 30 | frog | – (tuned as a wall) | the full set stacked on the side table |

Nook placement, six places: the coaster stack on the side table (levels 1–3, 13–15 add to it),
the dishcloth rail (4, 10), the mug with its cozy on the shelf (5, 12), the potholder hook
(6, 7), and the shelf for Puff Flower and the button jar (9, 11); the yarn basket (8) sits by
the chair. Every level gets a Pattern Book page. The project ids in the level JSON are
`coaster_olive`, `coaster_blush`, … `twelve_coasters`, matching the illustration file names in
`docs/design/BRIEF.md`.

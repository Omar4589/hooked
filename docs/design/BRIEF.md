# Art brief — Yarn Over

Everything a designer needs to make the art for **Yarn Over**, a cozy crochet match-3 for iOS
and Android. Read this page top to bottom; DESIGN.md §12 (mood), §15 (palette) and §16
(pipeline) are the background, and this page is the work order.

**Where the work stands (2026-09-13):** phase 5 drew the whole board set in code — the six yarn
balls, the four specials, the frog, the tangles, the stitch tiles, the goal icons, the dial — and
played it on a phone. Then it built level 1's three screens around them: the level card, the win
screen and the lose screen are in the app, Book 1 level 1 is authored and playable, and the coaster
illustration is **wired** — the game draws both delivered states, in three places. Deliverable 2 is
**closed**, deliverable 6 is **closed**, deliverable 4 is **delivered and in use** with a re-cut
asked for, and deliverables 1 and 3 are down to the parts nothing has drawn yet. Each heading below
says which it is; anything marked **landed** is in the repo and needs nothing from a designer, with
the named exceptions inside deliverables 2 and 4. What is still open: the illustration style, a
designer pass over the three screens that are now built, the sixteen sound cues, a second look
at the yarn bomb (deliverable 2), and the coaster re-cut (deliverable 4).

**And the animation commission is released.** The condition this brief set for it — level 1's static
art in and moving on a phone — is met as of 2026-09-13. See "What comes later".

## Ground rules

- **Nothing personal ships.** The reference photos supplied privately are references for
  texture, palette and the shape of each project. Every shipped image is an illustration, never
  a photograph, and no name appears anywhere in the app or the store listing.
- **Nothing from Fishdom.** No fish, no aquarium, no traced UI, no borrowed names. The
  mechanics are a tribute; the look is ours.
- **No third-party IP.** Anything branded visible in a reference photo is left out.
- **Readable before pretty.** Pieces are 30–40 pt on a phone and sit next to seven other things.
  Silhouette and texture do the work; colour is the last cue, not the first.

## Mood

A yarn shop on a rainy afternoon. Cream ground, warm wood, visible stitch texture, safety-eye
dots on the creatures. Nothing neon, no outlines heavier than the stitch texture.

**Soft dimensional, never glossy.** The pieces are vector, but they are not flat: a warm side
light, a shaded underside, and a soft contact shadow where a piece meets the board, so a yarn
ball reads round and tactile at 34 pt. Matte throughout — real yarn is fuzzy, and a piece that
looks like polished plastic reads as the wrong material however well it is drawn. Think of
lighting a real ball of wool on a table by a window, not of a 3D render.

Draw the shading into the vector (gradients and soft shapes are welcome) rather than flattening
it to a bitmap, so the pieces keep recolouring and scaling for free.

**This is drawn now, not described.** `apps/mobile/src/art/pieces.js` is the mood as built: every
ball is a radial gradient from a lightened base to a darkened one, lit from the upper left, with a
second gradient washing the lower right, a soft contact shadow under it, and its strands drawn
three times — a dark offset below, the body, a lightened offset above — so the pattern reads as
cord rather than as a line. Highlights are the colour lightened, never white, because a white
specular reads as plastic. New art matches those pieces; they are the style sheet in practice.

**Style phrase** — use it verbatim in every generation prompt so the set matches:

> *soft-shaded vector illustration of a crocheted [thing], warm side light, matte wool texture, soft contact shadow, cozy, plain cream background, no text*

## Palette

Six yarn colours plus the cream ground. The keys are fixed in code and cannot change; the display
names show only in the Pattern Book. **The six hexes are authored and shipped** — they live once,
in `apps/mobile/src/art/palette.js`, and every piece on the board is drawn from them.

Sampling them from the reference photos was the original plan and it did not survive the photos:
they were shot under warm indoor light and sample out near-neutral grey, so they set the hue
family and the mood and nothing else. The six below were authored against those hue families and
then tuned on the greyscale axis, because the rule under the table is the one that decides whether
the board is playable.

| Key | Display name | Hex | Greyscale | Seen in |
|---|---|---|---|---|
| `olive` | Olive Grove | `#78824F` | 124 | tote, coasters |
| `mustard` | Mustard Seed | `#D8AE4B` | 176 | blanket, spinner |
| `blush` | Blush Petal | `#E9C2BE` | 202 | blanket, coasters, spinner |
| `rust` | Rust Clay | `#AE5338` | 100 | blanket |
| `lavender` | Lavender Dusk | `#9791C7` | 150 | blanket |
| `cocoa` | Cocoa Bean | `#4D352E` | 58 | blanket joins |
| (ground) | Oat | `#F6EFE4` | 240 | board and screen background, never a piece |

Every colour also gets its own strand pattern, so two balls differ by shape as well as hue. A
player who cannot tell rust from olive must still be able to play — which is what the greyscale
column is for. Sorted, the six sit at 58, 100, 124, 150, 176 and 202: the tightest step is rust to
olive at 23.8 and every other step clears 25.6. The old placeholder hexes failed that rule badly
(lavender and mustard were 14.7 apart). `assertGreyscaleSpread()` in `palette.js` is the rule as a
function and `palette.test.js` holds it at 18 and at 20, so a colour tweak that merges two yarns
fails a test instead of reaching a board. Changing a hex means re-running it.

---

## Deliverable 1 — style sheet (half landed)

One page, `docs/design/style-sheet.pdf`.

**The colour half is settled.** The six hexes and the oat ground are authored and in code, above —
nothing is left to sample and nothing is left to choose. The sheet records them; it does not decide
them.

**The illustration half is still wanted**, because fifteen Book 1 illustrations have to look like
one set in phase 6:

- Three test illustrations made with the style phrase — a coaster, a mug cozy and the frog —
  regenerated until they read as one set.
- The treatment rules that hold a generated set together: line weight, how much shadow, how stitch
  texture is drawn at illustration size, how tight the crop is.

The board pieces no longer need a sheet to be drawn from — they are drawn, and `pieces.js` is the
reference for anything that has to sit beside them.

The coaster is effectively the first of those three already: it is delivered, it is in the game, and
it is up for a re-cut (deliverable 4). So the sheet and that re-cut are the same conversation and
are cheapest done together — whatever the re-cut settles about line weight, crop and how a state
reads is what the other fourteen are generated against.

**Done when** the three test images look like they came from the same hand, and a fourth made from
the same phrase joins them without a regeneration.

## Deliverable 2 — the board set (landed 2026-09-12)

**Delivered, and not as 26 SVG files.** The board set landed as a generated module:
`apps/mobile/src/art/pieces.js`, one factory per piece, each board factory returning an SVG string
on a 100×100 viewBox with the piece at about 84% fill and its margin already inside, and each goal
icon on a 24×24 one. 30 board factories and 13 goal icons — 50 distinct drawings once the frog's
variants are counted. `compose.js` glues a ball, its special and its knot into one root;
`sprites.js` parses each composed string once — at module load, or the first time the board asks
for it — and hands the same tree to every cell drawing that picture. Nothing writes these out as
files and nothing needs to: the app is the only renderer.

What is drawn, and the two rows that are not what this brief originally asked for:

| # | Asset | Drawn as | What it does |
|---|---|---|---|
| 1 | Yarn balls | `yarnBall(key)`, six | Gradient body lit from the upper left, three-pass strands, contact shadow. Each colour has its own strand layout, so the six differ by shape as well as by hue |
| 2 | Special overlays | `puff`, `bobble`, `popcorn`, `yarnBomb` | Puff, bobble and popcorn sit **on top of** a ball of any of the six colours, and are cream-toned with their own shading so they read against all six. **The yarn bomb does not** — it replaces the ball entirely. See the note below |
| 3 | Frog | `frog(pose, opt)`: `piece`, `dial`, `hop`, plus blink and tongue | The eye bumps are the silhouette tell; his limbs tuck in on the board and splay out only on the hop. His green is deliberately brighter than olive yarn so he never reads as a ball |
| 4 | Hook | `hook` | Rides on a ball like a special overlay, and sits in the dial on a hook-meter level |
| 5 | Bead and button | `bead`, `button` | Different silhouettes, not just different colours |
| 6 | Tangle | `tangle(1)`, `tangle(2)`, `tangle(3)` | Density and value both climb — 5, 9 then 14 loops, darker and more opaque each time. **No number is printed on it**; the drawing carries the layer count |
| 7 | Knot overlay | `knot` | Drawn low on the ball so it coexists with a special in the centre |
| 8 | Moth | `moth` | Fills the cell. Muted rather than grim |
| 9 | Stitch tiles | `stitchTile('unstitched1' \| 'unstitched2' \| 'stitched')` | Low contrast: they sit under the balls and must not compete with them |
| 10 | Board frame and dial | `cellTile`, `meterRing`, `meterFill(charge)` | The board's floor is one tile sheet rather than 81 hairline views; the dial's fill is a drawing per notch, not an animated stroke |
| 11 | Goal icons | `GOAL_ICONS`, thirteen | 24×24 silhouettes, drawn at 22 pt in the goals panel: stitch, collect in each of the six colours, beads, tangle, knot, moth, buried, gear |
| 12 | Coin | `coin` | Drawn, and on the win screen since 2026-09-13, beside the coins figure |

**The one thing the owner wants revisited: a yarn bomb's colour cannot be read.** The bomb replaces
the ball instead of sitting on it — an owner decision of 2026-09-12, not an oversight, and
`compose.test.js` pins it so a later change cannot quietly put a ball back underneath. The
consequence is a readability hole: a bombed ball still matches by its own colour in the engine, but
it is one fixed drawing — a dark ball wrapped in the same five strand colours whichever yarn it is,
so nothing on it changes with the colour it matches by. A player looking at a yarn bomb cannot tell
whether it is the olive one or the rust one. Everything else in the delivery is closed; this is the
piece to look at again. Whatever fixes it has to keep the bomb reading as the biggest and loudest of
the four specials while still saying which yarn it is — a rim in the ball's colour, a visible core,
a band, whatever survives at 34 pt.

**Two pieces nobody has seen on a phone.** No development level places a three-layer tangle or a
knot — `moths-7x7` carries the one- and two-layer ones — and Book 1 level 1, the one shipped level
so far, has neither, so `tangle(3)` and `knot()` are drawn and unit-tested but unseen until Book 1's
blocker levels are authored in phase 6 (tangles from level 4, knots at level 8). If either reads
badly there, it comes back here.

**If a weaker phone ever needs it**, §16's fallback is exporting the same art to PNG at 1×/2×/3×
and swapping the renderer — the step player hands the renderer plain numbers, so nothing in the
game changes. That would be a designer job. It has not happened: the device numbers are in
`docs/QUESTIONS.md` items 38 and 39, and the board's slow open on the minimum-spec phone is covered
by the level card instead (deliverable 3) — measured on an iPhone, at any rate: the minimum-spec
phone has not been run again since the card was built.

## Deliverable 3 — level 1's screens (part landed)

**The in-level HUD is built and was played on a phone on 2026-09-12**: the left column carries the
level number, the goal rows with their real icons, the move counter pinned to the bottom, and the
frog dial under them. The dial is sized from the measured column between 56 and 100 pt, so a level
with four goals shrinks the dial rather than pushing the move counter off the bottom of a short
screen. The goals-bar icons — item 5 of the original list — are drawn (deliverable 2, row 11).
Neither needs a mockup now. A designer pass over what shipped is welcome; nothing is blocked on it.

**The three panels are built too, as of 2026-09-13**, and were played on a phone the same day —
from the list below rather than from a mockup, because the level card turned out to be load-bearing
and could not wait for one. So the ask has changed shape: it is a pass over three screens that
exist, not a design for three that do not. What is there now, all landscape, all on the oat ground:

1. **Level card** — the panel before a level starts, and the one the game cannot do without: it
   covers the board's mount, which costs 1845 ms on the minimum-spec phone (`docs/QUESTIONS.md`
   items 38 and 39). Full screen, not a card floating over anything. Back at the top left; then a
   row — on the left "Level 1", the level's name, the goal icons with their counts and the move
   count, and on the right the project's **empty** illustration; then a footer with three booster
   slots captioned "Unlocked at level 8" on the left and Play on the right. Play is drawn from the
   first frame but sits dim and does nothing until the board behind it is up, then brightens
   without moving. Home is still a placeholder list of buttons; it becomes the Room in phase 6.
2. **Win screen** — *Fastened off!* on a cream card over the finished board: the level's name
   under the title, then a row of the **finished** project fading up over 400 ms beside the score
   and the coins, with the drawn coin (deliverable 2, row 12) next to the amount. Still no coin
   pile and no confetti — those are the commission, released below. Continue belongs with lives
   and stitch markers in phase 6, so the buttons are Retry and Home.
3. **Lose screen** — *Ran out of yarn.* The same card with the **empty** project in place of the
   finished one, a line saying the goals were not finished in time, and Retry and Home.

**Still wanted:** a designer pass over those three, as PNG or PDF mockups at 2× that the build
follows where it should change. Landscape; the game is landscape-locked and phone and iPad share one
layout. Type, spacing and hierarchy are the parts most likely to be wrong — they were set by eye
against Fredoka and the palette, and nothing else.

**Done when** every number and icon on the three panels is legible at arm's length on a phone held
in landscape.

## Deliverable 4 — one project illustration (delivered, wired, one re-cut asked for)

`coaster_olive`, the olive puff-stitch coaster level 1 makes, in **two states**: an empty state and
the finished piece. Both were delivered on 2026-09-12, and since 2026-09-13 the game draws them.

**What the game does with them.** A level names the project it makes — `"project": "coaster_olive"`
in the level JSON — and that one string is the whole wiring: `apps/mobile/src/art/projects.js`
reads the name off the level, `illustrations.js` files the two PNGs under it, and the screens ask
for `illustrationFor(projectKeyOf(level))`. Adding the next project is its six PNGs and one entry
in `illustrations.js`; nothing else in the app changes. The two states appear in three places:

- **The level card**, before a level starts — the **empty** state, on the right of the card. What
  she is about to make.
- **The win screen** — the **finished** piece, fading up over 400 ms beside the score and coins.
- **The lose screen** — the **empty** state again, at full opacity.

**It does not fill in as the goal progresses.** That was this brief's original sentence and it is
not what shipped: the game shows one state or the other. The two files are the same drawing on the
same crop — their ink lands in the same box within a pixel or two, `done` larger by about 1% — so
growing or cross-fading one over the other spends most of its run showing a small coloured coaster
inside a larger pale one, which reads as two objects rather than one being finished. A progressive
fill is a real thing to want (DESIGN.md §6 wants it for collect goals) and it needs art built for
it: separate rings, rounds or halves that can be revealed in order. Say if that is worth quoting;
nothing is blocked on it.

**A project with no art draws nothing at all** — no placeholder box, no outline, no gap in the
layout. Today that is all five development boards; `coaster_olive` is the only project with art.

**The files**, in `apps/mobile/src/art/`, all six delivered and in use:

```
illus_coaster_olive_empty.png   illus_coaster_olive_empty@2x.png   illus_coaster_olive_empty@3x.png
illus_coaster_olive_done.png    illus_coaster_olive_done@2x.png    illus_coaster_olive_done@3x.png
```

200 / 400 / 600 px square, PNG with alpha, named for the `coaster_olive` project key that Book 1
level 1 carries. Metro picks the density from the base name, so all three scales must sit in that
folder together; a missing `@2x` or `@3x` fails `projects.test.js` rather than reaching a phone. The
other fourteen Book 1 illustrations follow the same way in phase 6 — the style sheet (deliverable 1)
is what makes them match.

### The re-cut: two concrete asks

Neither one blocks anything today. Both land as **the same six filenames at the same sizes**, so
nothing in the app changes when they arrive.

**1. The empty state as the line drawing, not the finished piece desaturated.** What was delivered
is `done` with the colour taken out, and it is very faint. Composited on the oat ground and measured
over its own ink it sits **20.8 grey values off the cream on average**, 49.9 at its single darkest
pixel. For scale: 18 is the floor `assertGreyscaleSpread()` enforces for two *yarn colours* being
told apart on a board, so the unfinished coaster is about as separated from its background as two
yarns are from each other — the bottom of the readable range, not the middle. The consequence is
already in the code: the lose screen draws it at **full** opacity and never dims it, because at the
0.55 that "unfinished" suggests it measures about 11.5 off the cream, which is not a fainter picture
but no picture. "Unfinished" has to be carried by the drawing — an outline with the stitches
described and nothing filled — rather than by opacity.

**2. Hard alpha, not a cream wash.** Both states carry a low-alpha cream wash out to their border:
alpha **6 to 16 of 255** in the outer pixels across the two files, and the empty one has no fully
opaque pixel anywhere in it (it tops out at 221). "PNG on transparent" in the delivery table below
means a hard alpha — background actually removed, nothing painted outside the piece. The consequence
is that these two can only be placed on cream: the win and lose screens draw them **inside** the
cream card and never on the dark scrim behind it, because on anything dark that wash shows as a pale
halo the shape of the crop. `docs/design/reference/coaster-cutout-check.png` is the contact sheet
that shows it — four panels, on oat, on dark, on white, and the empty state; the dark panel is the
halo. (That sheet is a QA reference only: it is RGB with no alpha and its labels are baked into the
pixels, so it lives in `docs/design/reference/` and never in the app.) This one matters beyond
level 1: phase 6 puts the finished projects into the Craft Nook and onto Pattern Book pages, and
**those backgrounds will not all be cream**.

One sizing note while the source is open: the win screen caps the illustration at 200 pt, but the
level card gives it whatever height its row has, which on a landscape phone is more than 200 — so
the 600 px `@3x` is being stretched there. The layered vector source this brief already asks for is
what lets a bigger export be made later without redrawing anything.

## Deliverable 5 — audio (16 short cues, still wanted)

Soft and warm, no stings, nothing cartoonish. Level 1 needs the first eight; the rest arrive
with the levels that use them, and are cheaper to make in the same session. Nothing in the app
makes a sound yet.

**Level 1:** match ("thup" of yarn), puff blast (a small poof), fall, stitch (a square
completing), coin, win jingle, lose, tap.
**Soon after:** bobble / popcorn / yarn bomb blasts (each a bigger poof than the last), frog
land (a quiet ribbit), frog rip, hook sweep, bead delivered, scissors snip.

## Deliverable 6 — one rounded font (landed 2026-09-12)

**Fredoka**, in four weights — 400 regular, 500 medium, 600 semibold, 700 bold — loaded at
runtime with `useFonts` from `expo-font`; the faces themselves are the
`@expo-google-fonts/fredoka` exports, and the splash is held until they load or fail. Every
`Text` in the app names a family from `apps/mobile/src/art/type.js` and never a `fontWeight`:
React Native has no synthetic bolding for a custom family, so on Android a bare weight silently
drops back to the system font while iOS looks right. If the style sheet wants a different face
later it is a one-file change, but the four-weight rule comes with it.

---

## How to deliver

| Kind | Format | Sizes |
|---|---|---|
| Board pieces, icons | SVG, one file per asset | square viewBox, no raster, no live text |
| Illustrations, decor | PNG on transparent | 1× / 2× / 3× — 200 / 400 / 600 px on the long edge |
| Screen mockups | PNG or PDF | 2×, landscape |
| Room backgrounds (later) | PNG | 2732 × 2048 |
| Audio | WAV or high-bitrate MP3 | mono is fine; under a second each except the win jingle |

The board set is code now, so the first row covers new or replacement pieces only: draw them on a
100 × 100 viewBox at about 84% fill, matte, lit from the upper left, with the contact shadow inside
the box, and they drop in beside the rest. Keep and hand over the **layered vector sources**
(Illustrator, Figma, whatever the tool is) alongside anything exported — it costs nothing at the
time and it is what lets a piece be resized, retextured or exported to PNG later without redrawing
it.

Sources live in `docs/design/`; production files move into `apps/mobile/src/art/` when the build
picks them up.

## What comes later (so the time can be planned)

**The animated showpieces** — win confetti, the coin burst, sparkles — were deliberately not in
this hand-off. They are commissioned once level 1's static art is in and moving on a phone, so
nothing is animated onto art that might still change. **That condition is met as of 2026-09-13, and
this is the trigger.** The pieces are drawn and moving, Book 1 level 1 is authored and playable end
to end, the level card and the win and lose screens are built, and the coaster is on all three — so
the confetti and the coin burst can be quoted and started now, against art that is in the app rather
than against a description of one. The win screen already has an empty full-screen layer over its
card, taking no touches and no part in the layout, for exactly this. The queued coaster re-cut does
not hold them up: it arrives as the same six filenames at the same sizes. (The frog's idle blink
came early and cheap: it is two drawings swapped on the UI thread, not a Lottie.) They are authored
in After Effects and exported as Lottie; if that is not something you do, say so and it becomes a
separate hire rather than a surprise.

**Not a designer deliverable:** the blast rings, the clear particles, the haptics, the ~5 s idle
hint and honouring Reduce Motion are the step player's own work in code, and are all still to come
in phase 5. Nothing in the app makes a sound yet either — there is no audio file of any kind in the
repo and no audio library installed, which is deliverable 5's side of the same gap.

The rest, listed so the scale is visible: the Craft Nook room background and
about twelve decor items (phase 6), fourteen more Book 1 illustrations (phase 6), three
creatures with two or three poses each plus Skein the Sheep, the guide (phase 6), the economy
and shop UI — stitch marker, hearts, the Continue panel, the Yarn Bank jar, the gift popup
(phase 7), and then rooms 2–3, books 2–3 and their illustrations (phase 8).

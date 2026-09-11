# Art brief for Hooked

What the designer (human or AI) needs to produce the style sheet and the concept art, and
what phase 5 will read from this folder. Read DESIGN.md §12 (mood), §15 (palette), §16
(pipeline) first; this page is the working brief.

## Rules

- Nothing personal ships: no name, no photograph of her, no photograph of her work. The
  photos in `docs/reference/photos/` are references for texture, palette and the shape of each
  project; every shipped image is an illustration.
- Nothing from Fishdom: no fish, no aquarium, no Playrix names, no traced UI. The mechanics are
  a tribute; the look is ours.
- No other people's IP: leave out the plush toys and the tumbler brand visible in the photos.
- Board pieces are code-drawn SVG (§16 source 1). The designer supplies reference sketches
  and the style sheet; the phase 5 session draws the SVG components from them.

## Mood

A yarn shop on a rainy afternoon. Cream background, warm wood, soft shadows, visible stitch
texture, safety-eye dots on the creatures. Nothing glossy, nothing neon.

**Style phrase** (use it verbatim in every prompt so the set matches):
*flat vector illustration of a crocheted [thing], cozy, soft shadows, plain cream background, no text*

## Palette

Six yarn colors plus the cream ground. The keys are fixed in code; the display names are
invented and show only in the Pattern Book. The hexes below are placeholders: sample the final
six from the reference photos and put them on the style sheet.

| Key | Display name | Placeholder hex | Seen in |
|---|---|---|---|
| `olive` | Olive Grove | #7a8450 | tote, coasters |
| `mustard` | Mustard Seed | #d4a73a | blanket, spinner |
| `blush` | Blush Petal | #e3b2ad | blanket, coasters, spinner |
| `rust` | Rust Clay | #b5563a | blanket |
| `lavender` | Lavender Dusk | #9b95c9 | blanket |
| `cocoa` | Cocoa Bean | #5a3e36 | blanket joins |
| (ground) | Oat | #f6efe4 | board and screen background, never a piece |

Each color also gets its own strand pattern so pieces read by shape as well as hue.

## Deliverables, in order

1. **Style sheet** (`docs/design/style-sheet.png` or `.pdf`, one page): the final palette,
   line weight, shadow rule, stitch texture treatment, and three test illustrations made with
   the style phrase (a coaster, a mug cozy, the frog) until they look like one set.
2. **Board reference sketches** (`docs/design/board/`): the six yarn balls with their strand
   patterns; the four special overlays (Puff, Bobble, Popcorn, Yarn Bomb, each visibly "bigger"
   than the last); the frog (meter, idle, hop); the hook; bead; button; tangle at 1, 2 and 3
   layers; knot overlay; moth; unstitched square at 1 and 2 layers; stitched square; the meter
   frame.
3. **Craft Nook** (`docs/design/rooms/nook/`): the room background as a wide landscape scene
   at 2732×2048 with clear placement spots, plus the twelve decor items and the coaster stack,
   dishcloth rail, mug, potholder hook, framed Puff Flower, button jar and yarn basket as
   separate layered PNGs on transparent (`docs/LEVELS-BOOK1.md` lists what goes where).
4. **Creatures** (`docs/design/creatures/`): the cat, the frog and the bee, amigurumi style,
   two or three poses each (blink, sway, hop). Skein the Sheep, the guide: a neutral pose, a
   pointing pose and a gift-giving pose.
5. **Project illustrations** (`docs/design/projects/`): one per Book 1 project, named by the
   level's project id (`coaster_olive`, `coaster_blush`, `coaster_mustard`, `dishcloth`,
   `mug_cozy`, `potholder`, `potholder_rust`, `yarn_basket`, `puff_flower`,
   `dishcloth_chevron`, `button_jar`, `mug_cozy_striped`, `coaster_set_4`, `coaster_set_8`,
   `twelve_coasters`). Each should work both as a finished piece and as a line drawing that
   fills in stitch by stitch.
6. **Economy and UI references** (`docs/design/ui/`): stitch marker icon, coin, hearts, booster
   icons (scissors, lint roller, darning needle, loosen, two bobbles, frog ready, popcorn &
   frog), the Continue panel with its +5 badge, the Yarn Bank jar in fill states, the gift
   popup from Skein.

## Export

PNG on transparent, at 1×/2×/3× (200/400/600 px on the long edge for pieces and decor; room
backgrounds at 2732×2048 only). Illustrations generated on a plain background, background
removed, cropped tight. Expect a few regenerations per image to keep the set matching. Final
production files move into `apps/mobile/src/art/` in phases 5 and 8; this folder keeps the
sources and the sheet.

# How the game works

Yarn Over in plain English, in the order a player meets it, with a note against each rule saying
where it is specified.

**This file is the readable view, not the source of truth.** `docs/DESIGN.md` is the spec; if the
two ever disagree, the spec wins and this file is wrong. It is rewritten at the end of each phase
to match what actually exists.

**Status:** phases 1–3 are built (the engine, the board on the phone, specials and the meter).
Anything marked *not built yet* is described so the shape is clear, but nothing in the app does
it.

---

## The board

A grid of up to 9 by 9 cells holding yarn balls in six colours: olive, mustard, blush, rust,
lavender and cocoa. Cells can be masked off to make shaped boards, so a coaster is round-ish and
a scarf is 5 wide and 9 tall. A level uses five or six of the colours, never all six unless it
means to be hard. (§3, §15)

Fewer colours means more matches. Measured over 2,400 moves on a full board: six colours chain
on a third of moves, five on about half, four on three fifths. Five is the lively default.
(§3, measured 2026-09-11)

**Gravity** pulls everything straight down, and each column refills from the top. A blocker in a
column is a floor: nothing falls through it, and the cells under it stay empty until it is
cleared. (§3)

## A move

Swipe one ball into the one next to it. The swap is legal if it makes a line of three or more, or
if either piece is a special. Anything else snaps back and costs you nothing. (§3)

Every level has a move limit. A legal swap spends one move. Firing a special in place by
double-tapping it also spends one. (§3, §11 phase-3 conventions)

**Matching** is three or more of the same colour in a straight line. An L or a T counts by its
total, so an L of five is a five-match. (§3)

**Cascades:** when balls clear, the ones above fall in and new ones drop from the top, which can
make new matches on their own. Each chain in a row scores more: ×1, then ×2, ×3, up to ×5. (§3)

**No moves left?** The board says "Untangling…" and reshuffles itself, never into an instant
match. A board with a special still on it is never shuffled away, because firing that special is
a move. (§3, §11 phase-3 conventions)

## Specials

Match more than three and you make one. It appears on the ball you swiped, or in the middle of
the line if a cascade made it. (§3, §4)

| On screen | Name | You get it by | It clears |
|---|---|---|---|
| **P** | Puff | matching 4 | a plus: itself and the four cells around it, 5 in all |
| **B** | Bobble | matching 5 | a square around itself, 21 cells |
| **C** | Popcorn | matching 6 | a bigger square, 45 cells |
| **Y** | Yarn Bomb | matching 7 or more | bigger again, 77 cells |
| **F** | Frog | the meter filling | every ball of one colour, anywhere on the board |
| **H** | Hook | the meter filling, on hook levels | 3 whole rows or 3 whole columns |

Those letters are scaffolding. Phase 5 replaces every one of them with real art, and the letter
is only there so you can tell a Popcorn from a Yarn Bomb on a board of plain circles. C is
Popcorn because P was taken. (§11 phase-3 conventions, §16)

**The blast shape** is a square with its four corners rounded off, which is why the counts are 21
and 45 and 77 rather than 25, 49 and 81. A Puff is the exception and is a plus. (§4)

**Blasts are cut off by the edge of the board.** Fired in a corner, a Puff takes 3 instead of 5, a
Bobble 8 instead of 21, a Popcorn 15 instead of 45 and a Yarn Bomb 24 instead of 77. A special is
worth far more in open space. (§4, measured)

**A blast goes over holes**, not into them: the hole is skipped and the cells past it still go. A
bead is never destroyed by anything. (§4, §6)

## Firing a special

Four ways, all of them worth knowing:

- **Swap it** with anything next to it. It goes off instead of moving.
- **Double-tap it** where it stands.
- **Hit it with another blast.** Specials chain: a Puff that catches a Bobble that catches the
  Frog all go off in one wave, one after another.
- **Match it** like an ordinary ball. It fires and the match still makes whatever it was going to
  make.

(§4)

## Combos

Swap two specials into each other and you get one bigger thing, not two:

- **Two blasts** make one blast a size larger than the bigger of them. Anything past a Yarn Bomb
  takes the whole board.
- **Hook and Hook** sweeps three rows and three columns at once.
- **Hook and a blast** fires both from the same cell.
- **Frog and Frog** rips out the two commonest colours.
- **Frog and anything else** fires that thing and rips out a colour as well.

(§4)

## The Frog and the meter

Under the board is a meter with ten notches. Every special that goes off fills it: a Puff by 1, a
Bobble by 2, a Popcorn by 3, a Yarn Bomb by 4, and 2 more when several go off together. At ten,
the Frog drops onto the board and the meter empties. (§4)

The Frog is not a ball and has no colour of its own. Swap it with a ball and it rips out every
ball of **that ball's** colour, wherever they are. Fire it with no partner, by double-tapping it
or catching it in a blast, and it takes whichever colour there is most of. (§4)

The Frog's own rip charges nothing, and neither does the Hook. The meter starts empty every
attempt. (§4)

**Hook levels** swap the Frog meter for the Hook meter. The Hook rides an ordinary ball and
ignores colour completely: it clears whole lines. Swipe it sideways and it sweeps three rows,
swipe it up or down and it sweeps three columns, and double-tapping it sweeps rows. (§4)

Right now the meter is a row of pips under the board. The real thing is a round dial beside the
board, and it arrives with the rest of the interface. (§11 phase-3 conventions)

## Score

A cleared ball is 20, multiplied by the cascade you are on. Making a special pays a flat bonus:
60 for a Puff, 120 a Bobble, 250 a Popcorn, 500 a Yarn Bomb. A Frog rip pays a flat 500 on top of
the balls it took. Later: 1,000 for stitching a square, 200 a blocker layer, 2,000 a delivered
bead. (§7)

---

## Not built yet

Everything above is playable today. These are specified and waiting their turn.

**Goals** (phase 4). A level is a crochet project and its goals are what the project needs:
stitch the squares of the pattern by clearing the pieces on them, collect so many balls of a
colour, drop beads to the bottom, clear every tangle, or dig out buried buttons. Levels mix them.
(§6)

**Blockers** (phase 4). Tangles fill a cell in one to three layers and lose one to each match or
blast that touches them. Knots tie a ball in place so it cannot be swapped, though it still
matches where it sits. Moths fill a cell and spread to a neighbour at the end of any move where
none was cleared. (§5)

**Winning and losing** (phase 4). Finish the goals and the level pays out Fastened off!, turning
each unused move into a special that fires. Run out of moves first and you are offered five more
for stitch markers, or you lose a life. (§6, §8)

**The room** (phase 6). Every finished project decorates the Craft Nook, which is what the coins
are for.

**Lives, boosters, the shop, purchases** (phases 6–7).

---

## Trying it on the phone

`npm run mobile`, scan the QR in Expo Go. Home has two Play buttons: the first is a frog-meter
board, the second a hook board. Both are development boards with specials already sitting in the
corners so everything is reachable in the first few moves, which is not how a real level starts.

Work down this list:

1. Make a 4-match in open board. A **P** appears where you swiped.
2. Swipe that P sideways. It fires rather than moving, and spends a move.
3. Make another and double-tap it instead. Same blast, same cost.
4. Make a 5-match and fire the **B** away from the edges. Roughly 21 cells go.
5. Fire one in a corner and watch it clipped to about 8. That is correct.
6. Set a blast off so it covers another special. They chain.
7. Swap two specials together. One bigger blast, not two.
8. Watch the pips fill as things fire, and keep going until the **F** drops.
9. Swap the F with a ball. Every ball of that colour goes.
10. Double-tap another F on its own. It takes the commonest colour instead.
11. On the hook board, swipe the **H** sideways, then make another and swipe it up or down.
12. While a long chain is playing, swipe on a quiet corner. It should land as the board settles.

`npm run play -- packages/engine/fixtures/specials-holes.json --seed 3` plays the same rules in
the terminal as text, which is often the quickest way to see what the engine thinks happened.

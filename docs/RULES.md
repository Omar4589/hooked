# How the game works

Yarn Over in plain English, in the order a player meets it, with a note against each rule saying
where it is specified.

**This file is the readable view, not the source of truth.** `docs/DESIGN.md` is the spec; if the
two ever disagree, the spec wins and this file is wrong. It is rewritten at the end of each phase
to match what actually exists.

**Status:** phases 1–4 are built (the engine, the board on the phone, specials and the meter, and
now the level rules: goals, blockers, beads, winning and losing). Anything marked *not built yet*
is described so the shape is clear, but nothing in the app does it.

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
if either piece is a special. Anything else snaps back and costs you nothing. A knot, a tangle
and a moth cannot be picked up at all, so swiping from one does nothing. (§3, §5)

Every level has a move limit, and the counter drops the moment the swipe is taken. Firing a
special in place by double-tapping it also spends one. (§3, §11 conventions)

**Matching** is three or more of the same colour in a straight line. An L or a T counts by its
total, so an L of five is a five-match. (§3)

**Cascades:** when balls clear, the ones above fall in and new ones drop from the top, which can
make new matches on their own. Each chain in a row scores more: ×1, then ×2, ×3, up to ×5. (§3)

**No moves left?** The board says "Untangling…" and reshuffles itself, never into an instant
match. A board with a special still on it is never shuffled away, because firing that special is
a move. If no arrangement of what is left is playable — moths have eaten most of the board, say —
the level simply ends. (§3, §11 conventions)

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
Popcorn because P was taken. (§11 conventions, §16)

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
board, and it arrives with the rest of the interface. (§11 conventions)

## What a level asks for

The goals panel sits to the left of the board: the level's name at the top, what it still needs
in the middle, the moves left at the bottom. Levels mix goals. (§6, §11)

| Goal | What you do | How it counts |
|---|---|---|
| **Stitch** | clear the piece standing on a marked square and the square is stitched | some squares take two |
| **Collect** | clear so many balls of one colour | cascades and blasts count too |
| **Beads** | get the beads to the bottom row | they can be swapped but never matched, and nothing destroys them |
| **Clear** | get rid of every tangle, knot or moth | what is left is counted off the board itself |
| **Buried** | dig out the buttons hidden under two-layer tangles | the button comes out with the last layer |

Stitch and Clear count what is on the board, so a moth that spreads puts a Clear goal **back up**.
The others count events and never go below zero. (§6, §11 conventions)

## Blockers

| On screen | What it is | How it goes |
|---|---|---|
| A rounded square with a number | **Tangle**, 1 to 3 layers; nothing falls through it | one layer per match that touches it, and one per blast whose area covers or touches it |
| A ball with a thick ring and a knob | **Knot**: a ball tied in place that cannot be swapped, but still matches where it sits | clear it in a match or a blast, like any ball |
| A cocoa diamond marked M | **Moth**: fills a cell | any match or blast that touches it |

A match that lies along two sides of a tangle still strips one layer; two separate matches strip
two. A frog rip is not a blast and damages neither tangles nor moths. (§5, decided 2026-09-10)

**Moths multiply.** At the end of any move where you did not clear a moth, one moth eats a plain
ball beside it and a new moth grows there — the old one stays. Specials, knots, beads and the
frog are safe from them. Clear them faster than they breed. (§5, decided 2026-09-11)

## Beads

A bead is a cream diamond. It falls like a ball, can be swapped like a ball, never matches, and
nothing destroys it. It leaves through an exit — the bottom open cell of each column unless the
level says otherwise — and one leaves as soon as it lands on one. A bead resting on a tangle or a
knot waits there until that blocker goes. On levels with a schedule, a new bead drops from the
top every few moves until the level's total has been delivered. (§6, decided 2026-09-10)

## Winning and losing

Finish every goal and the level pays out: each move you did not use turns into a Puff or a
Bobble, they all go off one after another and chain into each other, and you get **20 coins a
move** on top of the level's own coins. Banner: *Fastened off!* (§6, §7)

Run out of moves first and it says *Ran out of yarn.* Either way you can try again on a fresh
board or go home. The offer of five more moves for stitch markers comes with lives and the shop
in phase 6. (§6, §8)

## Score

A cleared ball is 20, multiplied by the cascade you are on. Making a special pays a flat bonus:
60 for a Puff, 120 a Bobble, 250 a Popcorn, 500 a Yarn Bomb. A Frog rip pays a flat 500 on top of
the balls it took. Stitching a square is 1,000, a blocker layer 200, a delivered bead 2,000. The
Yarn Over bonus pays coins, not score. (§7)

---

## Not built yet

Everything above is playable today. These are specified and waiting their turn.

**Real art** (phase 5). Every circle, letter and outline on the board is a placeholder: the yarn
balls, the special overlays, the frog, the bead, the tangle, the moth, the stitched tile and the
meter dial are all drawn in phase 5, along with the level card, the win screen's project
illustration, sounds and haptics.

**The room** (phase 6). Every finished project decorates the Craft Nook, which is what the coins
are for. Book 1's fifteen levels are authored then too, and the shipped level list is empty until
they exist — the boards on Home today are development boards.

**Lives, the Continue prompt, boosters, the shop, purchases** (phases 6–7).

---

## Trying it on the phone

`npm run mobile`, scan the QR in Expo Go. Home lists five development boards: the two sandboxes
from phase 3 (a frog-meter board and a hook board, with specials already in the corners) and the
three test levels below. Sandboxes have no goals and 999 moves, so they can only be played, not
won.

**Ring coaster** — the stitch level:

1. The pattern is drawn under the balls as outlined squares. Clear a ball standing on one and
   the square fills in olive.
2. The centre square has two layers: it takes two clears, and the outline thins after the first.
3. The goals panel counts the squares down as you go, and the move counter drops the instant you
   swipe, not when the board settles.
4. Win it. The moves you have left turn into P and B balls all over the board, they go off one
   after another, and *Fastened off!* shows the score and the coins (100 plus 20 a move).
5. Retry deals a fresh board of the same level; Home goes back with nothing left underneath.
6. Play another and waste the moves instead: *Ran out of yarn.*, with the same two buttons.

**Charm tail** — collect and beads:

7. The bead is a cream diamond in the middle. Swipe it sideways: it moves like a ball but never
   makes a match.
8. Get it to the bottom row and it drops off the edge; the beads goal ticks down.
9. On moves 4 and 8 a new bead falls in from the top, from a random column.
10. The rust count only moves when rust balls clear — cascades and blasts included.

**Moths in the stash** — blockers:

11. A match beside a tangle nudges it and its number drops. Two matches in one move take two
    layers.
12. The two tangles marked with a button release it when the last layer goes, and the buried
    count drops.
13. Touch a moth with a match or a blast and it goes. Make a move that clears none, and a second
    moth appears beside one of them, eating the ball that was there.
14. The moth goal can go **up**. That is the level, not a bug: clear them faster than they spread.

Throughout: the console never warns about drift or `buildMove`, and a swipe on a quiet corner
during a long chain still lands when the board settles.

`npm run play -- packages/levels/levels/dev/moths-7x7.json --seed 2` plays the same rules in the
terminal as text, which is often the quickest way to see what the engine thinks happened; it
prints the goals and the coins after every move.

# How the game works

Yarn Over in plain English, in the order a player meets it, with a note against each rule saying
where it is specified.

**This file is the readable view, not the source of truth.** `docs/DESIGN.md` is the spec; if the
two ever disagree, the spec wins and this file is wrong. It is rewritten at the end of each phase
to match what actually exists.

**Status:** phases 1–4 are built (the engine, the board on the phone, specials and the meter, and
the level rules: goals, blockers, beads, winning and losing), and phase 5 has drawn the board —
the yarn, the specials, the blockers, the meter's dial and the game's own font. Since 2026-09-13
there is a real level to draw it on: Book 1 level 1, "Coaster (olive)", which opens on a level
card and ends by showing you the coaster you made. What is left of phase 5 is what moves and what
makes a noise — the blast rings, the clear particles, the confetti and the coin pile, sounds and
haptics — plus the idle nudge and the Reduce Motion feature. Anything marked *not built yet* is
described so the shape is clear, but nothing in the app does it.

---

## Opening a level

Tap a level and its card comes up before the board does: *Level 1* and the project's name, what
the level asks for — each goal with its own icon and its number — how many moves you get to do it
in, three empty booster slots captioned *Unlocked at level 8*, and **Play**. Beside all that is
the thing you are making, drawn pale and unfinished — level 1's coaster is the only project drawn
so far, and a level without one shows the card with nothing on that side. **Back**, top left, goes
home. (§11)

Play is dim for a moment and then brightens. That is the board putting itself together behind the
card, and it is the reason the card exists: a full 9 by 9 board takes 1.8 seconds to open on the
cheapest phone this game is measured against, so the card is drawn first and the board is only
built once there is something to look at. It is a cover over a wait, not a loading screen. Press
Play and the card fades out onto the board. Back is live from the first frame either way, so a
level opened by mistake never holds you there. (§11, §16, decided 2026-09-13)

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
| A cream puff sitting on the ball | **Puff** | matching 4 | a plus: itself and the four cells around it, 5 in all |
| A bigger, rounder puff | **Bobble** | matching 5 | a square around itself, 21 cells |
| Three puffs in a cluster | **Popcorn** | matching 6 | a bigger square, 45 cells |
| The ball itself, dark and wound in five clashing strands, with a lit fuse | **Yarn Bomb** | matching 7 or more | bigger again, 77 cells |
| A little green crocheted frog, eye bumps on top | **Frog** | the meter filling | every ball of one colour, anywhere on the board |
| A wooden crochet hook lying across the ball | **Hook** | the meter filling, on hook levels | 3 whole rows or 3 whole columns |

The first four sort by size on sight — one bump, a bigger bump, a cluster, then a whole ball
wrapped in the lot — which is how you tell at a glance how much a swap is about to take. The Yarn
Bomb is the one exception to "a special rides on a ball": it **replaces** the ball rather than
sitting on it, so you cannot see what colour it is underneath. That is the owner's call, not an
oversight. It fires the same four ways as any other special, and underneath it is still a ball of
some colour: it matches as that colour, clearing it counts towards a collect goal for it, and it
counts in the tally that decides which colour a lone Frog rips. You just cannot see which one it
is. (§12, decided 2026-09-12)

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

Beside the board is a meter with ten notches. Every special that goes off fills it: a Puff by 1, a
Bobble by 2, a Popcorn by 3, a Yarn Bomb by 4, and 2 more when several go off together. At ten,
the Frog hops out onto the board and the meter empties. (§4)

The Frog is not a ball and has no colour of its own. Swap it with a ball and it rips out every
ball of **that ball's** colour, wherever they are. Fire it with no partner, by double-tapping it
or catching it in a blast, and it takes whichever colour there is most of. (§4)

The Frog's own rip charges nothing, and neither does the Hook. The meter starts empty every
attempt. (§4)

**Hook levels** swap the Frog meter for the Hook meter. The Hook rides an ordinary ball and
ignores colour completely: it clears whole lines. Swipe it sideways and it sweeps three rows,
swipe it up or down and it sweeps three columns, and double-tapping it sweeps rows. (§4)

The meter is a round dial, hanging under the goals panel on the left of the board with the frog —
or the hook — sitting in the middle of it. An olive ring fills round him a notch at a time as
specials go off, and empties when he hops out. The frog blinks while he waits, and wiggles while
the ring reads full. The dial is drawn as big as the column can spare, so a level with four goals
gets a smaller dial rather than a move counter shoved off the bottom of the screen. (§11, §16)

## What a level asks for

The goals panel sits to the left of the board: the level's name at the top, what it still needs
in the middle — each goal with its own little icon — the moves left at the bottom, and the meter's
dial under all of it. Levels mix goals. (§6, §11)

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
| A square packed with looping strands, more of them and darker the more layers are left | **Tangle**, 1 to 3 layers; nothing falls through it | one layer per match that touches it, and one per blast whose area covers or touches it |
| A ball with a cord tied across the bottom of it, knotted in the middle, two cut ends sticking up | **Knot**: a ball tied in place that cannot be swapped, but still matches where it sits | clear it in a match or a blast, like any ball |
| A dusty-lavender moth, wings out, filling the cell | **Moth**: fills a cell | any match or blast that touches it |

Nothing on the board carries a number. A tangle's layers are how thick it is drawn — five loops
and pale at one layer, nine and darker at two, fourteen and darkest at three — and it thins as
they come off. The knot is tied low on its ball on purpose, so a ball that is both knotted and a
special shows both. (§5, decided 2026-09-12)

A match that lies along two sides of a tangle still strips one layer; two separate matches strip
two. A frog rip is not a blast and damages neither tangles nor moths. (§5, decided 2026-09-10)

**Moths multiply.** At the end of any move where you did not clear a moth, one moth eats a plain
ball beside it and a new moth grows there — the old one stays. Specials, knots, beads and the
frog are safe from them. Clear them faster than they breed. (§5, decided 2026-09-11)

## Beads

A bead is a small pearl with a hole through the middle — pale blue-grey, smaller than a ball and
shaded differently, so it never reads as one. It falls like a ball, can be swapped like a ball,
never matches, and nothing destroys it. It leaves through an exit — the bottom open cell of each
column unless the level says otherwise — and one leaves as soon as it lands on one. A bead resting
on a tangle or a knot waits there until that blocker goes. On levels with a schedule, a new bead
drops from the top every few moves until the level's total has been delivered.
(§6, decided 2026-09-10)

## Winning and losing

Finish every goal and the level pays out: each move you did not use turns into a Puff or a
Bobble, they all go off one after another and chain into each other, and you get **20 coins a
move** on top of the level's own coins. Banner: *Fastened off!* (§6, §7)

Run out of moves first and it says *Ran out of yarn.* Either way you can try again on a fresh
board or go home. The offer of five more moves for stitch markers comes with lives and the shop
in phase 6. (§6, §8)

**The end screen shows the project.** Win and the finished coaster fades in beside the score and
the coins; lose and the same drawing is there unfinished — the pale one from the level card —
beside *The goals were not finished in time.* The level's name sits under the banner either way.
Level 1 is the only project drawn so far, so every other board ends on its numbers and no
picture at all. (§12, decided 2026-09-13)

## Score

A cleared ball is 20, multiplied by the cascade you are on. Making a special pays a flat bonus:
60 for a Puff, 120 a Bobble, 250 a Popcorn, 500 a Yarn Bomb. A Frog rip pays a flat 500 on top of
the balls it took. Stitching a square is 1,000, a blocker layer 200, a delivered bead 2,000. The
Yarn Over bonus pays coins, not score. (§7)

---

## Not built yet

Everything above is playable today. These are specified and waiting their turn.

**The effects** (the tail of phase 5). The board itself is drawn — the yarn balls, the four
specials, the frog, the hook, the bead, the button, the three tangles, the knot, the moth, the
stitch squares and the meter dial — and so is level 1's coaster, pale on the level card and
finished on the win screen. What is missing is everything that moves or makes a sound: the drawn
ring a blast throws out, the yarn-fluff particles a cleared ball leaves, the confetti and the coin
pile at the end, the sounds and the haptics. There is no audio in the app at all — not a file, and
not the library that would play one. The confetti and the coin burst were always going to be
commissioned once level 1's still art was in and moving on a phone, which is where it now is.
(§12, §16, QUESTIONS item 37)

**The nudge and Reduce Motion** (also phase 5). The board does not point at a move when you sit
still for five seconds, and Reduce Motion is only half honoured. The game does at least play
properly with the setting on — it did not until 2026-09-13, when every move snapped to its
finish — and today the setting stops the frog's wiggle and makes the two fades instant, the card
leaving and the finished piece arriving. Suppressing the overshoot, the shake and, when they
exist, the particles is still to do. (§3, §11 conventions)

**The room** (phase 6). Every finished project decorates the Craft Nook, which is what the coins
are for. The win screen says nothing about it, on purpose: the room does not exist yet, and a win
screen that promises a shelf you cannot visit is worse than one that just says what the level
paid. Book 1's other fourteen levels are written then too — today the shipped list is level 1 on
its own, and everything else Home offers is a development board. (decided 2026-09-13)

**Lives, the Continue prompt, boosters, the shop, purchases** (phases 6–7).

---

## Trying it on the phone

`npm run mobile`, scan the QR in Expo Go. Home lists **Coaster (olive)** — Book 1 level 1, the
one level that ships — and then, in development only, the five development boards: the two
sandboxes from phase 3 (a frog-meter board with the four blast specials in its corners, and a
hook board with a hook in the middle) and the three test levels below. Sandboxes have no goals
and 999 moves, so they can only be played, not won. Every one of them opens on its level card.

**Coaster (olive)** — the level a player is actually given:

1. Tap it. The card: *Level 1*, *Coaster (olive)*, one goal — the stitch icon and **21** — *20
   moves*, three empty booster slots under *Unlocked at level 8*, and the coaster itself on the
   right, pale and unfinished. Play brightens as soon as the board is ready behind it, which on a
   5 by 5 was about a fifth of a second on the owner's phone.
2. Press Play. The card fades and leaves a round-ish 5 by 5: the four corners masked off, 21
   cells, and every one of them a dashed stitch square — on this level the whole coaster is the
   goal.
3. The panel on the left has the level's name, the stitch goal counting down from 21, and the
   moves counting down from 20. Nothing hangs under it: level 1 runs no meter, so there is no
   frog on this level and no dial to draw.
4. Stitch all 21 before the moves run out. The moves you have left turn into Puffs and Bobbles,
   they go off one after another, and *Fastened off!* names the level, fades the finished coaster
   in, and shows the score and the coins (100 plus 20 a move).
5. Retry deals a fresh board of the same level and plays the card again, which is the point of
   it: the most-pressed button in a match-3 would otherwise land straight on an uncovered mount.
   Home goes back with nothing left underneath.
6. Waste the moves instead: *Ran out of yarn.*, the same coaster still pale and unfinished, and
   the same two buttons.

**Ring coaster** — the stitch level on a bigger board, with a two-layer square:

7. The pattern is drawn under the balls as squares with a dashed outline. Clear a ball standing
   on one and the square fills in with rows of little stitches.
8. The centre square has two layers: it takes two clears, and it starts with a heavier dash and a
   cross through it. The cross goes with the first clear and the outline thins.
9. The goals panel counts the squares down as you go, and the move counter drops the instant you
   swipe, not when the board settles. It ends the way level 1 does but with nothing to show for
   it: this board's project has no illustration, so the end screen is the name and the numbers.

**Charm tail** — collect and beads:

10. The bead is the pearl in the middle. Swipe it sideways: it moves like a ball but never makes
    a match.
11. Get it to the bottom row and it drops off the edge; the beads goal ticks down.
12. On moves 4 and 8 a new bead falls in from the top, from a random column.
13. The rust count only moves when rust balls clear — cascades and blasts included.

**Moths in the stash** — blockers:

14. A match beside a tangle nudges it and a layer comes off — the two plain ones have one layer
    to give, the two carrying buttons have two. Two matches in one move take two layers.
15. The two tangles with a button showing in the corner release it when the last layer goes, and
    the buried count drops.
16. Touch a moth with a match or a blast and it goes. Make a move that clears none, and a second
    moth appears beside one of them, eating the ball that was there.
17. The moth goal can go **up**. That is the level, not a bug: clear them faster than they spread.

Two of the drawings still cannot be reached on a phone: nothing you can open has a three-layer
tangle or a knot on it — level 1 has neither, and no development board does — so those two wait
for Book 1's later levels in phase 6.

Throughout: the console never warns about drift or `buildMove`, and a swipe on a quiet corner
during a long chain still lands when the board settles. In development every level also prints
`[card] board mount at …` and `[card] board ready at … ms — … ms under the card`; that last
number is the stall the card is covering, and it ran 172–298 ms across all six boards on the
owner's iPhone (2026-09-13). The 1.8 seconds the card was built for is a release build on the
cheapest Android the game is measured against, and it has not been re-measured with the card in
front of it.

`npm run play -- packages/levels/levels/dev/moths-7x7.json --seed 2` plays the same rules in the
terminal as text, which is often the quickest way to see what the engine thinks happened; it
prints the goals and the coins after every move.

# Game concept v0 · card-deployment lane battler (working title: none yet)

Owner: Murshidi. Written 12 Nov 2026 (Asia/Kuala_Lumpur). Status: decisions DEC-001 to DEC-005
recorded; PLAN-001 **proposed, not approved**.
Background: `../research/research-report.md`. Layout picture: `layout-mockup.png`.
Revision 2 (12 Nov 2026): longer, winding middle lane; abilities fire automatically; new repo.

## Decisions so far (owner's words)
| Topic | Decision |
|---|---|
| Screen | "portrait" |
| Heroes | "special carrds, with players having the option to instruct the heroes to gank/defend basically strategising like in dota" |
| Name | "no name yet" |
| Middle lane | "edit so that the mid lane is different, like make the middle lane longer but still simmetrical" |
| Where the game lives | "yes new repo" |
| Hero abilities | "fire automatically" |

## The game in one paragraph
A one-on-one real-time battle on a portrait phone screen. Three lanes run from your base at the
bottom to the enemy base at the top, with jungle strips between them. You spend one refilling
resource (placeholder name "mana") to drop units and spells into lanes, Clash Royale style. Some
cards are **heroes**: once played, a hero stays on the map for the whole match, levels up, comes
back after dying, and follows **orders** you give it (push, defend, gank, farm, retreat). Cards
are the tactics; hero orders are the Dota-style strategy. A match lasts about 5 minutes.

## Rules for the first prototype (all numbers are starting values to tune)
**Map.** 3 lanes. Each side has 1 tower per lane plus a Core behind them. Two jungle strips, each
with one neutral camp on the river. Destroying an enemy tower moves your drop zone forward in that
lane. Towers take 50% less damage for the first 60 s, so nobody can rush.

**The middle lane is different.**
- **Shape.** The two side lanes run straight and curve in to the Core at the end. The middle lane
  snakes, bending into the jungle once on each side of the river.
- **Symmetry.** Turn the map upside down and it is identical, so both players get the same map.
- **Length.** From the river to its tower, the middle lane is about **36% longer** than a side lane
  (255 vs 187 units, measured on the mockup).
- **Effect.** Pushes in the middle are slower, which gives the defender more time.
- **Trade-off.** The middle tower sits right in front of the Core, so breaking it is the most
  decisive. A side tower falls sooner, but the Core is still a walk around the corner.
- **Ganks.** The middle lane's bends pass close to both jungles, so a hero there can gank either
  side quickly.
- **Tuning.** The exact shape and length are tuning values.

**Mana.** Start 5, max 10, +1 every 2.8 s; double speed in the last minute.

**Cards.** One fixed deck of 8 (6 regular + 2 heroes); 4 in hand, next card shown. Drag a card into
a lane: it snaps to the lane's centre and you choose how far forward (your half only, or further
once that lane's enemy tower is down). Spells can be dropped anywhere. No flying units yet.

**Minion waves.** Every 20 s each side sends 3 minions down every lane, so lanes keep fighting even
when you ignore them. They give heroes XP.

**Heroes.**
- Played like any card (cost 5). Afterwards the hero leaves your card cycle and appears in the hero bar.
- Fights on its own (moves, targets, uses its ability automatically).
- Levels 1–4 from XP gained when nearby enemies die and when it clears a camp. Each level adds
  health and damage.
- When killed: comes back at your Core after 10 s + 5 s per level, then walks back to its last order.
- Two starting heroes: **Ranger** (fast, ranged, strong first hit, which makes it a good ganker) and
  **Warden** (tough, slows enemies near it, a good defender). Placeholder names and art.

**Orders.** Drag a hero's portrait onto the map. Targets snap to a few clear spots, which glow while
you drag. An order stays until you change it. If you never give one, the hero pushes the lane you
played it in, so orders are optional depth, not a chore.

| Order | Drag onto | What the hero does |
|---|---|---|
| Push | the enemy half of a lane | walks up that lane, fights, hits towers |
| Defend | one of your towers | stays within that tower's range and fights whatever comes in |
| Gank | a different lane | travels through the jungle, hidden from the enemy; the first hit after arriving is stronger; then pushes that lane |
| Farm | a camp ✦ | clears the camp (mana + XP), then goes back to its previous order |
| Retreat | your Core | walks home and heals quickly there |

Orders cost nothing. The price is **travel time**: a hero that leaves a lane leaves it weaker, just
like rotating in a MOBA.

**Hidden in the jungle.** An enemy hero in the jungle is shown only as a faint "?" unless one of your
units is close. That is what makes a gank a real surprise and makes defending a judgement call.

**Winning.** Destroy the enemy Core. If time runs out, more towers destroyed wins. If that is level,
1 minute of sudden death (next tower wins), then a draw.

**Opponent.** A rule-based bot. It defends the lane under most pressure, plays cards when it has mana,
and orders its heroes to gank where it is already ahead.

## Why this shape (from the research)
- **No hero to steer by hand.** Star Wars: Force Arena failed partly because steering a hero
  while deploying cards felt like two games at once. Orders are occasional, and the hero plays itself
  in between.
- **Three lanes kept readable.** Lanes snap cards, minion waves fight on their own, and the prototype has a
  **2-lane / 3-lane switch** so we can test whether three is too many on a phone. No real-time
  three-lane card game has succeeded yet, so this is the main thing to prove.
- **One resource, ~5-minute match, no shop.** Extra economies and long matches were common to the
  failed attempts (Artifact, Castle Burn).
- **Hiding in the jungle and travel time** are what make Dota-style ganks and rotations matter.

## Proposed first build: PLAN-001 "Grey-box prototype vs bot"
**Goal.** Answer two questions on a real phone: *can I follow three lanes?* and *are hero orders
fun on top of cards?*

**In scope.** A web game that opens from a link on your phone in portrait:
- the map (with the long, winding middle lane), rules, deck and two heroes described above, with simple shapes for art
- the five hero orders, plus hiding in the jungle; hero abilities fire automatically
- the bot opponent
- a 2-lane / 3-lane switch for testing (2 lanes = the two side lanes only) and a speed setting
- a result screen with a rematch button

The game rules sit in their own module with no graphics code. They use whole-number maths only,
so online play can be added later without rewriting them.

**Not in scope.** Online play, accounts, saving progress, deck building, card collection, shop,
real art, sound, the big river boss, different rewards per lane.

**Acceptance tests.**
| # | Test | How it is checked |
|---|---|---|
| T1 | A full match can be played from a link on a phone in portrait | Automated phone-size browser run + owner on own phone |
| T2 | Same starting seed + same moves → exactly the same result | Automated test runs a match twice and compares |
| T3 | Each of the five orders makes the hero do the right thing | Automated scenario tests |
| T4 | Bot-vs-bot: 100 matches finish with no errors | Automated |
| T5 | The 2-lane / 3-lane switch works | Automated + owner |
| T6 | Owner's verdict: readable? fun? which lane count? | Owner plays 5+ matches and notes what they saw |

**Tools.** TypeScript, Vite (build tool) and Vitest (tests), drawn with the browser's built-in canvas.
That means no game engine yet: it's one less dependency, and the rules module can move to Phaser,
PixiJS or another engine later if needed.

**Cost.** RM0. The repo can stay private. GitHub Pages only hosts private repos on a paid plan, so
for now the preview is a private web link you open on your phone. Permanent hosting is chosen later.

**Where.** A new repository made from the app-kit template. The research and this concept move into it.

**Risks.** Grey shapes may undersell the fun. The browser may run slowly on a cheap Android phone
(check early). Hero orders may still feel like too much while also playing cards; T6 is there to
catch that.

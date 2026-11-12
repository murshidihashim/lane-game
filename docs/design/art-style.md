# Art style · "Hikayat" v2

Decisions: DEC-010 (the style), DEC-013 (characters, ultimate effects, tower health). Plans: PLAN-003,
PLAN-004. Code: `src/ui/art.ts` (palette, glyphs, forts, painted map), `src/ui/figures.ts` (characters),
`src/ui/ultfx.ts` (ultimate effects), `src/ui/render.ts` (board, fog, HUD), `index.html` (menus).

## The idea in one line

A hand-painted folk-tale **board game** seen from above: a rainforest board with laterite-clay
roads and a river, wooden pieces outlined in ink, timber forts, and parchment cards with songket
gold trim. It reads like a game laid out on a table in a kampung house.

## Why this look

- **Readable on a small phone.** Flat tokens with one bold symbol each read better at 30 px than
  small detailed figures. Team colour fills the token; the symbol says what it is.
- **Original and our own.** It draws on Malay-world crafts (songket weaving, batik colours, kubu
  forts, the Pusaka heirloom), not on any other game's look.
- **Cheap to build and change.** Everything is drawn in code. No image files, no artist needed
  yet, and a later artist can repaint one layer at a time.

## Palette

| Use | Colour | Hex |
|---|---|---|
| Ink (every outline) | near-black brown | `#1d140e` |
| Jungle ground / canopy | deep greens | `#24533a`, `#1f4c33`, `#3f8a52` |
| Lanes (laterite clay) | rust clay | `#a8653d`, light `#c98a57`, dark `#7a4527` |
| River | teal | `#2a8496`, light `#6cc4c9`, banks `#d8b77d` |
| Timber (frame, forts, HUD) | wood browns | `#6b4426`, `#93643b`, `#3f2717` |
| Songket gold (trim, highlights) | gold | `#e0b04a`, dark `#a57a24` |
| Panels and cards | parchment | `#f3e6c4`, `#e2cf9f` |
| Your side | blue | `#2f5fb3` |
| Enemy side | red | `#c0392b` |
| Neutral camps and relics | old gold | `#8a6a2f` |
| Semangat (card energy) | purple beads | `#7b3fb0` |

Order colours (map spots, lines and legend): push orange `#f0932b`, defend blue `#4f8fe0`,
gank red `#e5534b`, farm green `#5fb86b`.

Species colours (pick screen badges): Kampung `#c0843d`, Hutan `#4f8a3b`, Sungai `#2f8fa3`,
Serangga `#b5892a`, Batu `#7d7f86`.

## Rules for every new piece

1. **Characters are standees.** Every hero and troop is a small painted figure on a round base, like
   a board-game piece: ink outline, flat fills, chibi proportions (big head), one signature prop
   (Kail's hook and hat, Hujan's umbrella, Benteng's fort helmet). Each is drawn once per pose and
   cached, so a crowded lane stays smooth on a phone.
2. **Team colour is the base and a sash, never the character's own colours.** The base disc and a
   sash, headband or collar are blue (you) or red (the bot), so a hero keeps its own look on either
   side and the side still reads at a glance. The bottom/top split helps colour-blind players.
3. **Pieces move like pieces.** Four walk frames (leg swing and bob), two attack frames (wind-up,
   strike), facing the way they walk. Fliers hover above their shadow. Heroes are about 34 px tall,
   troops about 21 px (lane-wave troops a little smaller).
4. **Shape says what kind of thing it is.**
   - small figure: a troop; a big figure with a level badge and health bar: a hero
   - hip-roofed timber kubu: a tower, with a big health bar and its number
   - the Pusaka pavilion: the heirloom you protect
5. **The map is painted once.** Ground, river, trees, roads, bridges, camps, cairns and shrines are
   drawn once into a cached picture (MapPainter). Only moving things are redrawn each frame,
   which keeps phones cool.
6. **Text is serif for names and titles, sans for numbers and help.** Georgia (or the phone's
   serif) for names; the system font for numbers.
7. **Gold means "you can act here".** Glowing gold rings mark order spots, a ULT button at its best
   moment, a Shop with something affordable, and relics.
8. **The fog of war is night over the jungle.** Everything outside your vision is dimmed with a dark
   violet-brown wash with soft edges; enemies there are not drawn. Towers, the Pusaka and their
   health stay readable above it. A lost enemy hero leaves a fading "?" where it was last seen.
9. **Ultimates are big moments.** Each one shows a banner across the top of the board (portrait,
   "ULTIMATE", hero and ultimate name; blue and gold for yours, red for the bot's) and its own
   effect on the map: water rings for Kail, a golden dome for Benteng, a dusk moon for Senja, a
   frost ring for Embun, and so on. Lasting ultimates keep an aura on the hero (Gergasi's rage,
   Helang's feathers, Buaya's scales, Ombak's spray, Seri's veil).
10. **No borrowed looks.** No shapes, icons, frames or colours copied from other games.

## Map symbols

| Thing | Symbol |
|---|---|
| Fruit grove, beast den, Gajah Mina | fruit, paw, trunk (in a ringed disc) |
| Ward cairn, ward | stone cairn; a lantern on a pole in team colour |
| Relic | a glowing gem (purple Semangat, green XP, gold boost) |
| Order spots | ↑ push, ⤳ gank, ⛨ defend, ✦ farm, ◉ ward, ◆ relic, ⌂ retreat; a gold flag for Move |
| Items | small drawings: keris, chain vest, winged sandal, amulet, tonic bottle, rattan shield, bangles, oil lamp |

## What is not done yet

- No sound or music.
- Characters are code-drawn and small; a real artist pass (painted heroes, textured board) is a
  later, separate plan with its own cost.
- Death and spawn animations are simple puffs.

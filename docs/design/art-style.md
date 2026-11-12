# Art style · "Hikayat" v1

Decision: DEC-010. Plan: PLAN-003. Code: `src/ui/art.ts` (palette, glyphs, tokens, forts, painted map),
`src/ui/render.ts` (board, HUD, cards), `index.html` (menus).

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

1. **Ink outline, flat fill, one symbol.** Every token gets a 1.5–2 px ink outline, a team-colour
   fill and one white glyph. No gradients on tokens.
2. **Team colour is the fill, never the symbol.** Blue or red is always the largest area so sides
   read at a glance; red-green colour blindness is helped by the bottom/top split and the outline.
3. **Shape says what kind of thing it is.**
   - round token: a troop
   - big round token with a gold ring and a level badge: a hero
   - square token: a building-hitter (Kerbau, Kerikil)
   - token with a soft shadow below it: a flier
   - small token with no rim: a lane-wave troop
   - hip-roofed timber kubu: a tower
   - the Pusaka pavilion: the heirloom you protect
4. **The map is painted once.** Ground, river, trees, roads, bridges, camps, cairns and shrines are
   drawn once into a cached picture (MapPainter). Only moving things are redrawn each frame,
   which keeps phones cool.
5. **Text is serif for names and titles, sans for numbers and help.** Georgia (or the phone's
   serif) for names; the system font for numbers.
6. **Gold means "you can act here".** Glowing gold rings mark order spots, ready ultimates,
   affordable cards and relics.
7. **No borrowed looks.** No shapes, icons, frames or colours copied from other games.

## Glyph list

| Thing | Glyph |
|---|---|
| Kampung: Silat Guard, Pemanah, Perisai, Kerbau | spear, bow, shield, horns |
| Hutan: Kera, Harimau Bintang, Enggang, Seladang | monkey, paw, beak, gaur |
| Sungai: Ketam, Ikan Sumpit, Belut | claw, fish, bolt |
| Serangga: Kerengga, Tebuan, Kumbang, Ratu Sarang | ant, bee, beetle, crown |
| Batu: Kerikil, Batu Besar, Lontar | pebble, boulder, sling |
| Spells: Petir, Gotong-royong, Auman, Arus, Sengat, Gempa | bolt, heart, roar, wave, sting, crack |
| Summons: puppet, decoy, watchtower, Gajah Mina | mask, dot, hut, trunk |
| Map: grove, den, ward cairn, relic | fruit, paw/cave, stone cairn, gem |

## What is not done yet

- No sound or music.
- No animation frames: pieces slide, flash when hit, and show effects (rings, lines, sparks).
- Hero portraits are monograms (two letters) in a gold ring, not painted faces.
- A real artist pass (painted heroes, textured board) is a later, separate plan with its own cost.

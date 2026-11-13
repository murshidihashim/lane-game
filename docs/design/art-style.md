# Art style · "Batik paper" v4

Decisions:
- DEC-018: the batik paper-cut diorama, chosen by the owner ("use the batik paper card diorama").
  It replaces the earlier Hikayat look from DEC-010.
- DEC-013: characters, ultimate effects and tower health.
- DEC-022: heroic character designs at the Dota 2 quality bar, all our own (PLAN-014).

Plans: PLAN-009 (this look), PLAN-010 (paper ultimate effects), PLAN-004, PLAN-006 and PLAN-014 (characters).

Code:
- `src/ui/art.ts`: palette, batik patterns, the die-cut helper, paper forts, the paper map.
- `src/ui/figures.ts`: characters.
- `src/ui/ultfx.ts`: ultimate effects.
- `src/ui/render.ts`: board, fog and HUD.
- `src/ui/draft.ts`: draft and versus screens.
- `index.html`: menus.

Research: `docs/research/art-style-options.md`. Character designs and their sources: `docs/design/character-art.md`.

## The idea in one line

A **paper-cut diorama** of a folk-tale board seen from above. The board is batik-printed jungle cloth
with cut-paper leaf canopies, kraft-paper lanes and a layered paper river. On it stand die-cut
paper standees with a white cut edge. The menus are paper cards laid on indigo batik cloth with songket
gold trim. It reads like a pop-up storybook built on a table.

## Why this look

- **Ours.** Batik is instantly Malaysian. Local games have used paper and batik before (Kabaret, 2023;
  Paper Ghost Stories: 7PM, 2024), but not for a strategy game.
- **Readable on a small phone.** The white cut edge and paper shadow lift every piece off the board.
  Team colour stays on each piece's base and sash.
- **Cheap to build and change.** Everything is drawn in code. Shadows and cut edges are drawn once
  into caches, so phones don't redo them every frame.

## Palette

| Use | Colour | Hex |
|---|---|---|
| Ink (outlines, text) | indigo-black | `#221a2c` |
| Jungle cloth | batik greens | `#2d5a47`, `#1f4535`, `#3f7a5d` |
| Leaf canopies | paper greens | `#2f6b4c`, light `#4f9a68` |
| Lanes | kraft paper | `#c98f55`, torn rim `#e6c08a`, print `#8a5a2e` |
| River | water paper | `#2a7f94`, `#3796aa`, deep `#1f6578`; bank `#ead8b0` |
| Soga brown (batik dye; buttons, borders) | browns | `#7b4a22`, `#a8703c`, `#4a2a14` |
| Paper cards | cream | `#f4ead6`, `#e0d0ac` |
| Cut edge | paper white | `#fbf7ec` |
| Menus and screen edges | indigo cloth | `#1b2742`, `#111a2f`, `#2c3f66` |
| Songket (trim, highlights) | gold on maroon | `#e0b04a`, `#a57a24`; `#6b1f2a` |
| Your side | blue | `#2f5fb3` |
| Enemy side | red | `#c0392b` |
| Semangat | purple beads | `#7b3fb0` |

Order colours and species colours are unchanged; see the code (`ORDER_COLORS` and `SPECIES_COLORS`).

## Rules for every new piece

1. **Every piece is cut paper.**
   - Heroes and troops are die-cut standees: the figure plus its base gets a white cut edge (about
     4.5% of its height, 1–3 px) and a soft paper shadow down and to the right. Use `cutOut` in
     `art.ts`.
   - Forts and the Pusaka are folded paper: a cream deck with a soga border and team-coloured roof
     panels.
   - Map features are paper shapes with soft shadows.
2. **Batik print stays quiet and off the figures.**
   - Batik motifs (four-petal flowers, dot rings, crackle) print on the board, the fog, the
     menus and roofs, always at low contrast.
   - Figures stay plain fills so they read at 20–45 px.
   - Never print motifs that could be mistaken for map markers.
3. **Team colour is the base and a sash, never the character's own colours.** Blue for you, red for
   the bot, as before. Heroes also carry a team pennant; troops wear it as a tabard, plume, collar,
   band or caparison.
4. **Pieces move like pieces.**
   - eight walk frames that follow distance walked;
   - idle breathing and three attack beats;
   - a white flash when hit, and a rise from the base when appearing;
   - while fighting, a piece faces its target and lunges a little on the strike; ranged pieces rock
     back instead (PLAN-013);
   - when a piece dies, its paper standee topples backwards and fades as paper scraps fly.
   - Heroes are about 42 px tall and troops about 24 px in the usual full-width view (DEC-019,
     PLAN-014); both grow when you zoom in, and shrink a little in the whole-map view.
5. **Draw once, copy every frame.**
   - The map is painted once at the full-width scale, at up to twice the screen's sharpness (zoom
     stays crisp).
   - Figures are cached per pose, and forts per size.
   - Per-frame shadows are only crisp offset copies under cards. There is one blurred shadow per
     frame, under the board.
6. **Text:** serif (Georgia) for names and titles, sans for numbers and help.
7. **Gold means "you can act here"**: order spots, a ULT button at its best moment, a Shop with
   something affordable, relics. The order ring (DEC-021) follows the same rules: paper discs with a
   white cut edge and a crisp shadow, the order under the finger raised in gold, and the hero's best
   order marked ★.
8. **The fog of war is indigo dye.** Everything outside your vision gets an indigo wash with faint
   batik motifs and soft edges. Enemies there are not drawn. Towers, the Pusaka and their health
   stay readable above it.
9. **Ultimates are big moments, in cut paper (PLAN-010).** A team-coloured paper card banner runs
   across the top, and each hero's own effect plays on the map (see `ultfx.ts`):
   - rings and strokes are paper strips with a white cut edge and a crisp shadow; wide rings get a
     stitched line;
   - shapes are paper pieces: Benteng's dome printed with batik dots, Senja's crescent moon, Ombak's
     wave, feathers, coins, drops and stars;
   - glows are layered tissue paper with a perforated edge, and sparks are paper confetti.

   There are no blurred shadows or gradients in effects, so they stay cheap every frame.
10. **No borrowed looks.** No shapes, icons, frames or colours copied from other games.

## Strategy and action pieces (PLAN-015)

Code: `src/ui/action.ts` and `src/ui/render.ts`.

- **Warning rings** are paper rings with a crisp shadow and a white edge, dashed and turning, filling
  in as the moment comes: red for the enemy, gold for yours, burnt orange for Gajah Mina. Enemy
  rings carry a paper warning flag. They show through the fog: both sides must see them.
- **Combo stamps** are red-ink chops ("COMBO ×2") pressed onto the board with a gold inner line.
- **Dashes** leave three paper speed strips in team colour.
- **Bamboo barricades** are short paper fences of green bamboo with team-coloured lashings.
- **Commander calls** are paper discs beside the Shop with a small cut-paper icon (drum, bamboo,
  eye, leaf and bowl, snare, mallet), a purple cost bead and a cooldown sweep.
- **Power gems** are gold paper diamonds on each hero panel; they glow while the Power waits for a cue.

## Characters (PLAN-014)

Dota 2 is the quality bar; the designs are ours. Each hero's source is listed in
`docs/design/character-art.md`.

- **Heroic proportions.** About five heads tall, broad shoulders, a narrower waist, longer legs and a
  small sharp face. Costume parts layer on top: pauldrons, chest plate, belt, skirt, bracers, boots,
  cape.
- **One signature shape per hero.** It must read as a black silhouette at play size: Kail's giant
  hat, Benteng's tower shield, Hujan's umbrella, Gergasi's horns and club, Ombak's wave.
- **Value pattern.** Light at the head and shoulders, darker towards the feet (softer on troops), so
  the eye goes to the face and the signature shape.
- **Glow is rare.** Only magic users and beasts get glowing eyes or props, kept small.
- **Faces live in portraits.** At play size the silhouette and colours carry identity; the
  portraits are framed on the smaller heads.
- **Check before adding a piece:** a silhouette sheet, a sheet at play size, and a portrait.

## Map pieces

| Thing | Paper treatment |
|---|---|
| Jungle | green batik cloth printed with flowers, dots and wax cracks |
| Trees | clusters of cut-paper leaves in two greens, with a gold seed in the middle |
| Lanes | kraft-paper strips with a light torn rim, a dotted centre and small printed dots |
| River | cream bank strip; water in three layers with scalloped cut edges and batik wave lines |
| Bridges | cream paper planks |
| Camps | cream paper discs with a stitched ring |
| Dens | soga paper discs with an indigo cave arch |
| Gajah Mina's pool | an indigo paper oval with wave lines and a stitched edge |
| Ward cairns | two paper pebbles |
| Order spots, items, relics | the symbols from v2, unchanged |

## Combat you can read (PLAN-013)

Code: `src/ui/combat.ts` and `src/ui/render.ts`.

- **How they attack.** Every ranged attacker throws something you can see, all cut paper:
  - arrows for archers, Rimba, Helang and watchtowers;
  - sling stones (lobbed) for Lontar;
  - water jets for archerfish and Hujan, and spit for Tedung and the hive queen;
  - coins for Saudagar and bamboo darts for Tukang;
  - star-bolts for the casters;
  - gold darts for towers.

  Melee hits sweep a paper crescent across the target, and heavy hitters thud a ring at its feet.
  Paper confetti bursts from every hit.
- **Where they attack.** A visible hero that is fighting shows a dashed line and a turning reticle
  on its target. Yours are gold; an enemy hero hitting your side is red. Hits by or on heroes float
  a damage number: cream for damage you deal, red for damage you take.
- **Ultimates on the hero.**
  - While called and waiting: a turning gold ring with orbiting sparks.
  - When it fires: paper rays burst behind the hero, which pops up and flashes, and shouts the
    ultimate's name in a gold-edged bubble.
  - Ready: a bobbing gold ULT badge.
- **Heroes talk back.** Short paper speech bubbles, which step up rather than overlap:
  - answering every order ("Pushing Right!", "After Belang!");
  - "Waiting for our troops…", "Falling back to heal!" and "Help! I'm in trouble!";
  - "Flash Flood is ready!", "Belang spotted!" and "Back in the fight!".

  Ordinary remarks are at least 2.3 s apart; urgent ones always show.
- **Status.** Spinning paper stars mean stunned, a struck-through speech bubble means silenced, and
  falling green drops mean poisoned; a frost ring at the feet means slowed.
- **Off the screen.** Your hero gets a paper tab with its portrait at the map's edge, pointing to it:
  red when it is hurt, gold when it casts. Its speech bubble goes beside the tab. Tap the tab to
  look there.
- **Panels.** A hero's panel flashes red when the hero is hit, and says "⚔ vs Belang" while it fights
  an enemy hero.

## What is not done yet

- No sound or music.
- A real artist pass (hand-cut paper photographed or painted, richer batik) is a later, separate
  plan with its own cost.

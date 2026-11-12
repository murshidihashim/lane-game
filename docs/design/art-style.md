# Art style · "Batik paper" v3

Decisions:
- DEC-018: the batik paper-cut diorama, chosen by the owner ("use the batik paper card diorama").
  It replaces the earlier Hikayat look from DEC-010.
- DEC-013: characters, ultimate effects and tower health.

Plans: PLAN-009 (this look), PLAN-004 and PLAN-006 (characters).

Code:
- `src/ui/art.ts`: palette, batik patterns, the die-cut helper, paper forts, the paper map.
- `src/ui/figures.ts`: characters.
- `src/ui/ultfx.ts`: ultimate effects.
- `src/ui/render.ts`: board, fog and HUD.
- `src/ui/draft.ts`: draft and versus screens.
- `index.html`: menus.

Research: `docs/research/art-style-options.md`.

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
   - Figures stay plain fills so they read at 20–35 px.
   - Never print motifs that could be mistaken for map markers.
3. **Team colour is the base and a sash, never the character's own colours.** Blue for you, red for
   the bot, as before.
4. **Pieces move like pieces.** Unchanged from v2:
   - eight walk frames that follow distance walked;
   - idle breathing and three attack beats;
   - a white flash when hit, and a rise from the base when appearing.
   - Heroes are about 34 px tall and troops about 21 px; both grow with zoom.
5. **Draw once, copy every frame.**
   - The map is painted once at up to twice the screen's sharpness (zoom stays crisp).
   - Figures are cached per pose, and forts per size.
   - Per-frame shadows are only crisp offset copies under cards. There is one blurred shadow per
     frame, under the board.
6. **Text:** serif (Georgia) for names and titles, sans for numbers and help.
7. **Gold means "you can act here"**: order spots, a ULT button at its best moment, a Shop with
   something affordable, relics.
8. **The fog of war is indigo dye.** Everything outside your vision gets an indigo wash with faint
   batik motifs and soft edges. Enemies there are not drawn. Towers, the Pusaka and their health
   stay readable above it.
9. **Ultimates are big moments:** a banner across the top and the hero's own effect on the map (see
   `ultfx.ts`). Effects keep their PLAN-004 shapes. A paper-style redraw of the effects is a
   possible later pass.
10. **No borrowed looks.** No shapes, icons, frames or colours copied from other games.

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

## What is not done yet

- No sound or music.
- Ultimate effects keep their earlier shapes; only their colours follow the palette.
- A real artist pass (hand-cut paper photographed or painted, richer batik) is a later, separate
  plan with its own cost.

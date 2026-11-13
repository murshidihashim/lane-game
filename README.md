# Lane Game (working title)

A short, real-time one-on-one strategy battle for phones. You pick one of 5 species and draft 3 of
20 folk-tale heroes against the bot, then command: choose which troop class marches in each of three lanes, send your
heroes to move, push, gank, defend, farm and ward, buy them items, and call their ultimates. There
are no hand-played cards. A MOBA-style map with a jungle and fog of war rewards exploring. Matches
last about 5 minutes. Portrait, one thumb. The look is a batik paper-cut diorama: paper standees on a batik-printed board.

**Status:** playable prototype (PLAN-012: order ring round the thumb; PLAN-011: faster ultimates),
waiting for the owner's playtest. Check balance with `npm run balance`.

Run it: `npm install`, then `npm run dev` (local) or `npm run build` (one self-contained page in
`dist/lane-game.html`). Check it: `npm run verify`, `npm run soak`, `node scripts/phone-check.cjs out`.

| What | Where |
|---|---|
| Current state and next step | `docs/workflow/STATE.md` |
| App brief | `docs/workflow/APP-BRIEF.md` |
| Decisions and plans | `docs/workflow/DECISIONS.md` |
| Game concept and screen layout | `docs/design/concept-v0.md`, `docs/design/layout-mockup.png` |
| Hero roster (generated from the game data) | `docs/design/heroes.md` |
| Species, lane troops, items, fog and map rewards (generated) | `docs/design/species.md` |
| Art style guide | `docs/design/art-style.md` |
| Research report (market, similar games, tech, legal) | `docs/research/research-report.md` |
| Game rules (no graphics, whole-number maths) | `src/game/` (tuning numbers in `src/game/rules.ts`) |
| Phone screen, controls and drawing (`art.ts` style, `figures.ts` characters, `ultfx.ts` ultimates) | `src/ui/` |
| How we work (app-kit) | `tools/app-kit/README.md`, `CLAUDE.md` |

Owner: Murshidi (Kuala Lumpur).

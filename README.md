# Lane Game (working title)

A short, real-time one-on-one strategy battle for phones. You pick one of 5 species and 2 of 20
folk-tale heroes, choose which troop class marches in each of three lanes, drop extra troops and
spells from cards, and command your heroes to push, defend, gank, farm and ward on a MOBA-style map
with a jungle that rewards exploring. Matches last about 5 minutes. Portrait, one thumb. The look is
"Hikayat", a painted folk-tale board game.

**Status:** playable prototype with species, wards, map rewards and the Hikayat art style
(PLAN-003), waiting for the owner's playtest.

Run it: `npm install`, then `npm run dev` (local) or `npm run build` (one self-contained page in
`dist/lane-game.html`). Check it: `npm run verify`, `npm run soak`, `node scripts/phone-check.cjs out`.

| What | Where |
|---|---|
| Current state and next step | `docs/workflow/STATE.md` |
| App brief | `docs/workflow/APP-BRIEF.md` |
| Decisions and plans | `docs/workflow/DECISIONS.md` |
| Game concept and screen layout | `docs/design/concept-v0.md`, `docs/design/layout-mockup.png` |
| Hero roster (generated from the game data) | `docs/design/heroes.md` |
| Species, troops, spells and map rewards (generated) | `docs/design/species.md` |
| Art style guide | `docs/design/art-style.md` |
| Research report (market, similar games, tech, legal) | `docs/research/research-report.md` |
| Game rules (no graphics, whole-number maths) | `src/game/` (tuning numbers in `src/game/rules.ts`) |
| Phone screen, controls and drawing (`art.ts` holds the style) | `src/ui/` |
| How we work (app-kit) | `tools/app-kit/README.md`, `CLAUDE.md` |

Owner: Murshidi (Kuala Lumpur).

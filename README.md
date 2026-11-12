# Lane Game (working title)

A short, real-time one-on-one strategy battle for phones. You pick 2 of 20 folk-tale heroes, drop
units from cards into three lanes, Clash Royale style, and command your heroes to push, defend,
gank and farm on a MOBA-style map with a jungle. Matches last about 5 minutes. Portrait, one thumb.

**Status:** playable prototype with 20 folk-tale heroes (PLAN-002), waiting for the owner's playtest.

Run it: `npm install`, then `npm run dev` (local) or `npm run build` (one self-contained page in
`dist/lane-game.html`). Check it: `npm run verify`, `npm run soak`, `node scripts/phone-check.cjs out`.

| What | Where |
|---|---|
| Current state and next step | `docs/workflow/STATE.md` |
| App brief | `docs/workflow/APP-BRIEF.md` |
| Decisions and plans | `docs/workflow/DECISIONS.md` |
| Game concept and screen layout | `docs/design/concept-v0.md`, `docs/design/layout-mockup.png` |
| Hero roster (generated from the game data) | `docs/design/heroes.md` |
| Research report (market, similar games, tech, legal) | `docs/research/research-report.md` |
| Game rules (no graphics, whole-number maths) | `src/game/` (tuning numbers in `src/game/rules.ts`) |
| Phone screen and controls | `src/ui/` |
| How we work (app-kit) | `tools/app-kit/README.md`, `CLAUDE.md` |

Owner: Murshidi (Kuala Lumpur).

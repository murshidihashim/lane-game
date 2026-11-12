# Current state · Lane Game

Updated 2026-11-12 19:39 (Asia/Kuala_Lumpur) by the app steward.

## Where we are
- **Stage:** playable prototype. You draft 3 heroes against the bot, then command them and choose
  each lane's troops through a tap-a-hero command menu (incl. Attack); heroes no longer stall and
  look after themselves; fog of war, polished characters, visible ultimates, zoomable map;
  balanced against the bot.
- **Packages:** PLAN-001 to PLAN-004 are implemented and wait for the owner's playtest.
  PLAN-005 (REP-007) and PLAN-006 (REP-008) are implemented. PLAN-007 "Smarter heroes and a
  tap-to-command menu" is approved and **implemented**: T1–T5 PASS; T6 (owner's phone) and T7
  (owner's verdict) wait. Report: REP-009.
- **Decided:** DEC-001 to DEC-017. DEC-017 (command menu, Attack order, smarter heroes) is implemented.
- **Awaiting the owner:** DEC-018 "Art direction for the full game": five styles researched
  (REP-010, `docs/research/art-style-options.md`). Recommended: keep Hikayat for now; wayang living
  puppets on a batik board for the full game; toy-box 3D as runner-up.

## What was built
- `src/game/rules.ts`: tuning numbers (balanced in PLAN-005), species, items, vision, 20 heroes.
- `src/game/sim.ts`: match rules; 3 heroes a side; draft helpers; hero AI (no stalls, tower wait,
  fall back, target choice) and the Attack order. `src/game/bot.ts`: lane troops, orders, items, ultimates.
- `src/ui/draft.ts` (species step, draft, versus screen), `src/ui/figures.ts` (polished, animated
  characters), `src/ui/ultfx.ts`, `src/ui/render.ts` (3 hero panels, animation inputs),
  `src/ui/layout.ts` + `src/ui/game.ts` (camera; command menu input), `src/ui/placement.ts` (order
  targets and tap resolution), `src/main.ts`, `index.html`.
- `tests/`: 84 unit tests; `tests/soak/soak.test.ts` (120 matches) and `tests/soak/balance.test.ts`
  (`npm run balance`, 1,200 matches with targets).

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-007, version 7, 2026-11-12 |
| Roster page | private page "Lane Game Heroes" (owner-only) | roster v2; out of date (shows card costs) |
| Art styles page | private page "Lane Game Art Styles" (owner-only) | sketches of the 5 DEC-018 styles, 2026-11-12 |

## Checks
- `npm run verify`: type check, 93 tests, build, docs check, records check all pass (2026-11-12).
- `npm run soak`: 120 matches pass, plus 60 matches of random orders with 0 stalls.
  `npm run balance`: 1,200 matches pass (species 46–56%, heroes 43–59%, draws 11%).
- `node scripts/phone-check.cjs`: PHONE CHECK OK (draft, command menu for every order, zoom).
- Readiness: build-ready PASS; use-ready NOT RUN (owner's phone and verdict); release-ready not claimed.

## Open items
- **Art direction (DEC-018):** owner picks 1–2 styles for a free look test, says whether there is an
  art budget, and names any look they like.
- **Owner playtest:** checklist in `OWNER-BRIEF.md`. Menu intuitive? Heroes smart but not too
  independent? Pace, zoom, characters, fairness, draft, 3 heroes?
- **Balance:** measured bot against bot; real players will find other strong picks.
- **Game name:** none yet ("Lane Game" is a working title). Check names with MyIPO before use.
- **Permanent preview hosting:** to be chosen later.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log (art-style research commit after PLAN-007).
- **Uncommitted:** none after this commit.
- **Active approvals:** PLAN-001 to PLAN-007, all implemented.
- **Checks:** verify, soak, balance and phone check all pass.
- **Blocker:** owner playtest; owner's art choice (DEC-018).
- **Next step:** the owner plays and reports, and picks styles for a look test (a new plan).

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- DEC-018: Art direction for the full game (awaiting approval)
<!-- appkit:pending:end -->

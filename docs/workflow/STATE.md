# Current state · Lane Game

Updated 2026-11-13 12:30 (Asia/Kuala_Lumpur) by the app steward.

## Where we are
- **Stage:** playable prototype. You draft 3 heroes against the bot, then command them and choose
  each lane's troops through an order ring round the thumb (incl. Attack); heroes no longer stall and
  look after themselves; fog of war, visible ultimates, zoomable map; balanced against the bot.
  The look is the batik paper-cut diorama (DEC-018), ultimates included; the map fills the
  screen's width and scrolls (DEC-019). Heroes and troops are heroic, detailed paper figures at the
  Dota 2 quality bar, all our own designs (DEC-022).
- **Packages:** PLAN-001 to PLAN-004 are implemented and wait for the owner's playtest.
  PLAN-005 (REP-007) and PLAN-006 (REP-008) are implemented. PLAN-007 "Smarter heroes and a
  tap-to-command menu" is implemented (REP-009). PLAN-009 "Batik paper-cut diorama look" is
  approved and **implemented**: T1–T4 PASS; T5 (owner's phone) and T6 (owner's verdict) wait.
  Report: REP-012. PLAN-008 (anime look test) was superseded by PLAN-009. PLAN-010 "Full-width
  map and paper ultimate effects" is implemented (REP-013). PLAN-011 "Faster levelling to the
  ultimate" is implemented (REP-014). PLAN-012 "Ring menu for hero orders" is implemented (REP-015).
  PLAN-013 "Combat animation and hero feedback" is implemented (REP-016). PLAN-014 "Hero and
  troop design overhaul" is **implemented**: T1–T7 PASS; T8 (owner's phone) and T9 (verdict) wait.
  Report: REP-017.
- **Decided:** DEC-001 to DEC-019. DEC-018 (batik paper-cut diorama) and DEC-019 (full-width map)
  are implemented.
- **Awaiting the owner:** DEC-020 "Make the map more engaging": five ideas in REP-013 (monsoon and
  night, kampung outposts, pasar malam merchant, lalang grass and birds, living paper map).
- **Decided:** DEC-021 (hero controls): the order ring round the thumb, the owner's choice; implemented.
- **Decided:** DEC-022 (character designs at the Dota 2 quality bar, our own): implemented.

## What was built
- `src/game/rules.ts`: tuning numbers (balanced in PLAN-005), species, items, vision, 20 heroes.
- `src/game/sim.ts`: match rules; 3 heroes a side; draft helpers; hero AI (no stalls, tower wait,
  fall back, target choice) and the Attack order. `src/game/bot.ts`: lane troops, orders, items, ultimates.
- `src/ui/draft.ts` (species step, draft, versus screen), `src/ui/figures.ts` (heroic paper
  characters, PLAN-014), `src/ui/ultfx.ts`, `src/ui/render.ts` (3 hero panels, animation inputs),
  `src/ui/layout.ts` + `src/ui/game.ts` (camera; order ring input), `src/ui/placement.ts` (order
  targets and tap resolution), `src/main.ts`, `index.html`.
- `tests/`: 96 unit tests; `tests/soak/soak.test.ts` (120 matches) and `tests/soak/balance.test.ts`
  (`npm run balance`, 1,200 matches with targets).

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-014, version 13, 2026-11-13 |
| Stray copy | a second private page "Lane Game" published by mistake (owner-only) | PLAN-009; owner may delete it |
| Roster page | private page "Lane Game Heroes" (owner-only) | roster v2; out of date (shows card costs) |
| Art styles page | private page "Lane Game Art Styles" (owner-only) | sketches of the 6 DEC-018 styles (version 2), 2026-11-12 |
| Hero controls page | private page "Lane Game Hero Controls" (owner-only) | sketches of the 5 DEC-021 ideas, 2026-11-13 |

## Checks
- `npm run verify`: type check, 96 tests, build, docs check, records check all pass (2026-11-13).
- `npm run soak`: 120 matches pass, plus 60 matches of random orders with 0 stalls (identical to
  PLAN-013 after the redesign).
  `npm run balance`: 1,200 matches pass (species 46–56%, heroes 43–59%, draws 11%).
- `node scripts/phone-check.cjs`: PHONE CHECK OK (draft, order ring for every order, one-swipe orders, zoom), in the paper look.
- Readiness: build-ready PASS; use-ready NOT RUN (owner's phone and verdict); release-ready not claimed.

## Open items
- **Paper look and full-width map (PLAN-009, PLAN-010):** owner checks them on a phone. Is it easy
  to read, and is scrolling OK or is a mini-map needed? Art budget for a real artist still unknown.
- **Map ideas (DEC-020):** owner picks which of the five to build.
- **Order ring (PLAN-012):** owner tries it on a phone: quick, no wrong picks, map clear?
- **Combat feedback (PLAN-013):** owner checks fights are readable and the bubbles are not too chatty.
- **Character designs (PLAN-014):** owner checks each hero reads at a glance and feels heroic;
  faces are small at play size by design. New poses cost about 26% more to draw the first time.
- **Owner playtest:** checklist in `OWNER-BRIEF.md`. Menu intuitive? Heroes smart but not too
  independent? Pace, zoom, characters, fairness, draft, 3 heroes?
- **Balance:** measured bot against bot; real players will find other strong picks.
- **Game name:** none yet ("Lane Game" is a working title). Check names with MyIPO before use.
- **Permanent preview hosting:** to be chosen later.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log (PLAN-014 commit).
- **Uncommitted:** none after this commit.
- **Active approvals:** PLAN-001 to PLAN-007 and PLAN-009 to PLAN-014, all implemented.
- **Checks:** verify, soak and phone check pass. Balance last ran in PLAN-013 (identical); no rule change since.
- **Blocker:** owner playtest; owner's choice on DEC-020.
- **Next step:** the owner tries the new designs and picks map ideas (DEC-020); then plan the chosen ones.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- DEC-020: Make the map more engaging (awaiting approval)
<!-- appkit:pending:end -->

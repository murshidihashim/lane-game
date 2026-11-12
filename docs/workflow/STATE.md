# Current state · Lane Game

Updated 2026-11-12 14:19 (Asia/Kuala_Lumpur) by the app steward.

## Where we are
- **Stage:** playable prototype. No hand cards: you command 2 heroes and choose each lane's troops.
  It has fog of war, character figures and visible ultimates.
- **Packages:** PLAN-001, PLAN-002 and PLAN-003 are implemented and wait for the owner's playtest.
  PLAN-004 "Hero command: no hand cards, items, called ultimates, fog of war, characters" is
  approved and **implemented**: T1–T5 PASS; T6 (owner's phone) and T7 (owner's verdict) wait.
  Report: REP-006.
- **Decided:** DEC-001 to DEC-013. DEC-011 (no hand cards; items; called ultimates) replaces the
  hero-as-card part of DEC-002, the automatic ultimate of DEC-004/007 and the deck part of DEC-008.
  DEC-012 (fog of war) and DEC-013 (characters, ultimate effects, tower health) are implemented.
- **Assumptions to confirm:** "ulti suggestion" means the game suggests the moment and the player
  calls it; "buy items" means a small shop of stat items.

## What was built
- `src/game/rules.ts`: tuning numbers, species and troop classes, 8 items, vision, 20 heroes.
- `src/game/sim.ts`: match rules (heroes start on the map, waves only, items, ultimate calls, Move
  order, vision). Whole-number maths only. `src/game/heroes.ts`: kits.
- `src/game/bot.ts`: lane troops, orders, items, ultimate calls; plays by its own vision.
- `src/ui/figures.ts` (characters), `src/ui/ultfx.ts` (ultimate effects), `src/ui/art.ts` (style),
  `src/ui/render.ts` (board, fog, tower health, hero panels, ULT, Shop button), `index.html` (shop sheet).
- `tests/`: 82 unit tests (incl. `fog.test.ts`); soak in `tests/soak/`.
- `docs/design/`: `heroes.md`, `species.md` (generated), `art-style.md` v2.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-004, version 4, 2026-11-12 |
| Roster page | private page "Lane Game Heroes" (owner-only) | roster v2; out of date (shows card costs) |

## Checks
- `npm run verify`: type check, 82 tests, build, docs check, records check all pass (2026-11-12).
- `npm run soak`: 120 bot-vs-bot matches pass; draws 9%; every hero and species played; items and
  ultimates used.
- `node scripts/phone-check.cjs`: PHONE CHECK OK.
- Readiness: build-ready PASS; use-ready NOT RUN (owner's phone and verdict); release-ready not claimed.

## Open items
- **Owner playtest:** checklist in `OWNER-BRIEF.md`. Enough to do without cards? Is ULT/Shop clear?
  Do the fog and the characters read well?
- **Balance signal from bots** (wins / matches): Batu 25/37 strong, Kampung 11/43 weak; some matches
  end before 2:00; Dalang 20/25 strong, Saudagar 3/16 and Hujan 3/15 weak.
- **Game name:** none yet ("Lane Game" is a working title). Check names with MyIPO before use.
- **Permanent preview hosting:** to be chosen later.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log (PLAN-004 commit).
- **Uncommitted:** none after this commit.
- **Active approvals:** PLAN-001 to PLAN-004, all implemented.
- **Checks:** verify, soak and phone check all pass.
- **Blocker:** owner playtest.
- **Next step:** the owner plays and reports; then propose a tuning plan.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- None.
<!-- appkit:pending:end -->

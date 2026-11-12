# Current state · Lane Game

Updated 2026-11-12 (Asia/Kuala_Lumpur) by Claude.

## Where we are
- **Stage:** playable prototype with 20 heroes.
- **Packages:**
  - PLAN-001 "Grey-box prototype vs bot": implemented. T1 and T6 wait for the owner's playtest,
    which can now happen on the new build.
  - PLAN-002 "20 heroes with powers": approved ("create and build in total 20 chracters") and
    **implemented**. T5 (owner's phone) and T6 (owner's verdict) wait for the owner.
- **Decided:** DEC-001 to DEC-007, including DEC-006 (folk-tale names) and DEC-007 (power system),
  both implemented.

## What was built
- `src/game/rules.ts`: all tuning numbers and the 20 heroes' card text.
- `src/game/heroes.ts`: each hero's Trait, Power and Ultimate.
- `src/game/sim.ts`: the match rules, effects and zones. Whole-number maths only.
- `src/game/bot.ts`: the computer opponent; it orders each hero by its best order.
- `src/ui/`: phone screen, hero pick screen, drag and tap controls, effects drawing.
- `tests/`: 51 unit tests, including one per hero; 100-match soak in `tests/soak/`.
- `scripts/`:
  - `phone-check.cjs`: phone-size browser check.
  - `inline-build.mjs`: single-file build.
  - `heroes-doc.mjs`: writes `docs/design/heroes.md` from the game data.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-002, version 2, 2026-11-12 |
| Roster page | private page "Lane Game Heroes" (owner-only) | roster v2, 20 heroes |

## Checks
- `npm run verify`: type check, 51 tests, build, roster doc check and records check all pass (2026-11-12).
- `npm run soak`: 100 bot-vs-bot matches pass; draws 29%; every hero played.
- `node scripts/phone-check.cjs`: PHONE CHECK OK.
- Readiness:
  - build-ready: PASS.
  - use-ready: NOT RUN (owner's phone and verdict).
  - release-ready: not claimed.

## Open items
- **Owner playtest:** several matches with different heroes. Is it readable? Fun? Is any hero
  clearly too strong or too weak?
- **Balance signal from bots** (wins / matches):
  - possibly strong: Dalang 14/22, Helang 13/21, Ombak 12/20
  - possibly weak: Benteng 2/7, Embun 3/19, Hujan 4/14, Layang 4/13
- **Game name:** none yet ("Lane Game" is a working title). Check any name, and hero names, with
  MyIPO before using them.
- **Permanent preview hosting:** to be chosen later.
- **Research gaps:** many sources were blocked; numbers in `docs/research/` are estimates.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log.
- **Uncommitted:** none after this commit.
- **Active approvals:** PLAN-001 and PLAN-002, both implemented.
- **Checks:** verify, soak and phone check all pass.
- **Blocker:** owner playtest (PLAN-001 T1/T6, PLAN-002 T5/T6).
- **Next step:** the owner plays and reports. Then propose a tuning plan.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- None.
<!-- appkit:pending:end -->

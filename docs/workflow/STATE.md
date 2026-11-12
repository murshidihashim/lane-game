# Current state · Lane Game

Updated 2026-11-12 (Asia/Kuala_Lumpur) by Claude.

## Where we are
- **Stage:** first playable prototype.
- **Active package:** PLAN-001 "Grey-box prototype vs bot". Approved by the owner ("ok approve
  plan a", 2026-11-12). Delivery: **implemented**, not yet verified.
- **Decided:** DEC-001 to DEC-005: portrait; hero cards with orders; longer, winding middle lane;
  abilities fire automatically; this repository.
- **Not done or not verified:**
  - T1: a full match on the owner's own phone. The automated phone-size check passed.
  - T6: the owner's verdict after 5+ matches.

## What was built (PLAN-001)
- `src/game/`: the game rules. They have no graphics code and use whole-number maths only, so the
  same seed and the same moves always replay the same match.
  - `map.ts`: the map, with the long, winding middle lane.
  - `rules.ts`: all tuning numbers.
  - `sim.ts`: the match itself.
  - `bot.ts`: the computer opponent.
- `src/ui/`: phone screen, drag/tap controls, hero orders, settings, result screen.
- `tests/`: 28 unit tests, plus a 100-match soak test in `tests/soak/`.
- `scripts/phone-check.cjs`: browser check at phone size.
- `scripts/inline-build.mjs`: builds the single-file game.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-001, 2026-11-12 |

## Checks
- `npm run verify`: type check, 28 tests, build and records check all pass (2026-11-12).
- `npm run soak`: 100 bot-vs-bot matches pass.
- `node scripts/phone-check.cjs`: PHONE CHECK OK.
- Readiness:
  - build-ready: PASS.
  - use-ready: NOT RUN (needs T1 and T6 from the owner).
  - release-ready: not claimed.

## Open items
- Hero concept v1 (`docs/design/characters-v1.md`, REP-003): 12 heroes and a power system. Waiting for
  the owner on DEC-006 (theme) and DEC-007 (power system). Then the next plan: the first six heroes.
- Game name: none yet ("Lane Game" is a working title). Check any name with MyIPO before using it.
- Balance: in bot-vs-bot play, 56 of 100 matches end in a draw. Retune after the owner's playtest.
- Permanent preview hosting: chosen later. GitHub Pages needs a public repo or a paid plan.
- Research gaps: many sources were blocked during research; numbers in `docs/research/` are estimates.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log.
- **Uncommitted:** none after this commit.
- **Active approval:** PLAN-001.
- **Checks:** verify, soak and phone check all pass.
- **Blocker:** owner playtest (T1, T6).
- **Next step:** the owner plays 5+ matches and reports, and decides DEC-006 and DEC-007. Then tune
  numbers and propose the next plan (the first six heroes).

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- DEC-006: World theme for heroes and names (proposed)
- DEC-007: Hero power system v1 (proposed)
<!-- appkit:pending:end -->

# Current state · Lane Game

Updated 2026-11-12 13:41 (Asia/Kuala_Lumpur) by the app steward.

## Where we are
- **Stage:** playable prototype with 5 species, 20 heroes, map rewards and the Hikayat art style.
- **Packages:**
  - PLAN-001 "Grey-box prototype vs bot": implemented. T1 and T6 wait for the owner's playtest.
  - PLAN-002 "20 heroes with powers": implemented. T5 and T6 wait for the owner.
  - PLAN-003 "Creep species, wards, map rewards and art style": approved and **implemented**.
    T1–T5 PASS; T6 (owner's phone) and T7 (owner's verdict) wait for the owner. Report: REP-005.
- **Decided:** DEC-001 to DEC-010. DEC-008 (species and lane waves), DEC-009 (orders and map
  rewards) and DEC-010 (Hikayat art style) are implemented.
- **Assumption to confirm:** "deploy on each lane" is built as both a per-lane wave choice and
  troop cards. The jungle species is named Hutan, not Rimba as in the plan, because a hero is
  already called Rimba.

## What was built
- `src/game/rules.ts`: tuning numbers, 5 species, 18 troop classes, 6 spells, map rewards, 20 heroes.
- `src/game/heroes.ts`: each hero's Trait, Power and Ultimate.
- `src/game/sim.ts`: match rules, abilities, lane waves, wards, camps, Gajah Mina, relics, bounties.
  Whole-number maths only.
- `src/game/bot.ts`: computer opponent (lane waves, spells, hero orders, wards, dens, boss, relics).
- `src/ui/art.ts`: the Hikayat style (palette, glyphs, tokens, forts, painted map).
- `src/ui/`: phone screen, species and hero pick, wave chips, drag and tap controls.
- `tests/`: 72 unit tests (`species.test.ts`, `map.test.ts`, one test per hero); soak in `tests/soak/`.
- `scripts/`: `phone-check.cjs` (phone-size browser check), `inline-build.mjs` (single-file build),
  `heroes-doc.mjs` (writes `docs/design/heroes.md` and `species.md` from the game data).
- `docs/design/art-style.md`: the art style guide.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | not published | none |
| Preview | private preview page "Lane Game" (owner-only; link in the session reply) | PLAN-003, version 3, 2026-11-12 |
| Roster page | private page "Lane Game Heroes" (owner-only) | roster v2, 20 heroes |

## Checks
- `npm run verify`: type check, 72 tests, build, docs check and records check all pass (2026-11-12).
- `npm run soak`: 120 bot-vs-bot matches pass; every species and hero played; draws 16%.
- `node scripts/phone-check.cjs`: PHONE CHECK OK (species pick, wave chip, ward order).
- Readiness:
  - build-ready: PASS.
  - use-ready: NOT RUN (owner's phone and verdict).
  - release-ready: not claimed.

## Open items
- **Owner playtest:** checklist in `OWNER-BRIEF.md` (species, lane waves, map, art, balance).
- **Balance signal from bots** (wins / matches): species Serangga 25/38, Batu 21/37, Kampung 16/43,
  Sungai 13/40, Hutan 9/42. Heroes possibly strong: Dalang, Ombak; possibly weak: Benteng, Badak.
- **Game name:** none yet ("Lane Game" is a working title). Check names with MyIPO before use.
- **Permanent preview hosting:** to be chosen later.
- **Research gaps:** many sources were blocked; numbers in `docs/research/` are estimates.

## Checkpoint
- **Branch:** ccr-d5847beb-6m9vey.
- **Commit:** see git log (PLAN-003 commit).
- **Uncommitted:** none after this commit.
- **Active approvals:** PLAN-001, PLAN-002 and PLAN-003, all implemented.
- **Checks:** verify, soak and phone check all pass.
- **Blocker:** owner playtest (PLAN-001 T1/T6, PLAN-002 T5/T6, PLAN-003 T6/T7).
- **Next step:** the owner plays and reports. Then propose a tuning plan (species and hero balance).

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- appkit:pending:start (generated) -->
## Pending approvals (generated)

- None.
<!-- appkit:pending:end -->

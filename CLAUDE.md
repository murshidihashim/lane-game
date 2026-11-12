# Lane Game · working rules for Claude

Owner: Murshidi (product owner). Workflow: app-kit (see `tools/app-kit/README.md`).
Read `docs/workflow/STATE.md` first, then only the records the task needs.
The `app-steward` agent (`.claude/agents/app-steward.md`) runs this workflow.

## How we work
- One active work package (PLAN-###). Implement only what the owner explicitly approved.
  Routine edits, tests and docs inside an approved package need no further approval.
- Replan before changing core behaviour, architecture, spending, data handling or scope.
- Separate, explicit approval for: publishing to users, paid services, destructive production changes.
- Planning reports are documentation; they don't approve changes.
- Ask at most three high-impact questions at a time; state other assumptions.
- Never claim a test passed, a change shipped or a capacity figure without evidence.
- Results use PASS / FAIL / NOT RUN / NOT APPLICABLE. A required NOT RUN blocks a readiness claim.

## Replies to the owner
Substantive replies use, in order: STATUS, SUMMARY, PLAN OR WORK COMPLETED, VALIDATION, CHANGELOG,
RISKS AND COSTS, NEXT ACTION OR APPROVAL, DOCUMENT RECORD. About 200–300 words.
Short progress notes use STATUS, FINDING, NEXT. Plain English; the owner reads on a phone.

## Commands (fill in the real ones; never list a command that does not exist)
| Command | What it does |
|---|---|
| `npm run verify` | Type check, unit tests, build, roster-doc check, `appkit check`. Run before every commit. |
| `npm run docs:heroes` | Rewrite `docs/design/heroes.md` and `docs/design/species.md` from `src/game/rules.ts` (run after changing heroes, species, troops, spells or map rewards). |
| `npm run soak` | 100 + 20 bot-vs-bot matches (about 1 minute). Part of the full verify. |
| `node scripts/phone-check.cjs <folder>` | Phone-size browser check with screenshots (after `npm run build`; needs Playwright with Chromium on the machine, not a project dependency). Part of the full verify. |
| `npm run dev` | Run locally with hot reload (`?lanes=2&speed=2&seed=1&autoplay=1&nohelp=1` test options). |
| `npm run build` | Build `dist/lane-game.html` (stand-alone page) and `dist/artifact.html` (preview fragment). |
| `node tools/app-kit/appkit.mjs status` | Active package, pending approvals, last history line. |
| `node tools/app-kit/appkit.mjs build` | Rebuild DECISIONS.md, CHANGELOG.md and the STATE pending block. |
| `node tools/app-kit/appkit.mjs check` | Records valid, history append-only, views up to date. |

## Release path
- Preview copy: the owner's private preview page "Lane Game", republished by hand from
  `dist/artifact.html` after `npm run verify`, `npm run soak` and the phone check pass.
- Live copy: not set up. It will change only through a manual, owner-run step (a later plan).
- PREPARE RELEASE: bump the version, `appkit release <version> "<note>" ...`, run checks.
  `appkit release-check` must pass before publishing. After the owner publishes:
  `appkit published <version> <commit>` in a new commit.

## Preserve (change only with an approved plan)
- `src/game/` (the game rules): no graphics code, no timers, no Math.random/sqrt/sin inside.
  It uses whole-number maths only, so the same seed and moves give the same match on every
  device (needed for online play and replays later). `tests/determinism.test.ts` guards this.
  Tuning numbers and hero card text live in `src/game/rules.ts`; hero kits in `src/game/heroes.ts`.
  Every hero needs a kit test in `tests/heroes.test.ts`; every troop class and spell needs a test in
  `tests/species.test.ts`; map rewards are tested in `tests/map.test.ts`.
- The Hikayat art style (`docs/design/art-style.md`, `src/ui/art.ts`): new pieces follow its rules.
- Original names, art, map and screen layout only. Never use "Clash", "Royale", "Legends",
  "Elixir", "Lord" or "Turtle" (see `docs/research/research-report.md`, legal section).
- No paid random rewards (loot boxes or gacha) without a new, approved decision.
- Privacy: nothing collected in the prototype.
- Strict types; no new type escapes, disabled tests or swallowed errors without explanation.
- No new dependency unless its benefit outweighs the maintenance cost (say why in the plan).

## Records
- `docs/workflow/STATE.md`: active package, builds, blockers, next action (about 500 words).
- `docs/workflow/APP-BRIEF.md`: audience, core task, platforms, exclusions.
- `docs/workflow/OWNER-BRIEF.md`: how the owner tries, checks and publishes.
- Source of truth: `docs/workflow/records/` (`decisions.json` with append-only `history`,
  `PLAN-###.json`, `releases.json`). Change them with `appkit`, then `appkit build`.
  Never hand-edit `DECISIONS.md`, `CHANGELOG.md` or the generated STATE block.
- `docs/workflow/reports/REP-###.md`: snapshot per decision-bearing output; never rewritten.
  Times in Asia/Kuala_Lumpur. Approval status (proposed, awaiting approval, approved, rejected, superseded)
  is separate from delivery (not started, in progress, implemented, verified, released).
- No model or assistant names in the repo.

## Efficiency
Search before opening big files. After two failed fixes: reproduce, isolate, change the hypothesis.
Save a checkpoint in STATE.md before stopping: branch, commit, uncommitted files, active approval,
checks, blocker, next step.

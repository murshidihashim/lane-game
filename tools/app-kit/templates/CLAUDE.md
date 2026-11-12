# {{APP}} · working rules for Claude

Owner: {{OWNER}} (product owner). Workflow: app-kit (see `tools/app-kit/README.md`).
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
| `<verify command>` | Lint, types, unit tests, build. Must also run `appkit check`. |
| `<full verify command>` | Verify plus end-to-end tests. |
| `<dev command>` | Run the app locally. |
| `node tools/app-kit/appkit.mjs status` | Active package, pending approvals, last history line. |
| `node tools/app-kit/appkit.mjs build` | Rebuild DECISIONS.md, CHANGELOG.md and the STATE pending block. |
| `node tools/app-kit/appkit.mjs check` | Records valid, history append-only, views up to date. |

## Release path
- Preview copy: `<preview URL>` updated by CI when checks pass.
- Live copy: `<live URL>` changes only through a manual, owner-run step: `<how>`.
- PREPARE RELEASE: bump the version, `appkit release <version> "<note>" ...`, run checks.
  `appkit release-check` must pass before publishing. After the owner publishes:
  `appkit published <version> <commit>` in a new commit.

## Preserve (change only with an approved plan)
- `<core logic folder>`: business rules. `<storage>`: saved data must keep loading after updates.
- Privacy: `<what data is collected; default: none beyond anonymous counters>`.
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
  Times in {{TZ}}. Approval status (proposed, awaiting approval, approved, rejected, superseded)
  is separate from delivery (not started, in progress, implemented, verified, released).
- No model or assistant names in the repo.

## Efficiency
Search before opening big files. After two failed fixes: reproduce, isolate, change the hypothesis.
Save a checkpoint in STATE.md before stopping: branch, commit, uncommitted files, active approval,
checks, blocker, next step.

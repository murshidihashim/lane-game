# app-kit · run any app project the Fruit Market way

A reusable copy of the Fruit Market workflow for other apps (web, phone, desktop, tools).
The owner decides; Claude plans, builds, checks and keeps the records. Nothing here is game-specific.

| Part | File | What it does |
|---|---|---|
| **Agent** | `agent/app-steward.md` | Claude Code agent with the working rules: one approved package at a time, evidence for every claim, PASS / FAIL / NOT RUN, fixed reply format, checkpoint before stopping. |
| **Script** | `appkit.mjs` | One Node file, no dependencies. Sets up a project, creates plans, decisions and reports, records approvals in the owner's exact words, records test results with evidence, prepares releases, rebuilds the register and changelog, and checks that history was never rewritten. |
| **Prompts** | `prompts/PROMPTS.md` | Ten copy-and-send prompts for the owner: start, resume, ask for a change, approve, choose, check, bug report, prepare release, checkpoint, report only. |
| Templates | `templates/` | `CLAUDE.md`, `STATE.md`, `APP-BRIEF.md`, `OWNER-BRIEF.md` with the app name, owner and time zone filled in by `init`. |

## Start a new app (about 2 minutes)
1. Copy the `tools/app-kit/` folder into the new repository (same path).
2. Send prompt 1 from `prompts/PROMPTS.md`, or run it yourself:
   ```
   node tools/app-kit/appkit.mjs init --app "Recipe Box" --owner "Murshidi" --tz Asia/Kuala_Lumpur
   ```
   This creates `CLAUDE.md`, `.claude/agents/app-steward.md`, `docs/workflow/` (state, brief,
   owner brief, records, reports), `CHANGELOG.md`. It never overwrites an existing file.
3. Put the project's real commands in `CLAUDE.md` and add `node tools/app-kit/appkit.mjs check`
   to its verify command so CI refuses edited history or stale views.

## A normal day
```
appkit status                                     # where are we, what waits for the owner
appkit plan "Share a recipe by link"              # PLAN-002, proposed
appkit test PLAN-002 "Link opens the recipe on a second phone"
appkit approve PLAN-002 "ok go"                   # only the owner's own words
appkit deliver PLAN-002 "in progress"             # refuses if not approved
appkit result PLAN-002 T1 PASS "e2e share.spec passed, run 41"   # refuses PASS without evidence
appkit note PLAN-002 "You can share a recipe with a link"
appkit deliver PLAN-002 verified                  # refuses while any test is not PASS
appkit report "Sharing built"                     # REP-###, snapshot
appkit build && appkit check
```
(`appkit` = `node tools/app-kit/appkit.mjs`.)

## Release
`appkit release 1.1.0 "Share recipes by link"` adds a candidate with every verified, unreleased
plan. `appkit release-check 1.1.0` goes in the publish job. Publishing stays a manual owner step.
Afterwards: `appkit published 1.1.0 <commit>`.

## Same rules as Fruit Market, generalised
- Approval (proposed, awaiting approval, approved, rejected, superseded) is separate from delivery
  (not started, in progress, implemented, verified, released).
- `decisions.json` history is append-only; recorded approvals never change. Corrections are new lines.
- `DECISIONS.md`, `CHANGELOG.md` and the STATE pending block are generated; never hand-edit them.
- Times are real local times in the project's time zone.
- "Player" becomes "user"; game rules become the app's core logic; everything else is unchanged.

## Differences from `scripts/records.mjs` (Fruit Market's own)
Fruit Market keeps using its own script. app-kit adds commands that write the records (so Claude
does not hand-edit JSON), blocks delivery before approval and "verified" before all tests pass, and
does not export PDFs.

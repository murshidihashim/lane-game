# Prompt pack · app projects

Copy a prompt, replace the `<…>` parts, send it. Each one works on its own; the agent
(`app-steward`) and `CLAUDE.md` supply the rules.

## 1 · Start a new app
```
Use the app-steward agent. I want to build <one sentence: what the app does and for whom>.
Set up the project workflow with: node tools/app-kit/appkit.mjs init --app "<App name>" --owner "<My name>" --tz "<Area/City>".
Then fill APP-BRIEF.md from what I said (audience, core task, platforms, what is excluded),
list your assumptions, ask me at most three questions, and propose PLAN-001 as the smallest
version I can try on my phone. Do not build anything yet.
```

## 2 · Resume a session
```
Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation.
```

## 3 · Ask for a change
```
I'd like <what you want to see or do differently>. Why: <reason>.
Write it as a plan with acceptance tests and cost. Don't build until I approve.
```

## 4 · Approve (your exact words are recorded)
```
Approve PLAN-<###>. <Any condition, e.g. "keep it under RM20 a month".>
```
Reject or change: `Reject PLAN-<###> because <reason>.` or `Change PLAN-<###>: <what>.`

## 5 · Choose between options
```
For DEC-<###> I choose <option>. Reason: <reason>.
```

## 6 · Check the work
```
Show me the evidence for PLAN-<###>: each acceptance test with PASS / FAIL / NOT RUN and how it
was checked. Tell me what I should try myself on my phone, step by step.
```

## 7 · Report a bug
```
Build or URL:
Device and browser:
Steps I followed:
Expected result:
Actual result:
How often, and a screenshot if possible:
```

## 8 · Prepare a release
```
PREPARE RELEASE. Bump the version, write the user notes in plain English, add the release
candidate to the records, run the full checks and tell me exactly how to publish.
Do not publish.
```
After you publish: `Published <version> today.` (Claude marks it published in a new commit.)

## 9 · Checkpoint before stopping
```
CHECKPOINT. Save where we are in STATE.md (branch, commit, uncommitted files, active approval,
checks, blocker, next step), rebuild and check the records, commit and push.
```

## 10 · Planning report only
```
Write a report on <topic> with options, costs and a recommendation. This is documentation only;
it does not approve any change.
```

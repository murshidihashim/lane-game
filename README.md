# App kit template

Start every new app from this template. The owner decides; Claude plans, builds, checks and
keeps the records. The full guide is in `tools/app-kit/README.md`.

## New app in three steps
1. On this repository's page, tap **Use this template**, then **Create a new repository**. Give it the app's name.
2. Open a new Claude Code session on the new repository.
3. Send:

```
Use the app-steward agent in tools/app-kit/agent/app-steward.md.
I want to build <one sentence: what the app does and for whom>.
Run: node tools/app-kit/appkit.mjs init --app "<App name>" --owner "Murshidi" --tz "Asia/Kuala_Lumpur"
Then fill APP-BRIEF.md from what I said, list your assumptions, ask me at most three questions,
and propose PLAN-001 as the smallest version I can try on my phone. Do not build anything yet.
Replace this README with one for the app. Commit and push.
```

`init` creates `CLAUDE.md` and `.claude/agents/app-steward.md`, so every later session loads the
rules automatically. After that, use the prompts in `tools/app-kit/prompts/PROMPTS.md`.

## What's inside
| Part | File |
|---|---|
| Agent | `tools/app-kit/agent/app-steward.md` |
| Records script (Node 18+, no dependencies) | `tools/app-kit/appkit.mjs` |
| Owner prompts | `tools/app-kit/prompts/PROMPTS.md` |
| Project templates | `tools/app-kit/templates/` |

## Updating the kit
Change the files here. Apps already created from this template keep their own copy. To update
one, copy the new `tools/app-kit/` into it.

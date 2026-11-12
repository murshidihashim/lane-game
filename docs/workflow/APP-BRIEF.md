# App brief · Lane Game

Owner: Murshidi. Updated 2026-11-12. "Lane Game" is a working title; the game has no name yet.

## One sentence
A short, real-time one-on-one strategy battle for phones. You drop units from cards into three
lanes, and you command hero cards to push, defend and gank, like a MOBA. Players come back for
"one more match" because each one takes about 5 minutes and the hero tactics have depth.

## Audience
- Who: mobile players in Southeast Asia (Malaysia first) who know Clash Royale-style card battles
  and/or MOBAs like Mobile Legends. Teenagers and adults. English first.
- Where and when: on a phone, in short breaks (bus, queue, between classes), one hand, portrait.

## Core task (the loop)
1. The player starts a match against an opponent (a computer bot for now).
2. They spend a refilling resource to drop units and spells into lanes. Their hero cards stay on the
   map, and the player gives them orders: push, defend, gank, farm, retreat.
3. They win by breaking the enemy Core, or by having more towers when time runs out. Then they get
   a result screen and the option to rematch.

## Platforms and constraints
- Platforms: phone browser first (prototype). App stores (Android, iOS) later.
- Offline needed: no for the prototype (it runs in the browser). Accounts needed: not yet.
- Budget: RM0 for the prototype.

## Success looks like
- Prototype: the owner can follow three lanes on their phone, and wants to play "one more" after a
  match (PLAN-001, test T6).
- Later, in a small test: about 35–40% of new players come back the next day and about 10% after a
  week. These targets are suggestions from the research, not industry rules.

## Excluded (for now)
- Online play, accounts, progression, deck building, shop and payments, real art and sound.
- Paid random rewards (loot boxes or gacha). This is a design principle: we sell cosmetics and a
  season pass directly, and random drops can only be earned, never bought.

## Data and privacy
- Collected: nothing in the prototype. Stored where: nowhere. Deleted when: not applicable.

## Background
- Research: `docs/research/research-report.md` (notes in `docs/research/notes/`).
- Concept and screen layout: `docs/design/concept-v0.md`, `docs/design/layout-mockup.png`.
- Legal reminder: the game mechanics can be borrowed, but names, art, maps and screen layouts
  must be our own. Never use "Clash", "Royale", "Legends", "Elixir", "Lord" or "Turtle".

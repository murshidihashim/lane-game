# Clash Royale: Core Gameplay Systems, Design Philosophy, Pain Points and 2016–2026 Evolution

> Research method note (read first): In this session only Wikipedia could be fetched directly. supercell.com, support.clashroyale.com, clashroyale.fandom.com, royaleapi.com, appmagic.rocks, pocketgamer.biz, gamedeveloper.com and gamemarket.gg were blocked by the sandbox network allowlist, and the shared web-search budget ran out partway through. Many findings below therefore come from search-engine summaries of those pages, not from full-page reads. Each one is cited to the URL the search surfaced, and confidence is flagged where it matters. Numbers I know as common community knowledge but could not confirm this session are listed only under **Gaps**, marked "UNVERIFIED".

## 1. Elixir system

### Takeaway
There is one resource, Elixir. It regenerates passively up to a cap of 10 at roughly 1 point per 2.8 s, and Supercell's official rules set it on a fixed time schedule that speeds up toward the end: 1x for minutes 1–2, 2x in minute 3, 2x in overtime minute 4 and 3x in overtime minute 5. The match gets more intense without any player input, and wasting elixir at the cap ("leaking") is the main tempo mistake.

### Cited Findings
- Elixir regenerates passively up to a **maximum of 10**. — [Wikipedia: Clash Royale](https://en.wikipedia.org/wiki/Clash_Royale)
- The official Supercell support page lists the multipliers by minute. **Battle:** 1st minute x1, 2nd minute x1, 3rd minute x2. **Overtime:** 4th minute x2, 5th minute x3. It says the rate "will increase as a battle continues". Read via a search summary only; the page was not fetched. — [Supercell Support: Elixir](https://support.clashroyale.com/hc/en-us/articles/49484936933403-Elixir)
- Wikipedia agrees: elixir generation "doubles during the final minute" of the 3-minute regulation, and is "tripled in the final minute of overtime". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- Regeneration timing: **1x ≈ 1 elixir / 2.8 s; 2x ≈ 1 / 1.4 s; 3x ≈ 1 / 0.9 s** (2.8 / 3 = 0.93). Fan sources give these figures and they match the official multipliers. — [West Games cycle-time calculator](https://west-games.com/clash-royale-cycle-time-calculator/); 0.9 s for triple also cited on [Wikipedia Talk:Clash Royale](https://wikipedia.com/wiki/Talk:Clash_Royale). One other fan guide surfaced in search claimed 0.7 s for triple, which does not match a 3x multiplier; treat it as an outlier.
- "Double Elixir" and "Triple Elixir" are also used as whole-match rule sets in rotating challenges and events (e.g. Triple Elixir Challenge, Double Elixir Draft). — [Sportskeeda: Triple Elixir Challenge](https://www.sportskeeda.com/esports/triple-elixir-challenge-clash-royale-information-rewards); [Supercell: Double Elixir Draft Challenge](https://supercell.com/en/games/clashroyale/blog/news/double-elixir-draft-challenge)
- In Merge Tactics (2025), elixir is a between-round shop currency: each merge gives +1 Elixir, and some "Rulers" change elixir income. The Royal King gives 4 elixir after a lost round; the Spirit Empress gives more elixir per merge. — [GamingOnPhone Merge Tactics guide](https://gamingonphone.com/guides/clash-royale-a-complete-guide-to-the-merge-tactics-game-mode); [Sportskeeda Merge Tactics phases](https://hindi3.sportskeeda.com/mobile-games/clash-royale-merge-tactics-game-mode-phases-mode-progression)

### Inferences
- A single regenerating, capped, visible resource turns every decision into "is this trade worth X elixir?" Both players can track the opponent's spending, so "elixir counting" is a learnable skill ceiling built on a very simple rule.
- The cap of 10 punishes passivity: a player who sits on full elixir loses tempo. This keeps both players acting at least every ~28 s at 1x (10 × 2.8 s), and much more often in practice.
- The fixed-schedule multipliers act as a built-in "late game" that speeds up the match and breaks stalemates without extra systems. A 3-lane hybrid could reuse time-phased income in place of, or alongside, MOBA-style gold/XP scaling.
- Abilities that cost elixir (Champions; see Section 5) put card spend and ability spend on one budget. This is the clearest existing precedent for "MOBA actives paid from the card-deployment resource".

### Gaps
- **Starting elixir**: commonly cited as 5 in 1v1 ladder. UNVERIFIED this session (official and wiki pages blocked).
- **Elixir-leak definition and penalties**: no official text retrieved. The community meaning is elixir wasted while sitting at the 10 cap.
- **History of the overtime/elixir schedule** (e.g. whether overtime was once 1 minute, or when triple elixir in overtime was added): not confirmed. Do not assume the 2026 schedule applied at launch.
- **2v2 elixir rules** (per-player pools, any modifier): not retrieved.

## 2. Deck and hand

### Takeaway
The deck has 8 cards and 4 are in hand at once. Cards cycle through a queue, so the 8-card deck is effectively a rotation in which a played card returns after the other cards have been played. Average elixir cost is the standard deck metric that separates fast "cycle" decks from heavy "beatdown" decks.

### Cited Findings
- Each player brings a **deck of eight cards, with four in hand at a time**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- Since 2023–2025 the deck screen has had **special slots**. An Evolution slot holds an evolved card; a card with an Evolution unlocked loses its evolution perks outside that slot. — [MobileMatters: Card Evolution guide](https://mobilematters.gg/clash-royale/clash-royale-card-evolution-guide)
- In **December 2025** Evolution slot unlocks moved from King Level to Arena progress: first slot at **Arena 3**, second at **Arena 10**. Hero/Champion slots: first at **Arena 15**, second at **Arena 25**. Heroes and Champions share these "golden" slots. — [Supercell: December Update 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/december-update-2025/) (via search summary); [Sportskeeda: December Update 2025 Heroes explained](https://www.sportskeeda.com/mobile-games/clash-royale-december-update-2025-heroes-explained)
- Before December 2025, guides said the first Evolution slot unlocked at **King Level 7** and the second at **King Level 54**. This is OLDER behaviour, superseded in Dec 2025. — [MobileMatters Evolution guide](https://mobilematters.gg/clash-royale/clash-royale-card-evolution-guide)
- **Only one Champion** may be in a deck. — [Clash Royale Wiki: Champion Cards](https://clashroyale.fandom.com/wiki/Category:Champion_Cards) (via search summary)
- A "cycle time calculator" exists for working out how fast a deck returns to a given card, which shows that cycle speed is a commonly analysed deck property. — [West Games cycle-time calculator](https://west-games.com/clash-royale-cycle-time-calculator/)

### Inferences
- 8 cards / 4 in hand gives a small, readable decision space (4 options) on a phone, with enough deck variety for identity and counter-play. Because the 4 visible cards rotate, the order in which you play cards is itself a decision ("cycling" to reach a win condition faster).
- Special slots (Evo/Hero/Champion) cap how many "power" cards a deck carries, so the deck stays mostly vanilla. That is useful if a hybrid adds MOBA-hero-like units to an otherwise card-based deck.

### Gaps
- **Next-card preview** (the single upcoming card shown beside the hand): widely known UI feature, but no source retrieved. UNVERIFIED.
- **Exact cycling rule** (a played card goes to the back of an 8-card queue; the next card in queue enters the hand): standard community understanding, UNVERIFIED this session.
- **Typical average-elixir ranges** (community rule of thumb: about 2.6–3.0 for cycle decks, about 4+ for beatdown): UNVERIFIED. RoyaleAPI/Deckshop stats pages were blocked.
- A third-party guide surfaced in search claims the **March 2026** update cut special slots from four to three in Trophy Road, Ranked and challenges (one Evolution, one Hero, one "wild" slot). I could not identify or verify the source; treat as unconfirmed.

## 3. Arena and deployment

### Takeaway
The arena is a portrait-oriented tile grid, commonly cited as **18 × 32 tiles**. A river splits it, with two bridges, so there are **two lanes**. You can deploy only on your own half until you destroy an enemy Princess Tower; then your deploy zone extends partway into the enemy half on that side. Controls are drag-a-card-onto-the-board, with all controls in the lower half of the screen for one-thumb play.

### Cited Findings
- The field is "the **18×32 tile arena**"; the river splits it and crossing is possible only over the **left and right bridges**. Low-authority source; the dimension is corroborated only by a GitHub project that models "an 18 x 32 tile grid, like Clash Royale's arena". — [Metagamenation arena-layout guide](https://metagamenation.com/clash-royale-field-master-the-arena-layout-and-dominate-every-battle-in-2026/); [GitHub earl-gh/kalyeah PR #214](https://github.com/earl-gh/kalyeah/pull/214)
- Each player has one King Tower and two Princess Towers, and a river divides the arena into two halves. — [Wikipedia (mirror)](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Clash_Royale)
- Before a Princess Tower falls, you can place cards only on your half. Destroying an opposing tower expands the placement area "partially to the opponent's side of the arena". — [Metagamenation](https://metagamenation.com/clash-royale-field-master-the-arena-layout-and-dominate-every-battle-in-2026/) (via search summary)
- A common play after an enemy Princess Tower falls is to drop a Princess deep in the expanded zone so she can reach the next tower sooner, at the cost of exposure. This shows that the expanded zone has strategic value. — [Theria Games: Princess guide](https://theriagames.com/guide/clash-royale-princess-guide/)
- Clash Royale was designed for **vertical phone screens**, unlike Clash of Clans, which was built for tablets. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- UX analysis (not Supercell): key controls are "within reach when using a phone with one hand", all in the lower half of the screen. — [Maciej Górnicki, "UX in Clash Royale – Part 1"](https://www.gornicki.me/blog/90l/ux-in-clash-royale-part-1)
- Since 2016 the game has also shipped on PC: PC release dated **22 Oct 2023**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)

### Inferences
- Two lanes are the minimum that creates a "which side?" decision (split pressure, opposite-lane punishes) while keeping the map readable in portrait. A 3-lane design on portrait would make each lane about one-third narrower, or would need a wider grid or landscape orientation. That is a real readability and fat-finger risk.
- The deploy-zone expansion on tower kill is a clean territorial reward: it grants positional advantage, not stats. It maps naturally onto MOBA "tower falls → lane pushes forward".
- The bridges act as chokepoints that make troop paths predictable. That predictability matters because players don't steer units (see Section 6).

### Gaps
- **Exact grid dimensions, tower footprints, river width, bridge width/positions, exact deploy-zone shape after a tower falls**: authoritative wiki/official pages were blocked. 18×32 is widely repeated but here rests on low-authority sources.
- **Drag-to-deploy specifics** (tap-then-tap vs drag, placement preview, deploy delay of about 1 s): commonly known, UNVERIFIED this session.
- **Spells can be cast anywhere on the map** (not limited to the deploy zone): standard rule, UNVERIFIED this session.

## 4. Towers and win conditions

### Takeaway
Each side has three towers: one King Tower and two Princess Towers (Crown Towers). Destroying the King Tower is an instant 3-crown win. Otherwise, whoever has more crowns after 3 minutes wins. A tie goes to overtime, where the next tower destroyed wins (sudden death, 2 minutes). If overtime also ends level, the player whose weakest tower has the lowest HP loses. The King Tower stays dormant until a Princess Tower falls or the King is damaged, which creates "King activation" as a tactic.

### Cited Findings
- **Regulation 3 minutes.** If crowns are tied, the match goes to **overtime, where the first tower destroyed wins**. If no tower falls within **two minutes of overtime**, a tiebreaker applies: "the player whose remaining tower has the lowest health loses". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- King Tower: "If it is destroyed, you lose immediately". — [Clasher.us: King's Tower](https://clasher.us/clash-royale/card/Kings_Tower)
- **King activation:** the King Tower becomes active after a Princess Tower is destroyed or once the King Tower has taken damage. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) (via search summary)
- After activation, the King's cannon takes **3.3 s to aim** at a target and another **0.7 s** before its first shot, about 4 s in total. — [Clash Royale Wiki: King's Tower](https://clashroyale.fandom.com/wiki/King's_Tower) (via search summary)
- Players deliberately activate the opponent's King early (bad for them) by pulling troops into its range, e.g. with Tornado. — [Clash Royale Wiki user blog: Tornado placement for King activation](https://clashroyale.fandom.com/wiki/User_blog:GrandWiz05/Tornado_Placement_for_King_Tower_Activation)
- King range: reduced from **8 to 7 tiles in May 2016** (effective range unchanged). In **June 2018** King damage was raised to equal Princess Tower damage. OLDER changes, still informative. — [Clasher.us: King's Tower](https://clasher.us/clash-royale/card/Kings_Tower)
- Princess Towers have **0.5 tiles longer range** and a **0.2 s faster hit speed** than the King Tower. — [Clasher.us: Princess Towers](https://clasher.us/clash-royale/card/Princess_Towers); [Clash Royale Wiki: Tower Princess](https://clashroyale.fandom.com/wiki/Tower_Princess)
- Older (2016-era) per-level scaling: King Tower HP and damage rise by about 7% and 8% per level up to level 9. — [Clasher.us: King's Tower](https://clasher.us/clash-royale/card/Kings_Tower)
- **Tower Troops (Dec 2023 onward):** the Princess Tower became a "Tower Princess" card that can be swapped for alternative tower troops. **Cannoneer (January 2024)** was the first alternative. Tower Princess range is listed as **7.5 tiles**. — [cr-api / RoyaleAPI blog: Cannoneer, the new Tower Troop](https://cr-api.com/blog/cannoneer-january-2024); [Clash Royale Wiki: Tower Princess](https://clashroyale.fandom.com/wiki/Tower_Princess)
- **King Level** (player account level) "affects their towers' strength". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)

### Inferences
- Three towers per side give a simple scoreboard (0–3 crowns) that anyone can read at a glance. The instant-win King kill keeps comebacks possible even when crowns are behind.
- The dormant-King mechanic adds risk and reward to near-tower plays without new UI. A MOBA hybrid's "core/nexus" could borrow it: inactive until a lane tower falls or it is hit directly.
- Swappable Tower Troops show that "defensive structure loadout" can be a customisation layer separate from the deck.
- Tower stats scale with account level, so level gaps hit both offence (cards) and defence (towers). That is one root of the pay-to-win complaints (Section 7).

### Gaps
- **Current tower HP/damage values** (often-quoted Tournament Standard level 11 values: Princess 3,052 HP, King 4,824 HP; current Level 15/16 values unknown): UNVERIFIED. The search did not confirm these, and stat pages were blocked.
- **History of overtime length** (originally 1 minute? when changed?): not confirmed.
- **Current list of Tower Troops after Cannoneer** (e.g. Dagger Duchess, Royal Chef): names appear in 2025 sources but their tower-troop role and dates were not verified.

## 5. Card types and roles, Champions, Evolutions, Heroes, game modes

### Takeaway
Cards fall into three types: troops, spells and buildings. Rarities expanded from Common/Rare/Epic (soft launch, 42 cards) to Legendary (global launch, 2016) and Champion (Oct 2021). The two big mechanical layers added since are **Card Evolutions (June 2023)**, upgraded versions of existing cards placed in a special slot, and **Heroes (December 2025)**, existing cards upgraded with a player-triggered ability button, like Champions. In **August 2026** all Hero and Champion abilities became **single-use per deployment** (no cooldowns). New modes include co-op 2v2, Ranked 2v2 (limited-time), and **Merge Tactics** (a 4-player auto-battler, permanent from July 2025).

### Cited Findings
**Rarities**
- The soft launch had "42 cards across three rarities: Common, Rare and Epic"; the global launch added Legendary. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Champion** rarity added **October 2021**. Champions "have powerful special abilities that can be activated by the player during battles". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)

**Champions**
- One Champion per deck. Activating its ability **costs Elixir**, and the ability then goes on **cooldown** (rule as of 2021–mid 2026). — [Clash Royale Wiki: Champion Cards](https://clashroyale.fandom.com/wiki/Category:Champion_Cards) (via search summary)
- **October 2025:** "only the most-recently placed Champion possesses an ability", and ability cooldowns reset as each new Champion is placed. — [Supercell: October Update 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/october-update-2025) (via search summary)

**Card Evolutions (June 2023 →)**
- Card Evolutions were introduced in **June 2023**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale); [RoyaleAPI: Card Evolution – 2023 Summer Update](https://www.RoyaleAPI.com/blog/card-evolution-2023-q2-update)
- An Evolution works only from an Evolution slot. Unlocking one costs **6 Evolution Shards** for that card (Wild Shards can substitute). — [MobileMatters Evolution guide](https://mobilematters.gg/clash-royale/clash-royale-card-evolution-guide)
- Evolutions keep being added. Example: the **August 2026** (Season 86, "K.H.A.O.S") Elite Barbarians Evolution adds "Rage Spears", which let the two Barbarians attack from range before reaching melee. — [GamingOnPhone: Season 86 update](https://gamingonphone.com/news/clash-royale-season-86-k-h-a-o-s-august-2026-update-and-balance-changes/)

**Heroes (December 2025 →)**
- Wikipedia: "Heroes were added in December 2025; these are updated versions of old cards that have special abilities similar to Champions." — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- RoyaleAPI described them as the "2025 Q4 Hero Update" (Nov 2025 announcement). — [RoyaleAPI: 2025 Q4 Hero Update](https://royaleapi.com/blog/2025-q4-update-november-2025?lang=en)
- Launch Heroes: **Mini P.E.K.K.A** (ability "Breakfast Boost": stacks up to 5 pancakes, giving up to +5 levels), **Musketeer** ("Trusty Turret"), **Knight** ("Triumphant Taunt") and **Giant** ("Heroic Hurl"). Each Hero has an **ability button** usable in battle and must sit in a golden slot. Unlike Evolutions, the Hero ability is available every time the card is played. — [Sportskeeda: December Update 2025 Heroes explained](https://www.sportskeeda.com/mobile-games/clash-royale-december-update-2025-heroes-explained); [Supercell: December Update 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/december-update-2025/)
- Unlocking: at launch, a random Hero for **200 Hero Fragments**. **Mid-March 2026:** fragments were renamed **Hero Coins** and players **choose** which Hero to unlock. Players at Arena 5+ received 200 Hero Coins. New Heroes: **Barbarian Barrel** and **Magic Archer**. — [Supercell: Mid-March Update](https://supercell.com/en/games/clashroyale/blog/news/mid-march-update/); [RoyaleAPI: 2026 Mid-March Update](https://royaleapi.com/blog/2026-q1a-update-mid-march-2026); [MobileMatters: Hero Coins](https://mobilematters.gg/news/clash-royale/hero-coins-system-update)
- **Season 86 (from 3 Aug 2026):** Hero Berserker and Hero Valkyrie added. "Every Hero and Champion ability ... is **single-use per deployment** — cooldowns are gone", except **Boss Bandit**. One guide dates the balance update to **4 Aug 2026**, so the exact day is unconfirmed. Secondary sources only; no official page was read. — [GamingOnPhone: Season 86](https://gamingonphone.com/news/clash-royale-season-86-k-h-a-o-s-august-2026-update-and-balance-changes/); [TrophyCoach: Single-Use Abilities Explained](https://trophycoach.com/guides/single-use-abilities-explained); [GameMarket: single-use abilities](https://gamemarket.gg/news/clash-royale/clash-royale-single-use-abilities-what-changed-and-who-gains)

**Modes**
- Co-op **2v2** with friends or random partners. **Ranked 2v2** ran as a limited-time mode in **Nov 2024** and briefly returned in **Feb 2025**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Ranked** (top competitive ladder) has **seven leagues**, the highest being **Ultimate Champion**. **Challenges** reward wins "before three losses". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Clan Wars** launched **April 2018**; replaced by **Clan Wars 2** in **Aug 2020**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Merge Tactics:** a **4-player**, turn-based auto-battler using Clash Royale troops. Players pick, deploy and merge troops that then fight on their own. Each match starts with a **Ruler** choice. Troops have **Traits**, and each game has **one random modifier**. It shares the main game's card progression. Released in the June/July 2025 update (Season 73) and **permanent from July 2025**. Seasons lengthened to **6–7 weeks from Merge Tactics Season 7**. The Dec 2025 update added the **Battle Machine** Ruler plus new troops, traits and modifiers. — [Supercell: New game mode Merge Tactics](https://supercell.com/en/games/clashroyale/blog/release-notes/new-game-mode-merge-tactics/); [RoyaleAPI: Merge Tactics July 2025](https://royaleapi.com/blog/merge-tactics-2025-july); [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale); [GamingOnPhone: Merge Tactics Season 7](https://gamingonphone.com/news/clash-royale-merge-tactics-season-7-update-new-structure-party-mode-dagger-duchess-equipment-modifiers-and-more); [MobileMatters: Merge Tactics Dec 2025](https://mobilematters.gg/news/clash-royale/merge-tactics-december-2025-update)

### Dated mechanics timeline (state as of Nov 2026; older items marked)
- Jan 2016 soft launch: Common/Rare/Epic, 42 cards → Mar 2016 global: + Legendary ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- May 2016: King range 8 → 7 (OLDER) ([Clasher.us](https://clasher.us/clash-royale/card/Kings_Tower))
- Apr 2018: Clan Wars → Aug 2020: Clan Wars 2 ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Jun 2018: King damage equalised with Princess Towers (OLDER) ([Clasher.us](https://clasher.us/clash-royale/card/Kings_Tower))
- Jul 2019: monthly seasons + Pass Royale ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Oct 2021: Champions (elixir-cost ability + cooldown; cooldown model REPLACED Aug 2026) ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Jun 2023: Card Evolutions ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Dec 2023 / Jan 2024: Tower Troops (Tower Princess; Cannoneer) ([cr-api](https://cr-api.com/blog/cannoneer-january-2024))
- Apr 2025: chest timers removed → "lucky drop" gacha rewards ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Jul 2025: Merge Tactics permanent ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale))
- Oct 2025: only the latest-placed Champion has an ability ([Supercell Oct 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/october-update-2025))
- Nov 2025: Level 16 card cap (reported 24 Nov 2025; low-quality source) ([Mediosick](https://www.mediosick.com/blog/news-5/clash-royales-level-16-update-bigger-upgrades-bigger-backlash-74))
- Dec 2025: Heroes; Arena-based Evo/Hero slot unlocks ([Supercell Dec 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/december-update-2025/))
- Mar 2026: Hero Coins and choosable Heroes ([Supercell Mid-March](https://supercell.com/en/games/clashroyale/blog/news/mid-march-update/))
- Aug 2026 (Season 86): Hero/Champion abilities single-use per deployment ([GamingOnPhone](https://gamingonphone.com/news/clash-royale-season-86-k-h-a-o-s-august-2026-update-and-balance-changes/))

### Inferences
- Clash Royale's direction from 2021 to 2026 is to add **player-triggered actives** on top of the "what and where" core: first Champions, then Heroes. That is a move toward MOBA-style hero agency inside a card game, which directly supports the planned hybrid concept.
- The **August 2026 move from cooldowns to single-use per deployment** suggests Supercell found cooldown tracking on a phone too much (extra micro, more UI attention, snowballing). A hybrid with manually triggered abilities should test "one charge per deploy" against cooldown-based actives early.
- Evolutions and Heroes both reuse existing cards, which avoids new learning while adding power and variety. That is cheap content and a monetisation hook, but it also stacks power layers (Section 7).
- Merge Tactics shows Supercell keeping the same unit roster and progression across a second, slower-paced mode to add "daily touchpoints". AppMagic credits this for part of the 2025 revenue rebound (Section 7).

### Gaps
- **Role taxonomy** (win condition, tank, mini-tank, support, splash, swarm, anti-air, spell "small/big", building "defensive/spawner"): standard community vocabulary. No authoritative page retrieved; treat as community convention.
- **Air vs ground targeting rules** (which troops hit air; flying troops ignore river/bridges): standard knowledge, UNVERIFIED.
- **Current card count** (about 120+ cards by 2025–26), **Hero elixir/ability costs**, and **Evolution "cycle" mechanics** (an evolved card activates its evolved form only every Nth play): not retrieved. UNVERIFIED.
- Whether **Champions' abilities still cost elixir** after the Aug 2026 single-use change was not confirmed.
- Which source said **special slots were cut from 4 to 3 in March 2026**: unidentified; see Section 2.

## 6. Unit AI and targeting rules

### Takeaway
Players choose only **what** to deploy and **where**. Units then walk toward the nearest enemy tower via the bridges and fight automatically under fixed targeting rules. "Buildings-only" win-condition troops (e.g. Giant, Golem) ignore troops and go for structures, and that rule is what makes "pulling" with defensive buildings a core skill. This session's sourcing on targeting is thin; most detailed rules below are UNVERIFIED.

### Cited Findings
- The King Tower counts as a building, so building-targeting troops go after it. If two buildings are placed in front of the King, a building-targeting troop such as a Golem or Giant targets the King's Tower after destroying those two buildings. — [Clash Royale Wiki: King's Tower](https://clashroyale.fandom.com/wiki/King's_Tower) (via search summary)
- Tornado is the standard tool for pulling troops into a tower's range. Displacement spells are therefore a deliberate way to manipulate the AI. — [Clash Royale Wiki user blog: Tornado placement](https://clashroyale.fandom.com/wiki/User_blog:GrandWiz05/Tornado_Placement_for_King_Tower_Activation)
- Some ranged units are largely unaffected by King activation because they never enter its range. Unit range relative to tower range is a design lever. — [Theria Games: King Tower guide](https://theriagames.com/guide/clash-royale-king-tower/) (via search summary)
- Princess Towers automatically engage enemy troops and buildings within their attack range. — [Clash Royale Wiki: Tower Princess](https://clashroyale.fandom.com/wiki/Tower_Princess) (via search summary)
- The Aug 2026 Elite Barbarians Evolution ("Rage Spears") changes how a unit engages: it attacks at range before closing to melee. Evolutions often work by changing a unit's AI or attack pattern. — [GamingOnPhone: Season 86](https://gamingonphone.com/news/clash-royale-season-86-k-h-a-o-s-august-2026-update-and-balance-changes/)

### Inferences
- Because players can't steer units, **counter-play happens through placement**: where you drop a unit decides what it aggroes first, which bridge it uses, and how long it spends walking (and so how long towers can shoot it). Deterministic, learnable targeting rules are what make this work. A hybrid that lets players steer heroes must decide which units stay "autonomous" so the card layer keeps its placement-skill identity.
- "Pulling" (placing a building or unit to divert attackers into a kill zone) is the emergent skill that comes from simple rules. Keep targeting rules few and readable so these tricks can emerge.

### Gaps (all UNVERIFIED this session — wiki "Targeting" and per-card pages were blocked and search budget ran out)
- Default rule: troops target the **nearest valid target** (by their targeting type: ground/air/buildings-only) within a sight radius. Otherwise they walk toward the nearest enemy tower via the closest bridge.
- **Lock-on / retargeting**: melee and most ranged troops keep attacking their current target until it dies or leaves range, then retarget. Exact retarget delays and "reset" effects (stun/zap resets of charge-up attacks) were not confirmed.
- **Building placement "pull" radius** and lane-switching behaviour when a building sits in the centre: community-documented, not confirmed here.
- **Flying units** ignore the river; **jumping units** (Hog Rider, Royal Hogs) leap the river. Known community facts, UNVERIFIED.
- No Supercell developer statement on targeting design philosophy was found.

## 7. Progression and monetization, including 2024–2026 revenue

### Takeaway
Card levels raise stats, and account/King Level raises tower strength. That is the source of the long-running "pay-to-win" and level-gap criticism. From 2023 to 2026, Supercell overhauled rewards. Chest timers were removed in **April 2025** in favour of "lucky drop" gacha. A **Level 16** cap arrived in **Nov 2025** and drew a strong backlash; Supercell later admitted misjudging reactions and reportedly promised (June 2026) not to add more levels. Revenue went from a 2024–early-2025 low to a strong **2025 resurgence**, with peak months in Sept/Oct 2025 and an all-time single-day record, driven by the June/July 2025 update, Merge Tactics and creator/streamer attention.

### Cited Findings
**Progression systems**
- Cards are upgraded with in-game currency, which "increases its effectiveness". Upgrading also raises **King Level**, which affects tower strength. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- Trophy-based progression runs through themed **arenas**; competitive Ranked has **seven leagues** (top: Ultimate Champion). — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Level 16** added (reported **24 Nov 2025**). Veterans were upset that it devalued recent upgrade progress. The same source lists removal of **Books, Elite Wild Cards and Magic Coins** as economy changes; low-quality source, treat with caution. — [Mediosick](https://www.mediosick.com/blog/news-5/clash-royales-level-16-update-bigger-upgrades-bigger-backlash-74)
- Supercell's stated reason for Level 16: highly progressed players were reaching the end of upgrades and losing interest. Supercell "admitted it badly misjudged" reactions to several changes, including **removing the Season Shop**, and now involves creators and community members in development. It reportedly made a **June 2026 promise not to add more card levels**. Secondary source; not verified against official posts. — [Shane the Gamer](https://www.shanethegamer.com/esports-news/clash-royale-update-backlash-supercell/)
- Earlier, Supercell changed **Elite Wild Card** conversion rates after complaints that the old rates were unfair (date not confirmed). — [Sportskeeda](https://www.sportskeeda.com/esports/clash-royale-alters-card-conversion-rate-following-community-backlash-release-date-major-changes)

**Rewards and passes**
- Rewards originally came in chests that "could only be opened once the chest timer finished". **Chest timers were removed in April 2025** in favour of "gacha lucky drop style mechanics". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Pass Royale** (battle pass) introduced **July 2019**, alongside monthly seasons. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Banner Tokens** were retired in the April (2025) update. — [Sportskeeda](https://www.sportskeeda.com/mobile-games/news-supercell-removing-clash-royale-banner-tokens)
- **Trade Tokens** reportedly stopped being obtainable around **October 2025** (secondary source). — [Timesaver.gg](https://timesaver.gg/blog/clash-royale-trade-tokens-removed-trading-dead)

**Criticism**
- Reviewers questioned whether the game is "pay to win", especially at high-level competitive play. One called the monetization "greedy"; another likened it to "shaking you down for change". Matchmaking "garnered mixed reactions". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Feb 2026:** CEO Ilkka Paananen apologised after a Supercell blog post failed to credit streamers such as **Jynxzi** for the game's resurgence. He said the omission "runs counter to everything I believe about the impact creators have on our games". — [Dexerto](https://www.dexerto.com/gaming/clash-royale-ceo-apologizes-after-failing-to-credit-jynxzi-3318282/); [NextBigGames, 13 Feb 2026](https://nextbiggames.com/2026/02/13/supercell-clash-royale-controversy-apology/)

**Revenue (third-party estimates; figures conflict, see notes)**
- Lifetime: >US$1B in its first year; about US$2.5B by its third anniversary (2019); **US$4B by 2023 (Sensor Tower)**; **US$4.9B by its 10th anniversary (March 2026)**. **Oct 2025: US$78M**, "one of its best performing months since release". 2025 was "the game's best performing year since 2017". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- AppMagic: monthly revenue fell to about **$12M in Feb 2025**, then rose to a **$67.8M peak in Sept 2025 (5.7x)**. AppMagic credits **reduced reward inflation, healthier gameplay balance, and new daily touchpoints from fresh modes**. — [AppMagic blog: "How Supercell Made 5.7x Revenue for Clash Royale"](https://appmagic.rocks/blog/ClashRoyale-Comeback) (via search summary)
- **June 2025: $51.4M**, up 127% YoY, the best month since Dec 2021. **Post-pandemic daily record of $3.8M** after Merge Tactics launched. — [PocketGamer.biz](https://www.pocketgamer.biz/clash-royale-hits-post-pandemic-record-of-38m-daily-revenue-with-new-mode-merge-tactics/) (via search summary)
- **Sept 2025: all-time single-day record of $6.6M**, beating the previous record of $4.9M (AppMagic). — [Mobidictum](https://mobidictum.com/clash-royale-all-time-single-day-revenue-high-6m/)
- **CONFLICT on Sept 2025 monthly figure:** AppMagic's own blog says $67.8M (per search summary), while a PocketGamer.biz report citing AppMagic gives **$98.4M**. This may be gross vs net, or a later revision; unresolved.
- **CONFLICT on 2025 annual figure:** aggregator sites citing AppMagic give about **$646.8M (2025) vs $202M (2024), +149%** — [SQ Magazine](https://sqmagazine.co.uk/clash-royale-statistics/) / [BriefLedger](https://briefledger.co.uk/clash-royale-player-count/). Udonis, also citing AppMagic, gives about **$487M (2025) vs $193M (2024)** and about $3.6B lifetime — [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-royale-player-count). Icon Era cites >$4.9B lifetime player spending — [Icon Era](https://icon-era.com/statistics/clash-royale-player-count/). Either way, 2025 revenue was **more than double 2024's**.

### Inferences
- The main pain point for a card-PvP hybrid to avoid is **stat-affecting upgrades plus open-ended level caps**. Every cap raise (to Level 16 in 2025) resets the "maxed" goal and widens level gaps in matchmaking. The Level 16 backlash and Supercell's reported "no more levels" promise suggest even the genre leader now treats cap increases as costly.
- The 2025 rebound suggests that **less reward inflation**, **removing timer friction** (chest timers) and **adding a second mode on the same progression** (Merge Tactics) can revive an old live game. Streamer/creator visibility (Jynxzi) was a major acknowledged factor.
- Monetisation has moved toward **cosmetic/structural layers** (Evolutions, Heroes, Tower Troops, pass tiers) on top of levels. Each new power layer, though, adds a new pay-to-win surface.

### Gaps
- **Level-cap history** (when Level 14 and Level 15 were introduced; Elite Wild Card introduction date; "card levels standardised" change): not retrieved. UNVERIFIED.
- **Matchmaking details** (trophy-based ± level-based; "Path of Legends" naming and its replacement by "Ranked"): Wikipedia confirms seven Ranked leagues but not the history.
- **Lucky Drop mechanics** (rarity tiers, odds): not retrieved.
- **Pass Royale tiers/pricing in 2026**: not retrieved.
- **Sensor Tower 2025–2026 figures**: none found. All 2025 figures are AppMagic-derived estimates via secondary outlets.
- **2026 revenue trend** (whether the 2025 rebound held after the Level 16 backlash): no 2026 data found beyond the March 2026 lifetime total.

## 8. Match structure numbers (session length, matches per session, why 3 minutes)

### Takeaway
A regulation match lasts 3 minutes, plus up to 2 minutes of sudden-death overtime (about 5 minutes maximum). Reviewers praised the short length and fast pace as suited to mobile. No developer source or public telemetry was found on session length, matches per session, or the specific reasoning behind 3 minutes.

### Cited Findings
- Matches last up to **3 minutes** of regulation, plus up to **2 minutes** of overtime. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- Reviewers praised the battles as "accessible and intuitive, but hiding a surprising depth of strategy", and "their short length and fast pace were also praised". They also praised how Supercell "simplified these disparate elements to create a game well-suited for mobile". — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- Challenges use a "wins before three losses" session structure, which bounds a play session by results rather than time. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)

### Inferences
- 3 + 2 minutes fits a commute/queue-length session and makes a loss cheap emotionally ("one more game"). The time-phased elixir multipliers mean the last minute is always the most intense, so even short matches have a climax.
- For a 3-lane MOBA hybrid, standard MOBA match lengths (20–40 min) would break this mobile fit. Clash Royale's evidence points toward a hard cap of about 5 minutes with escalating income and a sudden-death tiebreaker.

### Gaps
- **Typical session length and matches per session**: no public Supercell or app-intelligence figure found. Do not cite any number.
- **Developer rationale for exactly 3 minutes**: no interview or talk retrieved that states it.

## 9. Design commentary, origin and esports

### Takeaway
Clash Royale grew out of an abandoned pre-2012 Supercell prototype called **"The Summoners"**. Production started in **2014** under the working title **"Wizard Arena"**, aimed at phone screens and real-time play. It soft-launched in Jan 2016 and launched globally on 2 Mar 2016. Developer commentary found here stresses a small-team, intuition-led approach ("Minimum Awesome Product"; card balancing led more by design intuition than metrics). No source confirmed the often-claimed Warcraft III custom-map inspiration. Esports grew from 2016 events into the Clash Royale League (2018–), with record 2025 World Finals viewership.

### Cited Findings
**Origin and development**
- Clash Royale was "heavily based upon an internal prototype called **The Summoners**", developed before Clash of Clans' 2012 launch, per CEO Ilkka Paananen's BAFTA Games lecture. — [PocketGamer.biz](https://www.pocketgamer.biz/clash-royale-based-on-a-pre-clans-prototype/) (via search summary)
- Development began in **2014**. Working title **"Wizard Arena"**. It was designed for phone screens rather than tablets, with real-time gameplay in contrast to Clash of Clans. Soft launch on iOS **4 Jan 2016**, Android **16 Feb 2016**; global release **2 Mar 2016**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Warcraft III / tower-defense lineage:** no source found that ties Clash Royale's design to a WC3 custom map or that quotes developers citing one. Coverage at launch described it as a "multiplayer tower defense card game". — [Android Police, 2 Mar 2016](https://www.androidpolice.com/2016/03/02/clash-royale-a-multiplayer-tower-defense-card-game-from-the-makers-of-clash-of-clans-gets-a-worldwide-release/)

**Design philosophy and commentary**
- A Game Developer analysis describes the gameplay and systems design as a **"Minimum Awesome Product"** approach tied to rapid iteration with a small team. This came via search summary, and I could not confirm which of two Game Developer articles it is from. — [Game Developer: Breaking Down Supercell's Next Hit](https://www.gamedeveloper.com/design/breaking-down-supercell-s-next-hit-clash-royale) / [Game Developer: Deconstructing Supercell's Next Billion Dollar Game](https://www.gamedeveloper.com/design/clash-royale---deconstructing-supercell-s-next-billion-dollar-game)
- Card-balance designer **Stefan Engblom** "leans less on metrics, more on design intuition". Quote: "We don't really have a process." — [Game Developer interview](https://www.gamedeveloper.com/design/-i-clash-royale-i-s-card-balancing-guru-leans-less-on-metrics-more-on-design-intuition)
- Supercell's company-wide principle is to "just design something great, something that users love", rather than focusing on revenue. — [Wikipedia: Supercell](https://en.wikipedia.org/wiki/Supercell_(company)) (via search summary)
- Supercell reportedly now involves creators and community members in development after misjudging reactions to its 2025 changes. — [Shane the Gamer](https://www.shanethegamer.com/esports-news/clash-royale-update-backlash-supercell/)

**Esports**
- First official tournament: Helsinki, **March 2016**. **King's Cup**: Nov 2016. First world championship, the **Crown Championship**: **3 Dec 2017**, London, with a **$150,000** top prize. The 2017 qualifier drew **27 million** players. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Clash Royale League (CRL)** established **Aug 2018**, replacing the Crown Championship. It switched from **team-based to individual** play in **2021**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- CRL World Finals peak concurrent viewership: **>140,000 (2024)** and **>698,000 (2025)**. 2025 World Finals: **$500,000** prize pool, won by **Mohamed Light**. — [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)

### Inferences
- The core idea (summon units that auto-fight toward enemy structures) dates back to Supercell's earliest prototypes. Shipping it took a phone-first rethink (portrait, short real-time matches) and a lot of simplification. Reviewers named that simplification as the reason it suits mobile.
- The roughly 5x jump in peak World Finals viewership between 2024 and 2025 matches the 2025 revenue resurgence and creator-driven attention. Esports and streaming visibility look like both a cause and a result of the comeback.
- Supercell's intuition-led balancing suggests a hybrid team should invest in fast iteration and playtesting tools as much as analytics.

### Gaps
- **GDC Vault talks** on Clash Royale (e.g. on balancing or design): Engblom's balancing talk was referenced in passing, but no title, year or content was retrieved. GDC Vault and Game Developer pages were blocked.
- **What was cut during development** (features dropped between The Summoners / Wizard Arena and launch): no source retrieved.
- **Original design team / game lead names and their stated rationale** for portrait, 2 lanes, 8-card decks and 3-minute matches: not found.
- **CRL 2026 status/format** (and any Esports World Cup involvement): not retrieved.
- **Deconstructor of Fun / Mobile Dev Memo** analyses: not retrieved this session.

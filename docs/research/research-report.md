# Card-MOBA Hybrids Live or Die on Attention

**No real-time card game with three contested lanes has yet found a mass audience.** The closest attempts all stalled, shut down or were cancelled before release: Warcraft Rumble, Star Wars: Force Arena, SMITE Rivals, Spellbinders and the turn-based Artifact. The games that won kept the player's mental load small. Clash Royale uses two lanes, one resource and three-minute matches. Marvel Snap has three lanes but no unit combat, takes turns, and finishes in about three minutes. So the central design problem is not "can we combine these?" It is "how much MOBA flavour (lanes, turrets, jungle, objectives, heroes) fits inside Clash Royale's attention budget on a phone?" The market case is real but narrow. Southeast Asia knows MOBAs well: MLBB claims more than 110 million monthly players and set a mobile esports record of 5.68 million peak viewers in January 2026. Malaysia spends far more than its size suggests. But the average player in the region spends only about $19 a year, and new real-time PvP games from Supercell and Blizzard were both wound down in 2025. A tiny team (a non-coding owner plus an AI coding assistant) can build this. The route is a web-first prototype, bot opponents, and a network model that sends only players' moves, as long as the game rules give identical results on every phone from day one. On the legal side, game mechanics are free to borrow, but names, art, maps and UI are not. Paid random rewards (loot boxes) face fast-tightening rules in Malaysia, Indonesia, Brazil and the EU. Much of the research came from search-engine summaries because many sites were blocked, so treat specific numbers as estimates.

## Most figures here are estimates read from search summaries

This research was done on 11 November 2026. Many key sources could not be opened directly, including Supercell's and Moonton's official pages, the fan wikis, AppMagic, PocketGamer.biz and Game Developer. Several research threads also ran out of search budget. Most findings therefore come from **search-engine summaries of the linked pages, not full reads**. The links are there so you can check the load-bearing ones before relying on them.

Revenue and player numbers come from app-tracking firms such as AppMagic and Sensor Tower, which model app-store sales. They cannot see **web top-ups** (buying game currency on sites like Codashop instead of through the app store). These are common in Southeast Asia, so the trackers undercount games like MLBB. Trackers also mix "gross" figures (before Apple and Google take their cut) with "net" figures (after it).

Where sources disagree, this report shows the range rather than picking one number:

| What | Reported values | How to read it |
|---|---|---|
| Clash Royale's best 2025 month | Sept $67.8M ([AppMagic](https://appmagic.rocks/blog/ClashRoyale-Comeback)); Sept $98.4M or $105M (secondary sites, [Levvvel](https://levvvel.com/statistics/clash-royale/)); Oct $78M ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)); Nov ~$78M net ([GamesBeat](https://gamesbeat.com/supercell-generates-3b-in-2025-revenue-down-4-while-profits-grew/)) | Probably gross vs net, or later revisions. The big 2025 rebound itself is solid |
| Clash Royale full-year 2025 | $422M ([GamingonPhone](https://x.com/GamingonPhone/status/1998265294217953620)), $487M ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-royale-player-count)), $647M ([SQ Magazine](https://sqmagazine.co.uk/clash-royale-statistics/)) | Every source says more than double 2024 |
| Warcraft Rumble revenue | Nov 2023: $17M or $24.6M; lifetime ~$39M by mid-2024 ([MobileGamer.biz](https://mobilegamer.biz/data-digest-warcraft-rumble-monopoly-go-star-wars-hunters-and-squad-busters-numbers-keywords-2-2bn-deal-and-more/)) or ~$64M gross excluding China ([WN Hub](https://wnhub.io/news/finance/item-44025)) | Every source shows a steep fall within a year |
| MLBB monthly players | 110M+ (company claim, [Moonton](https://en.moonton.com/news/372.html)) vs ~81M (store tracker, [Buffget](https://buffget.com/ja/news/mobile-legends-bang-bang-player-count-november-2025-453m-monthly-stats-and-trends-sg5l0a)) | Company claim vs a tracker that sees only app stores |
| Malaysian gamers | 18.8M ([Niko Partners](https://nikopartners.com/bulletins-white-papers/societal-impact-of-mobile-legends-bang-bang-in-malaysia/)) vs 25M ([Antom](https://knowledge.antom.com/malaysia-gaming-payment-trends-report-loyal-gamers-smart-spending-hybrid-payments-the-winning-combo)) | Different definitions of "gamer" |
| US cost per install | $1.71 ([Sharklio, Adjust data](https://sharklio.com/academy/targeting-bids/cost-per-install-by-country)) vs $5.28 ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/)) | Different genres and methods |

Smaller game-rule numbers also conflict between fan guides, because MLBB rebalances its map every year. Claims that the researchers could not tie to a source have been left out. The legal section is general research, not legal advice.

## Clash Royale fits deep strategy into one resource, two lanes and three minutes

Clash Royale (Supercell, 2016) is a one-on-one real-time card game. You do not steer anything. You choose **which card to play and where to drop it**, and the units then walk toward enemy towers and fight on their own. Reviewers praised it as "accessible and intuitive, but hiding a surprising depth of strategy", and singled out its short, fast matches as a good fit for phones ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)).

| Rule | Value | Source |
|---|---|---|
| Resource | "Elixir" refills on its own, caps at **10**, about 1 point per 2.8 s | [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale); [West Games](https://west-games.com/clash-royale-cycle-time-calculator/) |
| Speed-ups | 2x in minute 3; 2x then **3x** in overtime | [Supercell Support](https://support.clashroyale.com/hc/en-us/articles/49484936933403-Elixir) |
| Deck and hand | **8 cards**, 4 in hand at once, cycling | [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) |
| Map | Portrait. A river with two bridges makes **two lanes**. Grid often cited as 18×32 tiles (low-confidence source) | [Metagamenation](https://metagamenation.com/clash-royale-field-master-the-arena-layout-and-dominate-every-battle-in-2026/) |
| Towers | 1 King + 2 Princess towers per side. Destroying the King is an instant win | [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) |
| Match | **3 minutes**, plus up to 2 minutes of sudden-death overtime | [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale) |

### Small rules create the skill

The single refilling resource turns every decision into a trade: is this play worth 4 elixir? Because the bar caps at 10, sitting idle wastes income. The fixed speed-up schedule gives every match a frantic final minute without adding any new systems.

You may deploy only on your own half until you destroy an enemy Princess Tower. After that, your drop zone extends into the enemy's side ([Metagamenation](https://metagamenation.com/clash-royale-field-master-the-arena-layout-and-dominate-every-battle-in-2026/)). This is a positional reward rather than a stat boost, and it maps neatly onto the MOBA idea of "tower falls, lane pushes forward."

The King Tower stays asleep until a Princess Tower falls or the King itself is hit ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)). Skilled players deliberately pull enemy units into its range to wake it early ([Clash Royale Wiki blog](https://clashroyale.fandom.com/wiki/User_blog:GrandWiz05/Tornado_Placement_for_King_Tower_Activation)). Unit behaviour follows fixed targeting rules. For example, "buildings-only" units such as the Giant ignore troops and head for structures ([Clash Royale Wiki](https://clashroyale.fandom.com/wiki/King's_Tower)). That predictability is what turns placement into a skill.

The design goes back to an abandoned pre-2012 Supercell prototype called "The Summoners" ([PocketGamer.biz](https://www.pocketgamer.biz/clash-royale-based-on-a-pre-clans-prototype/)), reworked for portrait phones from 2014. The card-balance lead said he relies "less on metrics, more on design intuition" ([Game Developer](https://www.gamedeveloper.com/design/-i-clash-royale-i-s-card-balancing-guru-leans-less-on-metrics-more-on-design-intuition)). That argues for fast playtesting over heavy analytics early on.

### The genre leader is adding MOBA-style heroes, then trimming their micromanagement

Clash Royale has been moving toward heroes the player activates by hand. **Champions** (October 2021) added an ability button that costs elixir and then goes on cooldown ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)). In October 2025, Supercell ruled that only the most recently placed Champion keeps its ability ([Supercell](https://supercell.com/en/games/clashroyale/blog/release-notes/october-update-2025)). **Heroes** (December 2025) gave the same kind of button to upgraded versions of familiar cards. They are capped at two special slots per deck ([Supercell](https://supercell.com/en/games/clashroyale/blog/release-notes/december-update-2025/); [RoyaleAPI](https://royaleapi.com/blog/hero-knight-and-heroes-december-2025)).

In **August 2026**, every Hero and Champion ability (except one) became **single-use per deployment, with no cooldowns** ([GamingOnPhone](https://gamingonphone.com/news/clash-royale-season-86-k-h-a-o-s-august-2026-update-and-balance-changes/); [TrophyCoach](https://trophycoach.com/guides/single-use-abilities-explained)). These are secondary sources. Supercell's own reasoning was not found. One plausible reading is that tracking cooldowns on a phone asked too much of players.

### Card levels drive both revenue and resentment

Upgrading cards makes them stronger, and your account level makes your towers stronger. This is the root of long-running "pay to win" criticism ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)). A **Level 16** cap added in November 2025 angered veteran players because it devalued their recent upgrades. Supercell reportedly admitted it misjudged the reaction and in June 2026 promised not to add more levels. Both sources are secondary ([Mediosick](https://www.mediosick.com/blog/news-5/clash-royales-level-16-update-bigger-upgrades-bigger-backlash-74); [Shane the Gamer](https://www.shanethegamer.com/esports-news/clash-royale-update-backlash-supercell/)).

### The 2025 comeback came from fixes and creators, not ads

Monthly revenue fell to about **$12M in February 2025**, then rose **5.7x to $67.8M in September 2025**. AppMagic credits **less reward inflation, healthier balance and new daily reasons to log in** ([AppMagic](https://appmagic.rocks/blog/ClashRoyale-Comeback)). The new Merge Tactics mode (a four-player auto-battler) pushed daily revenue to a post-pandemic record ([PocketGamer.biz](https://www.pocketgamer.biz/clash-royale-hits-post-pandemic-record-of-38m-daily-revenue-with-new-mode-merge-tactics/)).

Most new downloads were organic: more than 11M a month by September 2025, per Sensor Tower data ([games.gg](https://games.gg/it/news/clash-royale-2025-comeback/)). Streamers mattered enough that Supercell's CEO apologised in February 2026 for not crediting creators such as Jynxzi ([Dexerto](https://www.dexerto.com/gaming/clash-royale-ceo-apologizes-after-failing-to-credit-jynxzi-3318282/)). Supercell called it a record year for daily players, with new players up almost 500% ([Supercell](https://supercell.com/en/news/the-best-games-havent-been-made-yet/)).

## MLBB builds lane identity from economy rules and a fixed objective clock

A **MOBA** (multiplayer online battle arena) is a team game where computer-controlled **minions** march down **lanes** toward the enemy base. **Turrets** guard each lane. The **jungle** between lanes holds neutral monsters worth rewards. Big neutral **objectives** give the team that kills them a team-wide boost. Mobile Legends: Bang Bang (Moonton) is the dominant MOBA in Southeast Asia, with matches averaging **12–20 minutes** ([Wikipedia](https://en.wikipedia.org/wiki/Mobile_Legends:_Bang_Bang)).

### Lanes differ because of rules, not shape

MLBB has five positions: Gold Lane, EXP Lane, Mid Lane, Jungle and Roam ([Playnews](https://www.playnews.gg/en/guides/mlbb-guide-to-the-6-roles-and-5-positions-to-get-started)). The lanes feel different because of **economy rules**. The Gold Lane pays bonus gold for the killing blow on a minion ("last-hitting") ([metammo](https://metammo.com/mobile-legends-guide/guides/gold-lane-guide)). The EXP Lane gives a solo player bonus experience, which disappears if a teammate joins. Guides disagree on the size, citing +25% or +35% ([mlbbhub](https://mlbbhub.com/guides/exp-lane-tips); [metammo](https://metammo.com/mobile-legends-guide/guides/exp-lane-guide)).

A single-player card game can borrow this cheaply by letting each lane pay out something different.

### Structures resist early rushes

Each lane has **three turrets** ([mlbbhub](https://mlbbhub.com/map)). Outer turrets start with a shield that absorbs 5,000 damage and cuts incoming damage by 30% for the **first five minutes**. Base turrets take 50% less damage when no enemy minions are nearby, which blocks sneak attacks (called "backdoor protection") ([MLBB Wiki](https://mobile-legends.fandom.com/wiki/Turret)). The patch these numbers come from is unknown.

Minion waves reportedly spawn **every 30 seconds** (single source: [itembuild](https://itembuild.com/mlbb-guide/role-guide/03-mlbb-exp-lane-guide)).

### Every mobile MOBA runs the same objective clock

The pattern repeats across games: an early, smaller river objective; a mid-game "pusher" boss; and often a late super-objective. Known spawn times make both teams converge at the same moment, which creates scheduled decision points.

| Game | Objective timing | Typical match |
|---|---|---|
| MLBB | Turtle 2:00, Lord 8:00, Lord evolves 18:00 | 12–20 min |
| Honor of Kings | Tyrant and Overlord 4:00, Tempest Dragon 20:00 | 15–20 min |
| Wild Rift | Dragon ~5:00, Baron ~10:00, Elder Dragon 19:00 | 15–20 min |
| Pokémon Unite | Rayquaza with 2:00 left, never respawns | 10 min hard cap |

Sources: [MLBB Wiki: Turtle](https://mobile-legends.fandom.com/wiki/Turtle); [mlbbhub](https://mlbbhub.com/map); [Liquipedia](https://liquipedia.net/mobilelegends/Patch_1.9.64); [hub-game](https://hub-game.com/hok/en/guide/bosses); [Riot](https://wildrift.leagueoflegends.com/en-us/news/game-updates/elemental-rift-overview/); [Pokémon.com](https://www.pokemon.com/us/strategy/pokemon-unite-theia-sky-ruins-overview). The Honor of Kings and Wild Rift timings come from fan guides that sometimes disagree.

Once killed, MLBB's Lord **marches down a lane** and charges enemy turrets for damage equal to 30% of their maximum HP ([mlbbhub](https://mlbbhub.com/guides/jungle-rotation)). The September 2026 map change went further. The **Healing Turtle** no longer gives a shield; instead, "Allied Turtles will spawn in the lane to help push." **Golden Turrets** got tougher but pay "significantly more team Gold" ([MLBB official](https://x.com/MobileLegendsOL/status/2104435939775062252)). MLBB is moving toward the logic of a card game: winning an objective now means **extra units in a lane**.

### Mobile MOBAs got shorter by cutting layers

Riot's Wild Rift (League of Legends on mobile) targets 15–20 minutes, "about half" the PC game. It got there by **removing whole layers** rather than shrinking every timer. Riot cut the level cap from 18 to 15, removed inhibitors (the extra structures that guard each lane's base) and turret plates, and made the base itself shoot back ([Riot Support](https://support.riotgames.com/en-us/wild-rift/gameplay/map-and-modes); [GamingBolt](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary)). Riot also **mirrored the map** so both teams play from the same corner and skills never aim into the on-screen buttons. A card game has a similar issue: your hand of cards sits at the bottom of the screen.

Pokémon Unite went furthest. It uses two lanes and a central jungle, has players score points into goal zones, drops last-hitting and the in-match item shop, and caps matches at 10 minutes. Points are worth more in the last two minutes; guides disagree on whether they double or quadruple ([Game8](https://game8.co/games/Pokemon-UNITE/archives/336065); [Pokémon Unite Wiki](https://pokemonunite.fandom.com/wiki/Theia_Sky_Ruins)). Reviewers praised how easy it is to pick up ([Upcomer](https://upcomer.com/in-pokemon-unite-simplicity-is-the-point)). Analysts said it gave up depth and stickiness ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2021/11/21/pokemon-unite-9lc3j), attribution unverified). Critics also called its late boss "too powerful to be determined by last hits" ([SlashGear](https://www.slashgear.com/780731/pokemon-unite-review-big-fun-big-concerns)).

The rough complexity ladder runs: PC League of Legends → Wild Rift → MLBB and Honor of Kings → Pokémon Unite → Clash Royale. A card-MOBA hybrid sits somewhere between Unite and Clash Royale.

### MLBB's biggest complaints come from having teammates

Recurring MLBB complaints are about AFK (absent) or toxic teammates, solo-queue matchmaking, and being forced into roles ([SikayetVar](https://www.sikayetvar.com/en/mobile-legends-us/solo-queue-imbalances-and-unpunished-toxicity-fuel-complaints-in-mobile-legends-ranked-matches), a self-selected complaint board). A one-on-one commander game removes these by design. What remains is fairness of card power and snowballing, where an early lead compounds until the match is effectively over.

## No real-time three-lane card game has yet found a mass audience

| Game | What it tried | What happened |
|---|---|---|
| **Warcraft Rumble** (Blizzard, 2023) | Clash Royale-style deploy with leaders, built PvE-first | $17M first month → $1.7M by June 2024. New content ended July 2025 |
| **Star Wars: Force Arena** (Netmarble, 2017) | Player steers a hero while also deploying cards | Fell off the top charts within about a month. Closed early 2019 |
| **SMITE Rivals** (Hi-Rez, 2017) | Gods and minions as cards on a three-lane field | Suspended after early testing |
| **Spellbinders** (Kiloo) | Three lanes in a side view | Lukewarm reviews |
| **Castle Burn** (2017) | Card deploy plus map mana crystals and castle upgrades | Shut down May 2020 |
| **Artifact** (Valve, 2018) | Turn-based three-lane card MOBA with heroes, gold and a shop | 60,740 peak players → ~2,200 within six weeks. Development ended 2021 |
| **Marvel Snap** (2022) | Three locations, no combat, 6 turns, ~3 minutes | $116M+ first year, then a long decline |
| **Rush Royale / Battle Cats** | Single-board or single-lane | $500M+ and $700M+ lifetime |

Sources: [MobileGamer.biz](https://mobilegamer.biz/data-digest-warcraft-rumble-monopoly-go-star-wars-hunters-and-squad-busters-numbers-keywords-2-2bn-deal-and-more/); [Engadget](https://www.engadget.com/gaming/blizzard-is-giving-up-on-its-warcraft-mobile-game-amid-layoffs-215021940.html); [Game Developer](https://www.gamedeveloper.com/design/fast-following-clash-royale-the-case-of-star-wars-force-arena); [Wikipedia](https://en.wikipedia.org/wiki/Star_Wars:_Force_Arena); [PC Gamer](https://pcgamer.com/smite-rivals-hi-rezs-ccg-moba-crossover-has-been-suspended); [PocketGamer](https://www.pocketgamer.com/articles/069921/spellbinders-doesnt-quite-cast-a-strong-enough-enchantment/); [GamingonPhone](https://gamingonphone.com/news/castle-burn-game-services-are-now-terminated/); [GameRevolution](https://www.gamerevolution.com/news/486511-artifact-player-count); [Inven Global](https://labs.invenglobal.com/articles/7222/artifact-sinks-to-2200-concurrent-players); [GameDev Reports](https://gamedevreports.substack.com/p/appmagic-marvel-snap-earned-more); [PocketGamer.biz](https://www.pocketgamer.biz/rush-royale-surpasses-500m-in-lifetime-revenue/); [WN Hub](https://wnhub.io/news/finance/item-44495).

### Warcraft Rumble is the closest warning

Rumble had a famous IP, a top studio and a core loop critics liked (Metacritic 70). Critics faulted an "unfriendly" economy and progress that "will basically stagnate at one point" ([Metacritic](https://legacy.prod.metacritic.com/game/ios/warcraft-rumble/critic-reviews)). German site MeinMMO called it pay-to-win ([MeinMMO](https://mein-mmo.de/en/warcraft-rumble-is-unfortunately-pay2win,1065316)).

It was built **PvE-first** (player versus computer), with a 70+ map campaign that "will take months to complete" ([Ungeek](https://ungeek.ph/2022/05/interview-warcraft-arclight-rumble-developers-share-info-on-gameplay-monetization)). Its PvP match length (3:30 plus 1:00 overtime) was close to Clash Royale's ([Method.gg](https://method.gg/warcraft-rumble/advanced-rulebook)). So a short match was not enough on its own. Rumble's problems were economy and content burden, not the core loop. The research did not confirm Rumble's exact lane layout.

### Steering a hero while deploying cards doubled the workload

An analysis of Star Wars: Force Arena said playing it was "like playing an action RPG and a lane-battler at the same time." The author suggested units spawn next to the hero instead of being dragged onto the map ([Game Developer](https://www.gamedeveloper.com/design/fast-following-clash-royale-the-case-of-star-wars-force-arena)).

### Artifact versus Marvel Snap shows what makes three lanes bearable

Both games ask you to win two of three lanes. Artifact put full Dota-style combat in every lane, each with its own mana pool, plus five heroes, a shop and random attack directions. Games ran 20–30 minutes ([mightygodking](https://mightygodking.com/2018/12/05/artifactuals/)). **Complexity was the top reason players quit**, and players resented randomness that overruled decisions they had already made ([LessWrong](https://www.lesswrong.com/posts/6gptwR8jBkzqhWaTY/artifact-what-went-wrong)). Its designer also blamed the model of paying real money for cards ([Kotaku](https://kotaku.com/artifact-designer-says-it-failed-due-to-cards-for-money-1835212145)).

Valve's rework moved all lanes onto one screen and removed the random arrows, but by then the players had already left ([PC Gamer](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/)).

Marvel Snap does the opposite. Each lane is just the summed power of a few cards, with no combat. Turns happen simultaneously. The game has "less numbers on a card than in any other card game," and six turns were chosen after testing five and seven ([Keith Burgun](https://keithburgun.net/marvel-snap-is-a-testament-to-the-power-of-ruleset-design); [Apple Developer](https://developer.apple.com/news/?id=sosm2p7q); [GamesBeat](https://gamesbeat.com/ben-brode-bets-super-speed-will-make-marvel-snap-stand-out/)).

The lesson is that **lane count is affordable only to the extent each lane can be read at a glance.** A real-time game adds time pressure that neither of these turn-based games faced.

### Even hits decay, and big studios kill games that miss the bar

Marvel Snap's monthly revenue fell about **88% from its peak** by 2026, per one aggregator's AppMagic-based series. That series is not directly comparable with the first-year figure ([Udonis](https://www.blog.udonis.co/statistics/marvel-snap)). The studio also made layoffs in May 2026 ([MassivelyOP](https://massivelyop.com/2026/05/04/marvel-snaps-second-dinner-undertakes-layoffs-to-make-sure-the-game-can-keep-going/)).

Supercell ended Squad Busters after roughly **$68M lifetime** revenue because it could not fix "core problems" ([Supercell](https://supercell.com/en/news/squad-development-ending/); [MobileGamer.biz](https://mobilegamer.biz/supercell-is-killing-squad-busters/)). It closed Clash Mini and folded its ideas into Clash Royale as Merge Tactics ([MobileGamer.biz](https://mobilegamer.biz/supercell-kills-clash-mini-though-itll-live-on-within-clash-royale/)). Legends of Runeterra was scaled back because it cost more to make than it earned ([Dot Esports](https://dotesports.com/lor/news/legends-of-runeterra-to-be-drastically-scaled-back-due-to-financial-shortcomings)).

Small PC niches do survive. Minion Masters still averaged about 270–350 concurrent Steam players in 2025, eight-plus years after its 2017 peak ([Steambase](https://steambase.io/apps/489520)).

### Familiar characters bring downloads, not loyalty

Warcraft, Star Wars, SMITE and Dota spin-offs all launched strongly and then faded. Moonton's MLBB auto-battler spin-off, Magic Chess: Go Go, soft-launched in Malaysia and Singapore in November 2024 ([Wikipedia](https://en.wikipedia.org/wiki/Magic_Chess:_Go_Go)) and passed **15M downloads** within a month of its Asia-Pacific launch ([Moonton](https://en.moonton.com/news/177.html)). No reliable revenue figures exist for it.

| What the winners share | What the failures added |
|---|---|
| Two or fewer real-time lanes, or turn-based "sum the lane" | A third contested real-time lane |
| One refilling resource | Extra economies (mining, castle tiers, shops) |
| Matches of about 3–5 minutes | A hero you steer directly |
| PvP core; new modes reuse existing assets | A content-hungry PvE campaign |
| Fairness the community accepts | Grind or paid power |

## Southeast Asia brings MOBA-literate players, but about $19 a head

### The global market is mature

Newzoo puts 2025 mobile game revenue at **$113.3B (+10.7%)** ([PocketGamer.biz](https://www.pocketgamer.biz/global-games-revenue-surpasses-200bn-for-the-first-time-mobile-generates-113bn/)). Sensor Tower's app-store-only figure was essentially flat at **$81.75B (+1.3%)** ([Game World Observer](https://gameworldobserver.com/2026/01/21/in-2025-the-revenue-of-the-mobile-gaming-market-grew-but-only-slightly-analysis)). Strategy was the largest genre in the first half of 2026 at $9.27B ([GameDev Reports](https://gamedevreports.substack.com/p/sensor-tower-the-gaming-market-in)), but empire-building games dominate that figure, not real-time card battles. A new game will mostly be taking players from existing games rather than finding new spending.

### Southeast Asia: huge volume, low spend per player

Niko Partners puts the six main Southeast Asian markets at **$5.6B across about 290M players in 2025**, about **$19 per player per year** ([Niko Partners](https://substack.nikopartners.com/p/7-billion-in-2030-opportunities-in); [GameDev Reports](https://gamedevreports.substack.com/p/niko-partners-southeast-asia-games)). In-app spending through the stores was $625M in Q1 2025, led by **Thailand ($162M), Indonesia ($118M) and Malaysia ($103M)**. MOBAs were the fastest-growing genre in Indonesia and the Philippines that quarter ([Sensor Tower](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025)).

MLBB was #1 in the region by revenue for January–August 2024 ([Sensor Tower](https://sensortower.com/blog/southeast-asian-mobile-game-market-insights-2024)). Tracked store revenue was about $190M in 2025, excluding web top-ups ([Quantumrun](https://www.quantumrun.com/consulting/mobile-legends-bang-bang/)). That is under $2 a year per claimed player: a huge audience that spends mostly on cosmetics and passes. Honor of Kings, from Tencent, launched globally in June 2024 with 50M downloads in its first month ([Game World Observer](https://gameworldobserver.com/2024/07/22/honor-of-kings-50-million-downloads-outside-of-china)), but did not take MLBB's revenue lead.

### Malaysia punches above its size

| Malaysia | Figure |
|---|---|
| Gamers | 18.8M–25M (sources differ) |
| Mobile games market | ~$338.6M in 2025, ~$38 a year per player (estimate, [Upstack](https://upstackstudio.com/?p=56299)) |
| App-store spend | $103M in Q1 2025, #3 in the region ([Sensor Tower](https://sensortower.com/blog/southeast-asia-mobile-gaming-2025)) |
| iPhone share | 37% of phones ([StatCounter](https://gs.statcounter.com/os-market-share/mobile/malaysia/monthly-)); 45% of mobile web traffic ([Zenweb](https://zenweb.my/blog/iphone-vs-android-malaysia)) |
| Mobile data | ~$0.28 per GB ([Cellesim](https://cellesim.com/ms/mobile-internet-speeds-by-country-2026)) |
| Payments | Touch 'n Go, GrabPay, Boost, ShopeePay, carrier billing, Codashop ([Riot Support](https://support-valorant.riotgames.com/hc/en-us/articles/4407760854291-Methods-Of-Payment-For-VALORANT-Southeast-Asia); [Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/southeast-asia-gaming-market)) |

One signal stands out. Malaysia supplied only **5.4% of Honor of Kings' early downloads** but **14.4% of its in-app revenue outside China** ([Game World Observer](https://gameworldobserver.com/2024/07/22/honor-of-kings-50-million-downloads-outside-of-china); [Icon Era](https://icon-era.com/statistics/honor-of-kings/)). The two figures come from different trackers and time windows, so the roughly 2.7x ratio is only indicative. The pattern still holds: **Indonesia and the Philippines bring volume, while Malaysia brings spending.** Because so many Malaysians use iPhones, a Kuala Lumpur launch cannot skip iOS.

In the Philippines and Indonesia, budget Android phones dominate. Transsion (TECNO, Infinix, itel) holds 36.6% of the Philippine market ([GizGuide on IDC](https://www.gizguide.com/2026/03/smartphone-market-share-2025-idc-southeast-asia.html)).

### What these players want

Competitive team play is central to the culture. MLBB's M7 World Championship hit **5.68M peak viewers** in January 2026, a mobile esports record ([Esports Charts](https://escharts.com/news/top-teams-m7-world-championship)), roughly eight times Clash Royale's 2025 World Finals peak of 698,000 ([Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)). A sponsor-linked survey found 7 in 10 Malaysian parents support gaming careers ([Niko Partners](https://nikopartners.com/bulletins-white-papers/societal-impact-of-mobile-legends-bang-bang-in-malaysia/)).

Asian players accept cosmetic purchases far more readily than paid power. Competition in MOBAs is expected to be the same "regardless of spend" ([Think with Google / Niko Partners](https://www.thinkwithgoogle.com/_qs/documents/10187/Google-Niko-Partners_The-Art-of-Monetizing-Games-in-Asia.pdf)). That study did not sample Southeast Asia, and no direct regional survey was found. Weekly playtime in the region reportedly fell from 21.8 to about 15 hours between 2024 and 2025 ([GameDev Reports](https://gamedevreports.substack.com/p/niko-partners-southeast-asia-games)), which favours shorter sessions. No hard data on preferred match length in Southeast Asia was found.

### The benchmarks a prototype must beat

| Measure | Typical | Top performers |
|---|---|---|
| Day-1 return rate | ~22% | ~40% (top 10%) |
| Day-7 return rate | under 4% | — |
| Day-30 return rate | under 1% | 13–15% (top 1%) |

Source: [GameAnalytics](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks). Installs from ads are far cheaper in the region. A mid-core game install costs about $6.40 on US iPhones against about $0.90 in Southeast Asia ([FoxData](https://foxdata.com/en/blogs/mobile-game-ua-in-2026-why-cpi-is-rising-and-what-smart-studios-do-differently/)), and casual installs can cost as little as $0.15–0.60 ([Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/)).

Cheap installs make Indonesia and the Philippines low-cost places to **test whether players come back**. As illustrative arithmetic, 10,000 installs there might cost $1,500–9,000, against $17,000–77,000 in the US. Low spend per player, though, means paid advertising rarely pays for itself. Clash Royale's 2025 comeback, driven by creators and organic downloads, is the more realistic growth model.

### A web-first route has worked for a tiny team

The clearest small-team example found is Tall Team, eight people in Ireland. They built the multiplayer kart-battle game Smash Karts for the web game portals Poki and CrazyGames, then shipped iOS and Android versions with shared accounts ([Poki](https://poki.com/blog/tall-teams-launches-obby-roads-poki); [CrazyGames](https://www.crazygames.com/game/smash-karts)). Web results prove the game is fun but will not predict mobile spending in Southeast Asia. No indie mobile PvP soft launch in Malaysia or the Philippines with published results was found.

## A tiny team can build it if the game rules run identically on every phone

### Send moves, not units

**Netcode** is the code that keeps two players' screens in step. Supercell has never published how Clash Royale's works. But its support page says that if you disconnect, "the battle will continue and your opponent can still deploy cards" ([Supercell Support](https://support.clashroyale.com/hc/pl/articles/49484886660251-Unstable-Connection)). Third-party analyses of old game clients describe the same game logic running on both phone and server, with only player commands sent across ([Scroll](https://git.xeondev.com/Supercell/Scroll); [DeepWiki](https://deepwiki.com/clashRoyaleClients/Clash-Royale-v1-Client-Leak)).

The research recommends the same approach, called a **deterministic command relay**. "Deterministic" means the same inputs always produce exactly the same result on every device. Both phones and the server run the same rulebook. The only data sent is each move ("play card 3 here"), stamped to happen about **0.15–0.3 seconds later**. A short summon animation hides that delay. Bandwidth stays tiny however many units are on screen. Reconnection and replays come almost for free, because the server can replay the list of moves.

Rollback, which shooters use to guess ahead and then correct, adds little for a card game and is costly on cheap phones ([Photon docs](https://doc.photonengine.com/quantum/v3/manual/prediction-culling)).

### The one hard rule: no decimals in the game logic

Ordinary decimal ("floating-point") maths can give slightly different answers on different phone chips, and that makes two screens drift apart. Experts recommend whole-number-based ("fixed-point") maths from the start ([Gaffer on Games](https://gafferongames.com/post/floating_point_determinism); [GDC 2024](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Pollard_Bradley_CrossPlatformDeterminism+2024-03-26+09.34.19.pdf)). Even JavaScript's built-in `Math.sin` is "not cross-platform deterministic" ([Rapier](https://rapier.rs/docs/user_guides/javascript/determinism)). Retrofitting this later is expensive, so it is the single most important instruction to give an AI coding assistant on day one.

### Three realistic build paths

| Path | Best for | Main risk |
|---|---|---|
| **A: TypeScript web game** (Phaser 4 or PixiJS) shipped as a web app first, wrapped for stores later | Testing on any phone via a link in seconds; one language for game, server and bots | Performance in the in-app browser on low-end Android |
| **B: Unity + Photon Quantum** | Ready-made deterministic netcode, native performance | Slower builds, a harder editor for a non-coder, locked into Photon |
| **C: Godot 4 native** | Small, free engine with good native performance | AI assistants often write outdated Godot 3 code; weaker web export |

Sources: [Phaser](https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games); [Capacitor](https://capacitorjs.com/docs/v7/guides/games); [Photon](https://blog.photonengine.com/?p=5311); [Unity](https://unity.com/blog/news/open-letter-on-runtime-fee); [Godot docs](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html); [DEV](https://dev.to/ziva/7-godot-4-api-calls-your-ai-assistant-still-gets-wrong-3ep6).

Phaser 4 shipped in April 2026. Unity Personal is free for teams under $200k in revenue. Photon has a free 100-player plan and a Singapore region ([Photon regions](https://doc.photonengine.com/fusion/current/reference/regions)). Users report Phaser games wrapped as Android apps showing white screens and orientation bugs ([Phaser forum](https://phaser.discourse.group/t/phaser-3-capacitor-android-apk-white-screens-texture-rendering-failures-and-orientation-issues/15571)). That is why testing on a cheap Android phone early matters. No rigorous benchmark of 100 animated units on a low-end phone was found for any engine.

### Hosting is nearly free at first, but avoid lock-in

Colyseus is an open-source game server with no licence fee, with hosting from $15 a month ([Colyseus](https://docs.colyseus.io/cloud/pricing-billing)). Cloudflare added a Singapore-area location option in June 2026 ([Cloudflare](https://developers.cloudflare.com/changelog/post/2026-06-19-apac-ne-apac-se-location-hints/)). Supabase's real-time service suits lobbies and menus but not the match itself: its free tier allows 100 messages per second in total ([Supabase](https://supabase.com/docs/guides/realtime/limits)).

2026 showed the danger of depending on one hosting vendor. **Hathora shut down game hosting in May 2026**, taking Stormgate's online modes with it ([TechSpot](https://www.techspot.com/news/111969-stormgate-servers-go-dark-following-ai-focused-hosting.html)). Unity deprecated its Multiplay hosting in April 2026 ([Unity](https://status.unity.com/info_notices/362941)). Keep the match server a plain program that can move hosts in a day.

Network quality also matters. Under load, mobile latency reportedly worsens 3.7x in Indonesia and 5.2x in the Philippines ([TechWire Asia](https://techwireasia.com/2026/07/ai-workloads-apac-mobile-networks/), attribution unconfirmed). That argues for a generous built-in deploy delay. A real phone ping test from Jakarta and Manila to a Singapore server is still needed.

### Bots first, cheats blocked by design

Supercell has never confirmed bots in Clash Royale ranked play ([esports.net](https://www.esports.net/news/mobile-games/does-clash-royale-have-bots/)). An undated report describes "tutorial bots" below 4,000 trophies ([Dot Esports](https://dotesports.com/?p=373692)). Brawl Stars officially replaces disconnected players with bots ([Supercell Support](https://support.clashroyale.com/hc/pl/articles/49484886660251-Unstable-Connection)). Researchers have built Clash Royale-playing AI using lookahead search and machine learning ([Aalto University](https://acris.aalto.fi/ws/portalfiles/portal/94733653/Learning_to_Play_Imperfect_Information_Games_by_Imitating_an_Oracle_Planner.pdf); [arXiv](https://arxiv.org/abs/2504.04783)), but a tiny team does not need that.

The practical ladder is a **rule-based bot** first ("defend the most threatened lane"). Next comes a **scoring bot** that rates every card-and-spot option. Deeper search can come later. Bots let you test fun with no server and no players, and later keep matchmaking queues short.

Because the server holds each player's elixir and hand and checks every move, most cheating is blocked by design. A replay is just "random seed + list of moves," a few kilobytes ([Bugnet](https://bugnet.io/blog/how-to-add-server-side-replay-validation)).

### AI-assisted coding works best in small, tested pieces

One developer's post-mortem on failing to build a real-time game mostly by prompting an AI assistant described games as "highly choreographed chaos running at 60fps." It noted that AI assistants duplicate code in larger projects ([Godot forum](https://forum.godotengine.org/t/post-mortem-of-my-failed-attempt-to-vibe-code-a-metroidvania-game/137567/1)).

The antidote is a game-rules module with no graphics code, plus an automated test that runs the same match twice and checks that both runs end identically. The research's rough sequence (an estimate, not sourced from comparable projects) is:

| When | Milestone |
|---|---|
| Weeks 1–4 | Rules engine, 6–20 cards, bot opponent, playable on a phone via a link |
| Weeks 4–8 | Two-player online via a Singapore server |
| Months 2–4 | Closed Southeast Asia playtest, with bots filling queues |
| Months 4–9 | Store apps, progression, payments, soft launch |

**Hard to reverse, so decide in week 1:** whole-number deterministic rules, the language the rules are written in, and the server owning each player's deck and elixir. **Easy to change later:** graphics engine, host, account system, art and bot sophistication.

## Mechanics are free to borrow; names, art and paid randomness carry the risk

*This section is general research, not legal advice. Court opinions and statutes were not read directly, so a Malaysian IP lawyer should review the plan and the store listing before launch.*

### Courts protect expression, not rules

US courts consistently treat game rules as free to copy and protect the art, characters, text, audio, code and sometimes the overall look. Commentators say protection "may only be skin deep" ([Mondaq](https://www.mondaq.com/unitedstates/gaming/591564/when-it-comes-to-games-the-practical-limit-to-united-states-copyright-protection-may-only-be-skin-deep)).

| Case | Outcome | Lesson |
|---|---|---|
| Tetris v. Xio (2012) | Near-identical look lost; injunction granted | Copying the visual presentation infringes ([Wikipedia](https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.)) |
| Spry Fox v. 6waves (2012) | New art did not save a clone; settled | Copying the structure and arrangement can infringe ([MCV](https://mcvuk.com/development-news/court-denies-motion-to-dismiss-spry-fox-vs-6waves)) |
| DaVinci v. ZiKo (2016) | The accused game, with near-identical rules but a different theme and art, won | Same rules, new theme and art is safe ([Justia](https://law.justia.com/cases/federal/district-courts/texas/txsdce/4:2013cv03415/1134359/73/)) |
| Nexon v. Ironmace (Korea, final April 2026) | No copyright breach, but trade-secret damages | Never use a former employer's internal material ([Inven Global](https://www.invenglobal.com/articles/21463/nexon-wins-partial-supreme-court-victory-against-ironmace-in-trade-secret-misappropriation-case)) |
| GREE v. Supercell (2020) | $8.5M patent verdict | Patents can cover game methods ([DisputeSoft](https://www.disputesoft.com/video-game-developer-awarded-8-5-million-in-patent-dispute-against-clash-of-clans-creator/)) |

### MLBB itself shows that store takedowns are the real threat

MLBB's predecessor, *Mobile Legends: 5v5 MOBA*, was **pulled from Google Play after Riot complained** and relaunched under a new name ([Sportskeeda](https://sportskeeda.com/esports/mobile-legends-tracing-origin-india-s-banned-game)). Riot's US lawsuits were dismissed because the court said the case belonged in China ([PC Gamer](https://www.pcgamer.com/us-judge-tells-riot-to-take-league-of-legends-lawsuit-to-china)). Tencent was reportedly awarded about $2.9M in China, though reports conflict on whom against ([Game Developer](https://gamedeveloper.com/game-platforms/tencent-awarded-2-9m-in-case-against-dev-of-alleged-i-league-of-legends-i-clone)). The dispute ended in a confidential settlement in April 2024 ([Esports Legal News](https://esportslegal.news/2024/04/02/moonton-and-riot-games-settlement-ip-dispute/)).

Lanes, turrets and a jungle are effectively shared genre conventions. Riot's claims targeted heroes, abilities and designs. Separately, the Blizzard–Valve fight over "DOTA" shows that a genre-defining word can be owned as a trademark ([Engadget](https://www.engadget.com/2012-05-11-blizzard-and-valve-settle-dota-argument-blizzard-dota-is-now-bl.html)).

Supercell has not been found suing gameplay clones. It sends takedown notices to bot and cheat sites, and in April 2026 it ran a "Copycats Welcome" campaign rewarding players who switched from clones ([Ogilvy](https://www.ogilvy.com/work/copycats-welcome)). It does hold US trademarks for **CLASH** covering games ([TrademarkDir](https://trademarkdir.com/trademark/clash-79232107)).

### Malaysian law and store rules

Malaysia's Copyright Act 1987 protects code and art automatically, without registration ([Asia IP](https://asiaiplaw.com/article/malaysia-ip-guide-2025)). The Trademarks Act 2019 protects **well-known marks even if they are not registered locally** ([Chambers](https://practiceguides.chambers.com/practice-guides/trade-marks-copyright-2026/malaysia/trends-and-developments)), which likely covers "Mobile Legends." No Malaysian court case on game cloning was found.

Apple rejects copycat apps and bans using another developer's brand or icon in an app's name or icon ([Apple](https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection)). Google bans implying a link to another app ([Google Play](https://support.google.com/googleplay/android-developer/answer/9888374)). Store rules are stricter than copyright law on **names, icons, screenshots and keywords**.

In practice, the research's synthesis (not a lawyer's checklist) comes down to this:

| Avoid | Do instead |
|---|---|
| "Clash", "Royale", "Legends" or "Bang Bang" in the title, keywords or store text | Generic genre words such as "lane battler" or "card battler" |
| Calling the resource "Elixir", objectives "Lord" or "Turtle", towers "King" or "Princess" | Your own names, colours and icons |
| Units that resemble specific Clash Royale cards or MLBB heroes | An original theme and art style. Southeast Asian mythology is one example the research raised |
| Tracing MLBB's map or copying either game's on-screen layout and buttons | Your own map art and UI. Compare icon and screenshots side by side with both games before submitting |
| Ripped assets, a former employer's documents, or AI images prompted with rival names | Written IP-assignment contracts, licensed fonts and audio, and dated design files that prove independent creation |
| Launching without a trademark check | A search and registration of your own title and logo with MyIPO, Malaysia's IP office |

### Paid random rewards face rising rules

| Market | What applies | Status |
|---|---|---|
| Apple / Google | Must show odds before any paid random item | In force since 2017 / 2019 ([Fenwick](https://www.fenwick.com/insights/publications/apple-now-requires-disclosure-of-loot-box-odds); [Fenwick](https://fenwick.com/insights/publications/google-play-now-requires-disclosure-of-loot-box-odds)) |
| Malaysia | No loot-box gambling law. Draft industry code would require disclosure of odds and protections for children | Consultation ran 9 Sept–24 Oct 2026; not final ([CMCF](https://contentforum.my/wp-content/uploads/2026/09/PC-Paper-Draft-Gaming-Subcode.pdf); [Skrine](https://www.skrine.com/insights/alerts/september-2026/public-consultation-paper-on-gaming-sub-code)) |
| Malaysia (religious) | Federal Territories Mufti reportedly rules paid loot boxes impermissible | Religious opinion, date unconfirmed ([GamerBraves](https://gamerbraves.com/?p=95859)) |
| Indonesia | Mandatory age labels; gambling-like content can be removed | Enforced from Jan 2026 ([Rajah & Tann](https://www.rajahtannasia.com/viewpoints/from-law-to-action-introducing-the-indonesia-game-rating-system-igrs/)). A reported ban on paid loot boxes for minors is unverified ([Coda](https://www.coda.co/blog/indonesia-mr-tunas-regulation/)) |
| Thailand | Loot boxes reportedly not gambling | Date unconfirmed ([Tilleke & Gibbins](https://www.tilleke.com/insights/thailand-confirms-in-game-loot-boxes-do-not-constitute-gambling/6/)) |
| Philippines | No source found | Unknown |
| South Korea | Odds disclosure required by law | Since March 2024 ([Asia Economy](https://www.asiae.co.kr/en/article/2024010217184301389)) |
| Australia | Paid chance items mean a minimum M rating | Since Sept 2024 ([Classification Board](https://www.classification.gov.au/about-us/media-and-news/news/new-mandatory-minimum-classifications-for-gambling-games-content)) |
| Brazil | Loot boxes banned in games minors can access | Since March 2026 ([Machado Meyer](https://www.machadomeyer.com.br/en/recent-publications/publications/digital-law/law-15-211-25-protection-for-children-and-adolescents-in-the-digital-environment)) |
| EU | Leaked draft would ban paid loot boxes and pay-to-win for minors | Leak reported 9 Nov 2026; not official ([Euronews](https://euronews.com/2026/11/09/eu-to-blacklist-ten-manipulative-online-design-traps-leaked-draft-shows)) |

The draft Malaysian code targets mainly "operators and platforms" ([Rahmat Lim](https://www.rahmatlim.com/perspectives/articles/34595/mykh-communications-and-multimedia-content-forum-of-malaysia-conducts-public-consultation-on-proposed-gaming-sub-code)). A studio that self-publishes and runs its own servers is probably an operator, but a lawyer should confirm that against the final text.

The design that is safe in every market is: **no paid random chests**. Sell cosmetics and a season pass directly, make random drops earn-only, use one premium currency, and show prices in real money. Malaysia and Indonesia are Muslim-majority, so paid gacha also carries a reputational risk there.

## Design implications: the tensions to settle first

No shipped game has tested this exact combination. The evidence below **leans** in some directions but does not decide them. Cheap prototypes should. Each tension is presented as options, with the evidence on each side.

### 1. Lane count versus attention on a phone

The core risk. Clash Royale's two lanes in portrait are the proven ceiling for real-time play. Artifact's top quit reason was complexity, and every real-time three-lane mobile attempt failed or stalled. Three portrait lanes would each get roughly a third of the screen width, which is tight for units, health bars and fingers. That is an inference: no study of how many real-time lanes phone players can track was found.

**Option A, two lanes plus a contested middle.** Two lanes with a jungle or objective zone acting as the "third front." This is closest to proven, but less MOBA-like.

**Option B, three lanes on one screen.** This likely needs landscape or an angled camera, plus heavy simplification of each lane. Valve's Artifact rework adopted one-screen visibility, but too late to test it.

**Option C, three lanes, staggered heat.** Timed events make only one or two lanes "hot" at once, pulling attention to known places, as MOBA objective timers do.

**Option D, three lanes where untended lanes play themselves.** Minion waves fight on unless you invest cards there. This keeps the map alive but risks Artifact's "passive spectator" complaint.

### 2. Hero control versus card deployment

Four models exist. The **hero as a card** with one ability button is Clash Royale's proven model, and Supercell simplified it again in 2026 by switching to single-use abilities. The **leader as deck anchor** is Warcraft Rumble's, and its levelling read as grind. A **directly steered hero** was Force Arena's, which analysts said felt like two games at once. **Hero-like "Masters" that sit beside the deck** are Minion Masters' model, which kept only a niche PC audience.

One middle ground the research raised, untested anywhere, is a persistent hero that walks a lane on its own while you choose only when to fire its abilities. It adds MOBA flavour without a second control scheme, but it also adds a unit whose death and return need rules. A related sub-choice is whether abilities use a cooldown or one charge per deployment, which Clash Royale has now tried both ways.

### 3. Match length

Clash Royale runs 3 + 2 minutes, Marvel Snap about 3, Warcraft Rumble 3:30 + 1:00, Pokémon Unite 10 and MLBB 12–20. Artifact's 20–30 minutes was a core complaint. An early analysis of Honor of Kings' Western soft launch named 15-minute matches as the genre's main risk in the West ([PocketGamer.biz](https://www.pocketgamer.biz/can-strike-of-kings-continue-maintain-momentum)).

The options are a Clash-scale **3–5 minutes**, a "mini-MOBA" **5–8 minutes** with a compressed objective clock, or a Unite-style **10-minute hard cap**. Rumble shows short matches are necessary but not sufficient.

### 4. One resource or two

Single-resource designs (Clash Royale, Marvel Snap) succeeded. Extra economies are a recurring failure marker: Artifact's per-lane mana plus gold and shop, and Castle Burn's crystals plus castle upgrades. Clash Royale even charges hero abilities from the same elixir pool. Yet Pokémon Unite's removal of in-match gold and items was blamed for lost depth.

The options are a **single resource that map control feeds** (a jungle kill gives an elixir surge), a **single resource plus one small upgrade choice** (a turret kill unlocks one lane upgrade), or a **full gold-and-shop layer**. The last carries the most evidence against it.

### 5. Jungle and objectives

None of the card-game translations found kept a full jungle. That is an inference from a small sample. MLBB's own 2026 changes point to a card-native version, though: objectives that **spawn allied pushers in a lane**, and turrets that act as big economy events.

The options are **no jungle**, with only timed river objectives; **small camps you win by dropping cards on them** for elixir or buffs; or a **fuller jungle**. A final-phase objective works as a comeback lever, but Pokémon Unite drew criticism when one last hit decided too much. A capture that takes several seconds to contest may avoid that.

### 6. Snowballing versus comeback

The proven tools fall into three groups. **Early protection** includes MLBB's five-minute turret shields and anti-backdoor rule. **Late escalation** includes Clash Royale's double and triple elixir, and Unite's late scoring multiplier. **Sudden-death tiebreaks** come from Clash Royale. Clash Royale's instant-win King Tower keeps a trailing player alive.

A hard timer with an end-phase multiplier also removes the need for surrender votes. The tension is between comebacks that feel unearned and leads that make the last minutes pointless. MLBB's 2026 Golden Turrets raise turret rewards, which pushes toward bigger swings.

### 7. Unit autonomy, readability and randomness

Clash Royale's skill comes from placement plus predictable unit behaviour. Artifact's random attack arrows were resented because they overruled finished decisions. Marvel Snap's visible, up-front randomness was accepted. The game engine must be deterministic anyway (see the build section).

The open choices are how many targeting rules to have, whether cards snap to a lane instead of an exact spot (easier on small screens), and where randomness lives: before decisions, in view, or nowhere.

### 8. PvE-first versus PvP-first

"PvE-first" means two different things here. As a **build approach**, the evidence favours it: bot-only prototypes test fun with no server, and bots later fill queues. As a **product focus**, the evidence is mixed. Warcraft Rumble's 70-map campaign became a content treadmill. But Legends of Runeterra's surviving players gathered in its PvE mode, and Artifact's designer said new players lacked short-term goals.

A middle path is a PvP core with "systemic" PvE. That means rotating rule changes, bosses on the PvP map and co-op modes, rather than hand-built levels. Bots used in matchmaking raise disclosure questions. Clash Royale reportedly limits them to low ranks.

### 9. Monetization fairness

Four models have evidence behind them. **Card levels** (Clash Royale) earn well but drive "pay-to-win" anger, especially when the level cap rises. **Grind-to-compete** (Warcraft Rumble) and **pre-match power items** (Pokémon Unite) drew the same criticism. **Cosmetics plus a season pass, with every gameplay card earnable** (Marvel Snap) won goodwill but earned little per download, and drew backlash when it added random paid caches ([Naavik](https://naavik.co/digest/marvel-snap-card-acquisition-spotlight-caches/)).

Asian players accept cosmetic spending more readily than paid power, and spend per player in Southeast Asia is low. Regulation increasingly targets paid randomness. The options are levels with a hard cap and normalised ranked play, cosmetics-only, or "sidegrade" cards that change how you play without adding raw power.

### 10. Solo duel or team play

A one-on-one game removes MLBB's biggest complaints (absent or toxic teammates, forced roles). But team play is the region's culture. Clash Royale's 2025 surge also coincided with social modes: four-player Merge Tactics, and the return of 2v2 in August 2025 ([SQ Magazine](https://sqmagazine.co.uk/clash-royale-statistics/)).

The options are a 1v1 core with a 2v2 mode, or a 2v2 core. In a 2v2 game, each partner could command different lanes, which would also split the attention load of three lanes (an untested idea).

### 11. Card pool size versus balance workload

Every new card must be balanced against every lane, objective and hero, so content cost grows fast. Runeterra's content cost more than it earned. Marvel Snap's 2026 roadmap focused on fixing balance and bugs without full app updates ([Marvel Snap Zone](https://marvelsnapzone.com/future-of-marvel-snap-roadmap-announcement/)). Clash Royale reuses existing cards for Heroes and Evolutions.

The options are a small pool of cards that interact deeply, a large pool, or variants of existing cards. In every case, balance numbers should live in data files the owner can tune without code changes.

### 12. Familiar surface versus original identity

Looking like Clash Royale or MLBB makes the game instantly understandable. But it raises legal and store risk, and clones of Clash Royale mostly struggled commercially ([PocketGamer.biz](https://www.pocketgamer.biz/are-clash-royale-clones-making-any-money)). Familiar IP buys downloads, not retention. The choice is how close to sit to the reference games in look and terminology, while keeping the mechanics, which are free to use.

### Open questions the evidence cannot settle yet

| Question | Cheapest way to find out |
|---|---|
| Can players follow three real-time lanes on a phone? | Grey-box prototype vs a bot; watch 5–10 people for missed threats |
| Portrait or landscape? | Build the same map both ways; compare missed threats and finger errors |
| What match length brings players back for "one more"? | Time-limit variants in the prototype; measure rematch rate |
| Will the in-app browser run 100 units on a budget Android phone? | Test on the cheapest TECNO or Infinix phone in week 2 |
| Real lag from Jakarta and Manila to Singapore | Ping test from local phones on mobile data |
| Will Southeast Asian players accept card levels? | No regional survey exists; test with paired variants in soft launch |
| Is the studio an "operator" under the Malaysian code, and what is the final text? | Malaysian IP or regulatory lawyer, after the code is finalised |
| Is the planned title clear to register? | MyIPO trademark search |
| What is the Philippines' position on loot boxes? | Unknown; local legal check before monetization design is locked |
| Can a prototype hit about 35–40% day-1 and 10% day-7 return rates? | Small paid test in Indonesia or the Philippines; these targets are the research's suggestions, not industry rules |

### Bottom line

The two reference games are converging from opposite directions. Clash Royale keeps adding MOBA-style hero abilities, then trimming them back to keep phone play manageable. MLBB is turning its objectives into "spawn extra units in a lane," which is a card-game mechanic. The gap between them is real but narrow: a game that is **MOBA-shaped but Clash-sized**. The evidence suggests every past attempt fell out of that gap by adding something: a steered hero, a third busy lane, a second economy, a campaign treadmill, or paid power. The best-supported first step is therefore a test of whether players can read the map, not a list of features.

For a Kuala Lumpur-based owner, the market logic and the technical logic point the same way. Malaysia is the place to learn whether people will pay, and Indonesia and the Philippines are the cheap places to learn whether people come back. A web prototype played against bots answers the readability and fun questions before any server, store listing or legal spend. Two choices are expensive to undo and belong at the start. The first is whether the game rules are whole-number deterministic. The second is whether the economy will lean on paid randomness, which several launch markets are moving to restrict. Most other choices can stay open until players have had their hands on a prototype.

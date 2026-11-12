# Lane/Location Card Games and MOBA-to-Strategy Translations: Cautionary and Inspirational References

*Method note (as of 2026-11-11):* Findings come from web search result summaries. Direct page fetches were blocked in this session for pcgamer.com and blog.udonis.co (the host was not in the allowed network list), so for those sources I relied on search-engine excerpts and attributed them. The shared web-search budget ran out before I could search Heroes of the Storm, Clash Mini, Artifact's gold and respawn rules, or PvZ Heroes' lane rules. Those items are listed under Gaps, not stated as fact. Revenue figures are third-party estimates (AppMagic, Sensor Tower, data.ai), not company disclosures, unless a source says otherwise.

---

## Q1. Game-by-game profiles: core mechanics, performance, and documented reasons for success or failure

### Takeaway
The multi-lane or multi-location games that lasted (Marvel Snap, and to a smaller degree Stormbound) kept each lane's state tiny and the match short. Artifact, the most faithful MOBA-to-card translation, collapsed within weeks of its November 2018 launch. Its two biggest problems were complexity and the paid-card economy. Blizzard's Clash Royale-style Warcraft Rumble, the closest existing analogue to the planned hybrid, lost 92% of its monthly mobile revenue in its first year and stopped getting new content in July 2025.

### Cited Findings

#### Artifact (Valve; launched 28 Nov 2018; development ended 4 Mar 2021)
**Mechanics**
- Three lanes, each acting as its own board. A player wins by destroying two of the opponent's 40-health towers — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game)
- Each lane has its own mana pool — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game)
- Items are not drawn from the deck. Players buy them in a shop during the match and equip them on heroes — [Game Informer, "How do you play it and how will you pay for it"](https://gameinformer.com/games/artifact/b/pc/archive/2018/03/09/how-do-you-play-it-and-how-will-you-pay-for-it)
- Each player controls five heroes, some taken from Dota 2 and some new — [Fandom "How to play Artifact"](https://www.fandom.com/articles/1833-how-to-play-artifact-valves-new-hearthstone)
- Random attack "arrows": a unit facing an empty slot gets a straight arrow half the time and a left or right arrow a quarter of the time each — [Zvi, "Review: Artifact" (22 Nov 2018)](https://thezvi.wordpress.com/2018/11/22/review-artifact/)
- Match length: one blogger estimated a game at 20–30 minutes and compared it to "playing three Hearthstone games at once" — [mightygodking.com (5 Dec 2018)](https://mightygodking.com/2018/12/05/artifactuals/). Valve later cut the timers: the standard timer went from 2 minutes to 1 minute per round and its starting bank from 5:00 to 3:00, and the tournament timer went from 1 minute to 30 seconds per round — [GamesEar](https://www.gamesear.com/news/artifact-update-has-now-greatly-increased-the-speed-of-matches)
- Business model: a $20 base game with starter packs, extra cards bought as packs or traded, and direct integration with the Steam Community Market — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game)

**Performance**
- All-time concurrent peak of 60,740 on SteamCharts on 29–30 Nov 2018, the day after launch. The count roughly halved the next day and halved again the day after — [GameRevolution](https://www.gamerevolution.com/news/486511-artifact-player-count); [PC Gamer](https://www.pcgamer.com/artifact-has-had-a-steep-decline-in-players-since-launch). One outlier source gives a 46,456 peak, and SteamDB shows about 60,646, so the figures differ slightly by tracker.
- New low of 2,196 concurrent players on 8 Jan 2019 — [Inven Global](https://labs.invenglobal.com/articles/7222/artifact-sinks-to-2200-concurrent-players). The 24-hour peak was about 3,204 by mid-January 2019 — [TheGamer](https://www.thegamer.com/artifact-concurrent-player-count-down-75-percent-since-january/). Daily peaks were 940–1,384 by around March 2019 — [GameRevolution](https://www.gamerevolution.com/news/486511-artifact-player-count)

**Documented reasons for failure and the response**
- 29 Mar 2019: Valve's "Towards A Better Artifact" post said the game had "deep-rooted issues". Valve stopped minor updates to re-examine game design, the economy and the social experience, and called Artifact the biggest gap between its expectations and the actual result — [Engadget](https://www.engadget.com/2019-03-30-artifact-do-over.html); [GameSpot](https://www.gamespot.com/articles/valve-is-slowing-artifact-updates-to-handle-the-ga/1100-6465923/); [Shacknews](https://shacknews.com/article/110947/valve-halts-artifact-updates-to-focus-on-deep-rooted-issues)
- Designer Richard Garfield, laid off as a Valve contractor in early 2019, blamed the cards-for-money model. He said it looked generous to Magic: The Gathering players but stingy to people used to free-to-play digital card games, and he rejected the "pay-to-win" label — [Kotaku](https://kotaku.com/artifact-designer-says-it-failed-due-to-cards-for-money-1835212145). He also blamed review-bombing and the lack of short-term goals for new players — [Win.gg](https://win.gg/news/artifact-devs-discuss-the-launch-fate-and-future-of-artifact/). PC Gamer headline quoting him: "We wanted to avoid manipulating people" — [PC Gamer](https://www.pcgamer.com/richard-garfield-on-artifacts-failed-monetization-model-we-wanted-to-avoid-manipulating-people)
- Critical analysis by Zvi Mowshowitz, a former professional Magic player (8 Oct 2019). Reason #1 was that the game was "too complex and confusing": even good streamers struggled to explain what was happening, and complexity was the top complaint among players who quit. Reason #3 was that the arrows were the kind of randomness players resent, unlike draw randomness, which they accept — [LessWrong](https://www.lesswrong.com/posts/6gptwR8jBkzqhWaTY/artifact-what-went-wrong); [author's blog](https://thezvi.wordpress.com/2019/10/08/artifact-what-went-wrong/)
- A Hacker News thread summarizing an interview says Garfield's team largely dismissed player complaints about randomness and frustrating cards. This is a secondhand account — [Hacker News](https://news.ycombinator.com/item?id=21199134)
- A Medium analysis argues that Valve playtested mainly with professional players and Dota 2 fans, and that players often felt like passive spectators with unclear decision feedback. This is opinion — [Medium, "The Failure of Artifact"](https://khuyenforsythe.medium.com/the-failure-of-artifact-2968ce1725e7)
- Wikipedia summary: the game was criticized for its high learning curve and for a monetization model some saw as pay-to-win — [Wikipedia](https://en.wikipedia.org/wiki/Artifact_(video_game))

**Artifact 2.0, later renamed Foundry (closed beta from March 2020)**
- All three lanes moved onto a single screen. The random arrows were removed. Cards could no longer be bought and were unlocked only by playing — [PC Gamer, "Artifact 2.0 is less complicated, but is it a better game?"](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/); [Neowin](https://www.neowin.net/news/valve-announces-artifact-beta-20-bringing-major-changes-to-the-card-game/)
- One creep per lane per round. Players choose the lane where each starting hero deploys. A Hero Draft mode was added. Items became more expensive and players could earn more gold — [ResetEra beta thread](https://www.resetera.com/threads/artifact-2-0-beta-ot-yes-the-artwork-is-final.238477/index.php)
- Old cards, decks and stats did not carry over — [Neowin](https://www.neowin.net/news/valve-announces-artifact-beta-20-bringing-major-changes-to-the-card-game/)

**End of development (4 Mar 2021)**
- Valve's post "The Future of Artifact": "We haven't managed to get the active player numbers to a level that justifies further development at this time." The 2.0 beta became *Artifact Foundry*, the original became *Artifact Classic*, both became free, and neither gets further updates. Valve said Foundry lacks polish and art but "the core gameplay is all there" — [Game Developer](https://www.gamedeveloper.com/console/valve-is-fully-ending-development-on-its-digital-tcg-i-artifact-i-); [Shacknews](https://www.shacknews.com/article/123128/artifact-goes-free-to-play-following-a-halt-on-all-further-updates?amphtml=1); [Kotaku](https://kotaku.com/valves-card-game-is-officially-dead-1846410290)

#### Marvel Snap (Second Dinner; global launch October 2022; still live as of the latest coverage found, May 2026)
**Mechanics and design rationale**
- Three locations, revealed over time. The core question is "can I win two out of these three locations?" Ben Brode, Second Dinner's co-founder and former Hearthstone game director, describes the locations as a source of both "input and output randomness" and a bluffing layer — [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/); [Guardian via PressReader](https://www.pressreader.com/usa/the-guardian-usa/20221112/282024741243323)
- Six turns. The team tested five, six and seven turns and tried skipping turn one. Six gave the "perfect blend of fast games while doing cool combos" — [GamesBeat](https://gamesbeat.com/ben-brode-bets-super-speed-will-make-marvel-snap-stand-out/); [mobilegamer.biz](https://mobilegamer.biz/second-dinners-ben-brode-reveals-marvel-snaps-recipe-for-success-literally/)
- 12-card decks, from a "craving for a bite-size experience with the strategy of a card game". The small size also makes it practical to build a whole deck on a phone — [Guardian via PressReader](https://www.pressreader.com/usa/the-guardian-usa/20221112/282024741243323)
- Simultaneous turns, so players don't spend "half your time doing nothing… waiting for the opponent" — [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/); see also [Game Developer, "Designers: don't sleep on Marvel Snap's simultaneous turns"](https://www.gamedeveloper.com/game-platforms/designers-don-t-sleep-on-marvel-snap-s-simultaneous-turns)
- Deliberately low complexity: one card type and "less numbers on a card than in any other card game", aiming at "maximizing the depth of the complexity we chose to add" — [Apple Developer, "Behind the Design: Marvel Snap"](https://developer.apple.com/news/?id=sosm2p7q); [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/)
- Brode's GDC talk reportedly named the influences as Backgammon's doubling cube (the source of "Snap"), simultaneous reveals, the locations from the board game Smash Up, and Clash Royale's sub-five-minute games — [search summary of Brode GDC coverage via GamesBeat/mobilegamer.biz](https://mobilegamer.biz/second-dinners-ben-brode-reveals-marvel-snaps-recipe-for-success-literally/). This is a secondhand summary.
- There is no unit-versus-unit combat: the power of the cards at each location is simply added up and compared. A design analysis counts at most 12 cards a player can have on the board in a match. Each location carries one random rule — [Keith Burgun, "Marvel Snap is a testament to the power of ruleset design"](https://keithburgun.net/marvel-snap-is-a-testament-to-the-power-of-ruleset-design)

**Performance**
- First week: 5.3M downloads and $2M. First month: $10M revenue and 12M downloads — [mobilegamer.biz](https://mobilegamer.biz/marvel-snap-clears-10m-revenue-12m-downloads-in-its-first-month/)
- $50M and 18M downloads by March 2023 — [mobilegamer.biz](https://mobilegamer.biz/marvel-snap-hits-50m-revenue-18m-downloads-since-launch/). $104.3M by late August 2023, and more than $116M on mobile in the first year (AppMagic). Peak month was December 2022 at $13.8M (AppMagic), and 2023 averaged $8–9M a month — [Game World Observer / WN Hub](https://wnhub.io/news/investment/item-42247); [GameDev Reports](https://gamedevreports.substack.com/p/appmagic-marvel-snap-earned-more). data.ai put December 2022 at about $14M — [Naavik](https://naavik.co/digest/marvel-snap/)
- Decline, per AppMagic via the Udonis aggregator: 2023 about $99M, 2024 about $60M, 2025 about $26M, 2026 year-to-date about $7M, lifetime about $218M (in-app purchase revenue only, no ads). Monthly revenue fell from a $12.6M peak to $1.5M, an 88% drop — [Udonis](https://www.blog.udonis.co/statistics/marvel-snap). **Caveats:** these are aggregator estimates; the 2022 figure (~$26M) is identical to 2025; and the methodology (net or gross of platform fees) differs from the "$116M first year" series, so the two sets of numbers are not directly comparable.
- 2022 analysis warned that falling downloads would erode daily revenue and that revenue per download was low compared with competitors — [Deconstructor of Fun (Nov 2022)](https://www.deconstructoroffun.com/blog/2022/11/24/marvel-snap-the-one-deconstruction-to-rule-them-all)

**January 2025 US ban and publisher change**
- On about 18–19 Jan 2025 the game went offline in the US with the TikTok ban, because its publisher Nuverse is a ByteDance subsidiary. It returned around 21 Jan 2025 — [PC Gamer](https://www.pcgamer.com/games/card-games/after-falling-victim-to-the-recent-us-tiktok-ban-marvel-snap-switches-to-a-new-us-based-publisher); [Inverse](https://www.inverse.com/gaming/marvel-snap-tiktok-ban-new-publisher)
- Publishing moved to Skystone Games, a small US company, with Second Dinner taking "almost all operational and publishing responsibilities" in-house — [PocketGamer.biz](https://www.pocketgamer.biz/marvel-snap-secures-new-publisher-skystone-games-after-surprise-takedown); [VGC](https://videogameschronicle.com/news/marvel-snap-dev-says-it-has-a-new-publisher-to-ensure-tiktok-shutdown-never-happens-again). Wikipedia lists Nuverse as publisher for 2022–2025 and Skystone from 2025 — [Wikipedia](https://en.wikipedia.org/wiki/Marvel_Snap). A later headline says the game would "continue to operate" despite Nuverse closing as ByteDance exits gaming. I saw only the headline, so details are unconfirmed.

**2026 status**
- Second Dinner raised a $100M Series B led by Griffin Gaming Partners in January 2024 — [BusinessWire](https://www.businesswire.com/news/home/20240108646678/en/Second-Dinner-Secures-$100M-Series-B-Investment-Led-by-Griffin-Gaming-Partners)
- The March 2026 roadmap centred on infrastructure: fewer crashes and bug fixes that don't need a full client update — [Marvel Snap Zone](https://marvelsnapzone.com/future-of-marvel-snap-roadmap-announcement/); [Game Rant](https://gamerant.com/marvel-snap-future-second-dinner/)
- Late April to early May 2026: 16 layoffs. Brode: "we're still here, still building, still committed to this game." Work on a new unannounced game continues — [MassivelyOP (4 May 2026)](https://massivelyop.com/2026/05/04/marvel-snaps-second-dinner-undertakes-layoffs-to-make-sure-the-game-can-keep-going/); [mobilegamer.biz](https://mobilegamer.biz/layoffs-at-marvel-snap-maker-second-dinner-as-work-on-new-game-continues/)

#### Stormbound (Paladin Studios, later Sheepyard and Stormbound Games; mobile 2017, Steam and Kongregate 15 May 2018)
- A grid of 4 columns × 5 rows with bases at opposite ends. Units move a number of tiles equal to their speed at the start of their owner's turn, can step into adjacent lanes to attack enemies, and win by reducing the enemy base's health to zero. Mana grows by 1 per turn. The game is turn-based — [148Apps](https://www.148apps.com/reviews/stormbound-review); [StatelyPlay](https://statelyplay.com/2017/10/06/strategy-101-stormbound-basics-edition/); [MobileSyrup ("Hearthstone meets chess")](https://mobilesyrup.com/2018/12/15/stormbound-kingdom-wars-hearthstone-chess-review/)
- **The brief's "real-time-ish" premise is not supported.** Sources describe it as turn-based. Apple did include it in its "Real-Time Competition" Trends of 2017 list — [Kongregate blog](https://blog.kongregate.com/2017-year-in-review-publishing)
- Reception: "tactical and smart but long matches" — [TouchArcade](https://toucharcade.com/2017/09/22/stormbound-first-impressions-tactical-and-smart-but-long-matches/). "Just a bit too slow for its own good", but praised for comfortable one-handed play on iPhone — [148Apps](https://www.148apps.com/reviews/stormbound-review). Paywall criticism — [Player.One](https://www.player.one/stormbound-review-kingdom-wars-deck-cards-freemium-120355). Steam rating "Mostly Positive" from 1,223 reviews — [Discord game listing](https://discord.com/game/stormbound-1124354765556568255)
- Lifespan: development moved to Sheepyard after Paladin's 2019 layoffs, and in 2022 the game passed to the new Polish studio Stormbound Games Sp. z o.o. — [Stormbound Kitty release notes](https://stormbound-kitty.com/releases/09-2022). Paladin Studios itself closed in May 2024, laying off 45 people, and said existing games would keep getting technical support — [Game World Observer](https://gameworldobserver.com/2024/05/03/paladin-studios-shutdown-layoffs-45-employees)
- No reliable revenue or player figures found. One third-party tracker shows about 131 players (Steam, unofficial) — [Playtracker](https://playtracker.net/insight/game/127472)

#### Plants vs. Zombies Heroes (EA/PopCap; 2016)
- A digital collectible card game using characters from earlier PvZ games — [Wikipedia](https://en.wikipedia.org/wiki/Plants_vs._Zombies_Heroes)
- **The brief's premise that it was "shut down" could not be confirmed.** No official end-of-service notice was found. EA's help page marks the title as "Limited Support", meaning no game-specific support — [EA Help](https://help.ea.com/en/games/plants-vs-zombies/plants-vs-zombies-heroes/). A fan wiki logs bug-fix-only updates into May–June 2026 — [PvZ Wiki update history](https://plantsvszombies.wiki.gg/wiki/Plants_vs._Zombies_Heroes/Update_history). The store listing is still live — [Google Play](https://play.google.com/store/apps/details?id=com.ea.gp.pvzheroes&hl=en_IN)
- Players on EA's forum noted the slowdown in new event cards and speculated the game was winding down. This is player opinion, not an official statement — [EA Forums](https://forums.ea.com/discussions/plants-vs-zombies-franchise-en/pvz-heroes-game-coming-to-an-end/10274870/replies/10274875)

#### Warcraft Rumble (Blizzard; launched November 2023; new content ended 2 Jul 2025). The closest existing analogue to a "Clash Royale plus heroes" hybrid
- Widely described as a Clash Royale-style game with more PvE and a Hearthstone overlay. Players deploy "minis" that have talents, and Blizzard openly cited Clash Royale as an inspiration — [Destructoid review](https://www.destructoid.com/reviews/review-warcraft-rumble/); [PocketGamer review](https://www.pocketgamer.com/warcraft-rumble/review)
- Metascore 70 from 9 critics. Praised for its mechanics and presentation, criticized for an unfriendly economy, grind walls and progression gating, plus performance and loading complaints — [Metacritic](https://legacy.prod.metacritic.com/game/ios/warcraft-rumble/critic-reviews); [Destructoid](https://www.destructoid.com/reviews/review-warcraft-rumble/); [GameBrain](https://gamebrain.co/game/warcraft-rumble)
- Revenue: November 2023 is reported as $17M or as $24.6M, depending on the source. Monthly revenue fell below $2M in April 2024 and was about $2M in October 2024, a 92% decline in the first year — [PocketGamer.biz](https://www.pocketgamer.biz/warcraft-rumble-is-making-the-move-to-pc-with-monthly-mobile-earnings-down-92-in-first-year/). Cumulative revenue was about $64.2M gross excluding China by late 2024, against another headline saying it "approached $40 million" — [WN Hub](https://wnhub.io/news/finance/item-44025). These two figures conflict.
- Blizzard moved the game to PC with a Battle.net beta — [PocketGamer.biz](https://www.pocketgamer.biz/warcraft-rumble-is-making-the-move-to-pc-with-monthly-mobile-earnings-down-92-in-first-year/)
- 2 Jul 2025: Blizzard stopped new content and laid off most of the team during Microsoft's layoffs of up to about 9,000 people. Blizzard said the game "struggled to find its footing relative to our ambition for its long-term success". Only systemic events and bug fixes continue — [Engadget](https://www.engadget.com/gaming/blizzard-is-giving-up-on-its-warcraft-mobile-game-amid-layoffs-215021940.html); [Icy Veins](https://www.icy-veins.com/wow/news/warcraft-rumble-is-going-into-maintenance-mode/); [Wikipedia](https://en.wikipedia.org/wiki/Warcraft_Rumble)

#### Pokémon Unite (TiMi Studio Group / The Pokémon Company). Brief comparison
- 5v5 matches capped at 10 minutes. Teams score by dunking energy into goals, the higher score wins, and points double in the final 2 minutes to allow comebacks — [Game8](https://game8.co/reviews/pokemon-unite/pokemon-unite-review); [Rappler](https://www.rappler.com/technology/reviews/pokemon-unite-review/)
- A Chinese industry article says Unite "abandons the minion lanes, defense towers, and complex equipment systems" in favour of scoring — [Glodomtec](https://www.glodomtec.com/news/info.aspx?itemid=1794&lcid=9). See the inference below: this overstates the simplification.
- Held items are chosen before the match and unlocked or upgraded outside it instead of being farmed in-match. This created pay-to-win and grind criticism — [Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/pokemon_unite); [ComicBook](https://comicbook.com/gaming/news/pokemon-unite-review/)
- Revenue settled at roughly ¥10–15M a month in early 2022, mainly in China. This is an older, single source — [Glodomtec](https://www.glodomtec.com/news/info.aspx?itemid=1794&lcid=9)

#### Magic Chess: Go Go (Moonton; MLBB auto-battler spin-off)
- Soft launch in Malaysia and Singapore on 29 Nov 2024; Southeast Asia launch on 21 Feb 2025 (Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand); global launch on 28 May 2025 — [Wikipedia](https://en.wikipedia.org/wiki/Magic_Chess:_Go_Go)
- Made by the original MLBB team and set in the MLBB universe with familiar MLBB heroes, as a separate app — [Moonton news](https://en.moonton.com/news/177.html)
- Passed 15M downloads less than a month after the APAC launch — [Moonton news](https://en.moonton.com/news/177.html). Passed 30M downloads within two weeks of a later launch; sources don't say clearly which launch — [Wikipedia](https://en.wikipedia.org/wiki/Magic_Chess:_Go_Go)
- Indonesia, the Philippines and Malaysia were the top markets for downloads and revenue (Sensor Tower data via a secondary source). One secondary report says revenue "significantly lagged behind MLBB", with no underlying data — [Wikipedia / secondary](https://en.wikipedia.org/wiki/Magic_Chess:_Go_Go). **Unconfirmed: no official revenue figures found.**
- Debuted at the 33rd SEA Games (December 2025) as the first mobile auto-chess medal title there — [Moonton news](https://en.moonton.com/news/278.html)

#### Dota Underlords (Valve; 2019). Another Valve MOBA-IP spin-off decline
- June 2019 peak of 202,254 concurrent players, against an 18,664 30-day peak in early 2020, about a 90% drop — [PC Gamer](https://www.pcgamer.com/dota-underlords-peak-player-count-has-dropped-by-more-than-90-percent); [Shacknews](https://shacknews.com/article/115662/dota-underlords-player-peak-count-on-steam-has-dropped-by-90-percent)
- Causes cited: little developer support, fading interest in auto-battlers, and the rise of Riot's Teamfight Tactics — [PC Gamer](https://www.pcgamer.com/dota-underlords-peak-player-count-has-dropped-by-more-than-90-percent). Valve acknowledged that updates had slowed to mostly balance changes because staff were helping ship other projects and because of COVID-19 — [GamingOnLinux](https://www.gamingonlinux.com/articles/17356/)

#### Legends of Runeterra (Riot), pivot to Path of Champions
- January 2024: Riot laid off about 530 staff (11%). Runeterra was "costing significantly more to develop and support than it generates", had been subsidised by other Riot titles, and its smaller team would focus on Path of Champions, a PvE roguelike mode. The game was not shut down — [Game Developer](https://www.gamedeveloper.com/business/riot-games-overreached-with-big-bets-and-now-530-people-are-losing-their-jobs); [Dot Esports](https://dotesports.com/lor/news/legends-of-runeterra-to-be-drastically-scaled-back-due-to-financial-shortcomings); [AFK Gaming](https://afkgaming.com/esports/news/riot-games-lays-off-530-employees-provides-update-on-riot-forge-and-legends-of-runeterra)

### Inferences
- The cluster of failures (Artifact, Underlords, Warcraft Rumble, the Runeterra cutbacks) shows that well-known MOBA or strategy IP plus a famous designer or studio gets a large launch spike but does not protect retention. Artifact's peak halved within 48 hours and Rumble's revenue fell 92% in a year.
- The one clear success in lane design, Marvel Snap, came from a team that cut every source of per-lane bookkeeping it could, and it still lost about 88% of peak monthly revenue by 2026 (AppMagic estimate). Even an elegant design decays steeply on mobile, so the cost of live ops has to be sized to the long tail, not to the launch.
- Warcraft Rumble is the most direct warning for this project. It was real-time Clash Royale-style deployment plus hero-like leaders on a famous IP from a top studio, and it struggled on economy and grind friction, not on the core loop, which critics liked.

### Gaps
- Artifact rules not confirmed by a source in this session: the 80-HP Ancient that appears after a tower falls, gold earned from kills, the hero death and respawn timer, the Secret Shop, initiative passing, deck-size rules, and the mobile version Valve promised. All are from background knowledge and need verification.
- Plants vs. Zombies Heroes lane rules (5 lanes, terrain and amphibious lanes, plants and zombies taking turns in phases), launch-date specifics and download or revenue figures were not searched before the budget ran out.
- No Stormbound revenue or download milestones were found, and its 2026 operating status is unconfirmed.
- Warcraft Rumble's exact map structure (number of lanes or paths, gold mines, the leaders' role) is not covered by the sources retrieved.
- Magic Chess: Go Go revenue data was not available. Only a secondary claim that it trails MLBB was found.
- No authoritative Marvel Snap player count (DAU or MAU) for 2025–2026 was found. A third-party estimate of about 249K MAU from AppGoblin is low-confidence.

---

## Q2. What made three-lane designs feel overwhelming (Artifact) versus elegant (Marvel Snap)?

### Takeaway
Both games ask the player to "win 2 of 3 lanes". Artifact multiplied that by full Dota-style combat inside every lane: units fighting units, random attack arrows, a separate mana pool per lane, an item shop, five heroes, and 20–30-minute games, originally spread across separate boards. Marvel Snap made each lane a sum of at most four cards' power per player, with no combat, simultaneous turns, locations revealed one at a time, and 6-turn games of about 3 minutes. Valve's own 2.0 rework moved toward Snap's choices by putting all lanes on one screen, removing the arrows and simplifying creep deployment, but it was too late.

### Cited Findings
- Artifact: complexity was the #1 reason players quit, and streamers struggled to explain games — [LessWrong / Zvi](https://www.lesswrong.com/posts/6gptwR8jBkzqhWaTY/artifact-what-went-wrong)
- Artifact: the lanes were separate boards. Players could zoom out to see all three — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game). The 2.0 rework "squeezed" all lanes onto a single screen — [PC Gamer](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/); [Neowin](https://www.neowin.net/news/valve-announces-artifact-beta-20-bringing-major-changes-to-the-card-game/)
- Artifact: each lane has its own mana pool, so the player tracks three separate resource states — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game)
- Artifact: random arrows decide attack direction when no enemy is directly opposite — [Zvi review](https://thezvi.wordpress.com/2018/11/22/review-artifact/). Players resented this randomness because it overrides board decisions they made, unlike draw randomness — [LessWrong](https://www.lesswrong.com/posts/6gptwR8jBkzqhWaTY/artifact-what-went-wrong). 2.0 removed the arrows — [PC Gamer](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/)
- Artifact: games took 20–30 minutes, "like playing three Hearthstone games at once" — [mightygodking.com](https://mightygodking.com/2018/12/05/artifactuals/). Valve halved the turn timers — [GamesEar](https://www.gamesear.com/news/artifact-update-has-now-greatly-increased-the-speed-of-matches)
- Artifact 2.0: one creep per lane per round, and players choose each starting hero's lane, which replaced random placement — [ResetEra](https://www.resetera.com/threads/artifact-2-0-beta-ot-yes-the-artwork-is-final.238477/index.php)
- Marvel Snap: no direct combat. Card power at each location is summed and compared, with at most 12 cards per player on the board across the whole match — [Keith Burgun](https://keithburgun.net/marvel-snap-is-a-testament-to-the-power-of-ruleset-design)
- Marvel Snap: locations are revealed over time, which spreads out what the player has to learn and creates bluffing. The randomness is front-loaded and visible ("input randomness") — [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/)
- Marvel Snap: simultaneous turns remove the time spent waiting on the opponent — [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/). Six turns was tuned against five and seven — [GamesBeat](https://gamesbeat.com/ben-brode-bets-super-speed-will-make-marvel-snap-stand-out/)
- Marvel Snap: one card type and fewer numbers on a card than any other card game — [Apple Developer](https://developer.apple.com/news/?id=sosm2p7q)
- Marvel Snap borrowed match length from Clash Royale (games under five minutes) — [mobilegamer.biz summary of Brode's GDC talk](https://mobilegamer.biz/second-dinners-ben-brode-reveals-marvel-snaps-recipe-for-success-literally/)
- Stormbound, a 4-lane grid: reviewers called matches long and slow despite the turn-based clarity — [TouchArcade](https://toucharcade.com/2017/09/22/stormbound-first-impressions-tactical-and-smart-but-long-matches/); [148Apps](https://www.148apps.com/reviews/stormbound-review)

### Inferences
Comparison table synthesized from the findings above:

| Dimension | Artifact (2018) | Artifact 2.0 / Foundry (2020) | Marvel Snap (2022) |
|---|---|---|---|
| Timing | Alternating turns with initiative; 20–30 min games | Same structure, faster | Simultaneous turns; 6 turns, ~3 min |
| Lane visibility | Separate boards with zoom-out | All lanes on one screen | All 3 locations always on one portrait screen |
| State per lane | Up to 5 heroes in total plus creeps, combat, HP, items, tower HP, per-lane mana | One creep per lane per round; chosen hero lanes | ≤4 cards per side; one summed power number |
| Resources | Per-lane mana plus gold and shop | Gold rebalanced | One global energy, +1 per turn |
| Randomness | Arrows (resented), creep placement, draws | Arrows removed | Location reveal (visible, front-loaded) plus draws |
| Win condition | Destroy 2 of 3 towers (or the Ancient, unverified) | Same | Win 2 of 3 locations at turn 6 |

- Cognitive load scaled with the number of interacting objects per lane multiplied by the number of lanes. Snap gets three lanes cheaply because each lane reduces to one number per side. A real-time game cannot use Snap's "summed power" shortcut directly, so the planned hybrid needs other ways to compress lane state: fewer units per lane, automatic lane resolution, or clear at-a-glance lane health or "winning/losing" indicators.
- Randomness that changes the result of a decision the player has already made (Artifact's arrows) was resented. Randomness that is visible and arrives before decisions (Snap's location reveals) was accepted as strategy. For a real-time hybrid, unit AI targeting must be predictable and readable, never a coin flip.
- Artifact's original layout, with separate boards per lane, made players hold the other lanes in memory. Valve's fix in 2.0 was simultaneous visibility. A 3-lane real-time game on a portrait phone has to show all three lanes (or a clear minimap with alerts) at once. Clash Royale's 2 lanes on one screen is the proven ceiling for real-time attention. That last point is my inference; this session did not research Clash Royale itself.
- Real-time play is a fourth multiplier that neither Artifact nor Snap faced. Snap's simultaneous turns remove waiting but not deliberation time. Tracking three lanes in real time on a phone is closer to an RTS attention problem than to a card game, so expect the Artifact failure mode to get worse, not better, unless lane count or lane autonomy is designed around it.

### Gaps
- No direct Valve or Second Dinner statement comparing the two games was found. The comparison is assembled from separate sources.
- No playtest or telemetry data on cognitive load in multi-lane games was found. Evidence is player and critic opinion plus quit-reason anecdotes.
- Artifact's average match length rests on one blogger's estimate. No official figure was found.

---

## Q3. How were MOBA ideas (heroes, items, gold, towers, creeps, jungle) translated into card or strategy mechanics?

### Takeaway
Artifact translated almost every MOBA system literally: heroes, creeps, towers, gold, an item shop and three lanes. It inherited Dota's complexity without Dota's real-time flow. The successful translations instead *drop or move* MOBA systems. Pokémon Unite replaced last-hitting and towers-as-win-condition with scoring and moved items out of the match. Magic Chess: Go Go kept only MLBB's heroes and identity inside an auto-battler. Marvel Snap uses no MOBA systems at all and borrows only the "2 of 3 lanes" structure.

### Cited Findings
- Artifact: heroes as cards (five per deck), towers with 40 HP, per-lane mana, and an in-match item shop paid for with gold earned in play — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game); [Game Informer](https://gameinformer.com/games/artifact/b/pc/archive/2018/03/09/how-do-you-play-it-and-how-will-you-pay-for-it)
- Artifact developer interview on why they chose Dota and how it shaped the card game — [TechRaptor](https://techraptor.net/gaming/interview/artifact-developer-interview-why-they-chose-dota-how-it-influenced-card-game-and). Only the title was seen; content not verified.
- Artifact 2.0 creeps: one creep auto-spawns per lane per round, and players pick lanes for their heroes. Items became pricier while gold income rose — [ResetEra](https://www.resetera.com/threads/artifact-2-0-beta-ot-yes-the-artwork-is-final.238477/index.php)
- Pokémon Unite: scoring goals replaces destroying a base. Industry commentary says it dropped "minion lanes, defense towers, and complex equipment systems" — [Glodomtec](https://www.glodomtec.com/news/info.aspx?itemid=1794&lcid=9). Held items are picked before the match and upgraded outside it rather than bought in-match — [Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/pokemon_unite). Points double in the final 2 minutes as a comeback mechanic, and matches are capped at 10 minutes — [Game8](https://game8.co/reviews/pokemon-unite/pokemon-unite-review)
- Magic Chess: Go Go: MLBB heroes reused as auto-battler units in the MLBB universe, built by the original MLBB team, as a separate app — [Moonton](https://en.moonton.com/news/177.html)
- Warcraft Rumble: Warcraft characters reused as deployable "minis" with talents in a Clash Royale-like structure — [Destructoid](https://www.destructoid.com/reviews/review-warcraft-rumble/)
- Dota Underlords: Dota 2 heroes reused as auto-battler units. It declined about 90% within months, as TFT took the genre — [PC Gamer](https://www.pcgamer.com/dota-underlords-peak-player-count-has-dropped-by-more-than-90-percent)

### Inferences
- **Heroes:** Each successful translation keeps heroes as recognizable, persistent "big units" (Magic Chess: Go Go, Rumble's minis and leaders). Artifact's heroes came with Dota-style death, respawn and item bookkeeping per hero, which compounded the load. For the planned hybrid, heroes probably work best as one or two persistent champions per player, not five.
- **Items and gold:** In-match shops (Artifact) add a whole decision phase. Pokémon Unite moved items to pre-match loadouts, which cut in-match load but created pay-to-win and grind backlash because progression drove item strength. A middle path is to keep in-match gold for *one* upgrade decision per lane or hero, with a few clearly readable choices, and make out-of-match unlocks sidegrades, not power.
- **Creeps:** Automatic, non-player-controlled waves are what Clash Royale-style deployment already resembles. Artifact 2.0's "one creep per lane per round" shows the designers cutting creep volume to reduce clutter.
- **Towers:** "2 of 3 towers" (Artifact) and "2 of 3 locations" (Snap) are the same win condition. It works, but only when lane state is cheap to read. Pokémon Unite's doubled late-game points address the MOBA snowball and "give up" problem that towers create.
- **Jungle:** None of the card or strategy translations found here kept a jungle. That suggests it is the first MOBA system to cut, or to abstract into a timed neutral objective. This is inference only.
- **IP reuse:** Moonton's Magic Chess: Go Go got very fast downloads (15M, then 30M) from MLBB fans, but reportedly monetizes well below MLBB. Hero reuse drives acquisition more than revenue (low confidence, secondary claim).

### Gaps
- Heroes of the Storm's shared team experience, its removal of items and last-hitting, and its talent trees could not be searched (search budget exhausted). Any statements about it would come from background knowledge and need sourcing.
- No source found for Moonton's design statements on how MLBB roles map to Magic Chess synergies or "Commander" mechanics.
- Clash Mini (Supercell's hero-based auto-battler, reportedly ended in 2023) could not be researched in this session.
- The Glodomtec claim that Unite "abandons minion lanes and defense towers" is loose. From background knowledge (unverified here), Unite still has lanes, wild Pokémon and goal zones that act like towers. Treat it as "simplified", not "removed".

---

## Q4. How do these games present multiple lanes on a portrait phone screen?

### Takeaway
Marvel Snap is the reference: three locations side by side on one portrait screen at all times, with very few cards per location and low numeric density, which keeps it comfortable to read. Stormbound fits a 4×5 grid into portrait and was praised for one-handed play, though matches felt long. Artifact was a PC landscape game whose lanes were separate boards at launch. Its fix, all lanes on one screen, came only in 2.0. Real-time multi-lane portrait layouts beyond Clash Royale's two lanes are unproven by the evidence found.

### Cited Findings
- Marvel Snap is played in portrait and is "incredibly easy on the eyes" — [MassivelyOP first impressions](https://massivelyop.com/2022/11/11/first-impressions-of-marvel-snap-an-addictive-mobile-card-game-by-hearthstones-former-director/)
- Snap design minimalism (one card type, fewer numbers per card) and 12-card decks chosen partly so deckbuilding works on a phone — [Apple Developer](https://developer.apple.com/news/?id=sosm2p7q); [Guardian via PressReader](https://www.pressreader.com/usa/the-guardian-usa/20221112/282024741243323)
- Stormbound "looks and plays great on your iPhone one-handed", on a 4-column × 5-row board — [148Apps](https://www.148apps.com/reviews/stormbound-review)
- Artifact: separate lane boards with a zoom-out option at launch — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game); all three lanes on one screen in 2.0 — [PC Gamer](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/)
- One-handed portrait UX guidance: a natural-reach zone at the centre and lower middle, a stretch zone at the top, and a "pain zone" in the upper corners — [EJAW mobile UX article (March 2026)](https://ejaw.net/how-mobile-game-ux-interface-design-drives-player-retention-in-2026)

### Inferences
- In a portrait 3-lane layout, the lanes are vertical columns: three columns across the narrow width. Each column then gets about a third of a phone's width (roughly 120 dp or less), which works for Snap's static card stacks but is tight for real-time units, health bars and targeting. Clash Royale's choice of two lanes in portrait is probably a direct result of this width limit (my inference; Clash Royale was not researched here).
- Card hands and deploy targets should sit in the natural-reach lower zone. Enemy towers and bases at the top of the screen should need no touch input, only reading.
- If three lanes are kept, options to evaluate include: (a) a horizontally scrolling or auto-panning camera with lane "alert" pips (re-creates Artifact's separate-board problem); (b) an angled or perspective board that widens the near end; (c) one "focus" lane rendered large with two compressed side lanes that resolve automatically. These are inferences for prototyping, not evidence-backed patterns.

### Gaps
- No source describing Marvel Snap's exact layout dimensions, or any developer talk on its portrait UI, was found.
- Warcraft Rumble's orientation and map layout were not confirmed by retrieved sources.
- No examples were found of a *real-time* portrait game with three simultaneously visible lanes, or user-research data on how many real-time lanes players can track on a phone.
- Artifact never shipped on mobile (background knowledge; Valve's mobile plans were not verified in this session).

---

## Q5. Which monetization models helped or hurt (paid entry, packs, marketplace, battle pass, cosmetics-only, card levels)?

### Takeaway
Artifact's paid entry plus paid packs plus Steam Market model was the most-cited cause of its failure alongside complexity. Valve's own rework removed card purchasing entirely. Marvel Snap succeeded at launch by not selling cards or packs and monetizing through battle pass and cosmetics, with card acquisition tied to cosmetic upgrades. It later met backlash when it added randomized Spotlight Caches, and its revenue per player stayed low. Grind and economy friction (Warcraft Rumble) and pre-match power items (Pokémon Unite) drew pay-to-win criticism. A generous model can still be unprofitable if content costs are high (Legends of Runeterra).

### Cited Findings
- Artifact: a $20 base game plus paid packs and Steam Market trading — [PC Gamer explainer](https://www.pcgamer.com/artifact-everything-you-need-to-know-about-valves-digital-card-game). Garfield: the model looked generous to paper-Magic players but stingy to free-to-play digital players — [Kotaku](https://kotaku.com/artifact-designer-says-it-failed-due-to-cards-for-money-1835212145). Co-designer Skaff Elias: "More expensive than I'd like to pay" is "possibly fair for a lot of players" — [Win.gg](https://win.gg/news/artifact-devs-discuss-the-launch-fate-and-future-of-artifact/)
- Artifact: commentators treated the economy as central to Valve's March 2019 "deep-rooted issues" — [MMOBomb](https://www.mmobomb.com/features/valve-promises-better-artifact-theres-probably-just-one-way-accomplish/). 2.0 made cards unlockable only through play — [Neowin](https://www.neowin.net/news/valve-announces-artifact-beta-20-bringing-major-changes-to-the-card-game/). By then the player base was gone, and in March 2021 both versions went free — [Game Developer](https://www.gamedeveloper.com/console/valve-is-fully-ending-development-on-its-digital-tcg-i-artifact-i-)
- Marvel Snap: does not sell new cards or packs, and relies on Battle Pass sales and cosmetics — [Naavik](https://naavik.co/digest/marvel-snap-card-acquisition-spotlight-caches/). Its biggest progression innovation was linking new-card acquisition to cosmetic card upgrades (Collection Level); card upgrades give only cosmetic improvements — [Deconstructor of Fun (May 2023)](https://www.deconstructoroffun.com/blog/2023/5/23/marvel-snap-the-definitive-deconstruction)
- Marvel Snap: Spotlight Caches are "a new form of loot box". After backlash, Second Dinner replaced one random-variant reward with a guaranteed 1,000 tokens — [Naavik](https://naavik.co/digest/marvel-snap-card-acquisition-spotlight-caches/). They shifted more monetization to cosmetics (Spotlight variants) — [Marvel Snap Zone](https://marvelsnapzone.com/the-ultimate-guide-to-spotlight-caches/). The Token Shop did not lift daily revenue — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2023/5/23/marvel-snap-the-definitive-deconstruction)
- Marvel Snap: "revenue per download is still low versus competitors" — [Deconstructor of Fun (Nov 2022)](https://www.deconstructoroffun.com/blog/2022/11/24/marvel-snap-the-one-deconstruction-to-rule-them-all)
- Warcraft Rumble: "its economy is rather unfriendly"; progression gated with difficulty spikes that push players toward paying — [Metacritic](https://legacy.prod.metacritic.com/game/ios/warcraft-rumble/critic-reviews); [Destructoid](https://www.destructoid.com/reviews/review-warcraft-rumble/)
- Pokémon Unite: players who buy the Battle Pass or pay for item-upgrade resources gain an in-match advantage — [ComicBook](https://comicbook.com/gaming/news/pokemon-unite-review/)
- Stormbound: likely "limited experience unless you spend heavily" — [Player.One](https://www.player.one/stormbound-review-kingdom-wars-deck-cards-freemium-120355)
- Legends of Runeterra, widely seen as generous: cost "significantly more to develop and support than it generates" — [Dot Esports](https://dotesports.com/lor/news/legends-of-runeterra-to-be-drastically-scaled-back-due-to-financial-shortcomings)

### Inferences
- Paid entry combined with paid power (Artifact) is the most toxic combination for a competitive free-to-play mobile title. Power gained through out-of-match leveling (Rumble's minis, Unite's held items) is the second most criticized pattern. Note that Clash Royale itself uses card levels; this research did not test whether that is accepted only because of Clash Royale's incumbency.
- Cosmetics-first models (Snap) win goodwill and downloads but struggle on revenue per user. Snap's revenue fell year after year (about $99M, then $60M, then $26M) despite a well-liked design. Plan for a hybrid model: battle pass plus cosmetics plus a non-power collection path. Avoid randomized premium bundles that change how players get gameplay-relevant content; Spotlight Caches drew backlash.
- Runeterra shows that generosity only works if production cost per content drop is low. Card and hero content for a 3-lane real-time game (animations, VFX, balance across lanes) will be expensive, so monetization has to fund a steady content flow.

### Gaps
- No Artifact sales or revenue data was found.
- No ARPDAU or revenue-per-download comparisons between these titles were found.
- Clash Royale's card-level monetization was not researched here (likely covered by another workstream).

---

## Q6. What content cadence and live ops did the successful games need, and what happened when it slowed?

### Takeaway
Every title here that slowed or froze updates (Artifact in March 2019, Underlords in 2020, PvZ Heroes, Warcraft Rumble in July 2025) went into decline or maintenance mode. Even Marvel Snap, with continuous content and a well-funded studio ($100M Series B in 2024), saw revenue decay about 88% from peak and cut staff in 2026, with a 2026 roadmap focused on infrastructure and hot-fixing. Live ops for this genre is a permanent, costly commitment, and studios size teams to the long tail.

### Cited Findings
- Artifact: Valve stopped small updates in March 2019 to focus on "deep-rooted" fixes. Players kept leaving during the long rework, and when 2.0 arrived it couldn't bring the numbers back — [GameSpot](https://www.gamespot.com/articles/valve-is-slowing-artifact-updates-to-handle-the-ga/1100-6465923/); [Game Developer](https://www.gamedeveloper.com/console/valve-is-fully-ending-development-on-its-digital-tcg-i-artifact-i-)
- Dota Underlords: Valve admitted updates had slowed to mostly balance changes. Commentators cited lack of support as a driver of the roughly 90% drop — [GamingOnLinux](https://www.gamingonlinux.com/articles/17356/); [PC Gamer](https://www.pcgamer.com/dota-underlords-peak-player-count-has-dropped-by-more-than-90-percent)
- PvZ Heroes: players noticed the slowdown in new event cards. The game is now on "Limited Support" with bug-fix-only updates — [EA Forums](https://forums.ea.com/discussions/plants-vs-zombies-franchise-en/pvz-heroes-game-coming-to-an-end/10274870/replies/10274875); [EA Help](https://help.ea.com/en/games/plants-vs-zombies/plants-vs-zombies-heroes/); [PvZ Wiki](https://plantsvszombies.wiki.gg/wiki/Plants_vs._Zombies_Heroes/Update_history)
- Warcraft Rumble: commentary blamed reliability and lack of content. After 2 Jul 2025 it receives only "regular, systemic in-game events and bug fixes" — [Medium commentary](https://medium.com/@kubis_dominik/what-warcraft-rumbles-outage-teaches-us-about-games-as-a-service-vs-software-as-a-service-13ba9cab2076); [Icy Veins](https://www.icy-veins.com/wow/news/warcraft-rumble-is-going-into-maintenance-mode/)
- Marvel Snap: 2026 roadmap focused on stability and on bug fixes that don't need client updates; 16 layoffs in spring 2026 "to make sure [the game] can keep going" — [Marvel Snap Zone](https://marvelsnapzone.com/future-of-marvel-snap-roadmap-announcement/); [MassivelyOP](https://massivelyop.com/2026/05/04/marvel-snaps-second-dinner-undertakes-layoffs-to-make-sure-the-game-can-keep-going/)
- Marvel Snap: platform and publisher risk. The game was knocked offline in the US for about two days in January 2025 because of its ByteDance-owned publisher, which led to a publisher change and in-housing — [PocketGamer.biz](https://www.pocketgamer.biz/marvel-snap-secures-new-publisher-skystone-games-after-surprise-takedown)
- Legends of Runeterra: content cost exceeded revenue, so the team was cut and refocused on the PvE mode the remaining players liked most — [Dot Esports](https://dotesports.com/lor/news/legends-of-runeterra-to-be-drastically-scaled-back-due-to-financial-shortcomings); [RiftFeed](https://riftfeed.gg/lol-news/lor-huge-layoffs-and-changes)

### Inferences
- A "pause updates to fix fundamentals" strategy after launch (Artifact) is close to fatal. Fundamentals such as lane count, match length, monetization and readability have to be settled in soft launch.
- PvE side modes (Runeterra's Path of Champions, Warcraft Rumble's PvE-heavy campaign) can retain players and cost less per hour of engagement than PvP balance across many lanes. For the hybrid, a PvE mode against AI lanes is worth planning as a retention and onboarding layer. It also answers Garfield's "lack of short-term goals for new players" point.
- Backend architecture that allows data-driven balance and content changes without client updates is a 2026 priority even for Snap. Build it in from day one.
- Publisher and ownership jurisdiction is a real operational risk for a US-facing mobile game (Snap's ByteDance outage).

### Gaps
- No primary source on Marvel Snap's actual cadence (weekly card drops, monthly seasons, Conquest and Deadpool's Diner modes) was retrieved in this session. Those details are background knowledge only.
- No numbers on team size or live-ops cost for any title.

---

## Q7. Synthesised lessons for a Clash Royale-style real-time card deployment game on a Mobile Legends-style 3-lane MOBA map

### Takeaway
The evidence points to one rule: the number of lanes is affordable only in proportion to how cheaply each lane's state can be read and how few decisions each lane needs. Artifact paid for three full MOBA lanes with complexity and failed. Snap paid for three lanes by deleting combat and time pressure and succeeded. Real-time play adds pressure that neither faced, so a 3-lane real-time portrait design is in riskier territory than either. Warcraft Rumble, the closest real analogue, failed on economy and friction even though its core loop was liked.

### Cited Findings
(Each lesson below rests on findings cited in Q1–Q6. Key anchors:)
- Complexity was the top reason players quit Artifact — [LessWrong](https://www.lesswrong.com/posts/6gptwR8jBkzqhWaTY/artifact-what-went-wrong)
- Snap's six turns, 12 cards, simultaneous turns and one card type were explicit simplifications borrowed partly from Clash Royale's sub-five-minute games — [esports.gg](https://esports.gg/news/gaming/marvel-snap-ben-brode-hearthstone/); [mobilegamer.biz](https://mobilegamer.biz/second-dinners-ben-brode-reveals-marvel-snaps-recipe-for-success-literally/)
- Artifact 2.0 put all lanes on one screen, removed the arrows and stopped selling cards, but these came after the players had left — [PC Gamer](https://www.pcgamer.com/artifact-20-is-less-complicated-but-is-it-a-better-game/); [Game Developer](https://www.gamedeveloper.com/console/valve-is-fully-ending-development-on-its-digital-tcg-i-artifact-i-)
- Warcraft Rumble lost 92% of monthly mobile revenue in year one, then content ended in July 2025 — [PocketGamer.biz](https://www.pocketgamer.biz/warcraft-rumble-is-making-the-move-to-pc-with-monthly-mobile-earnings-down-92-in-first-year/); [Engadget](https://www.engadget.com/gaming/blizzard-is-giving-up-on-its-warcraft-mobile-game-amid-layoffs-215021940.html)
- Snap revenue fell about 88% from peak monthly by 2026 (AppMagic estimate) — [Udonis](https://www.blog.udonis.co/statistics/marvel-snap)
- Pokémon Unite caps matches at 10 minutes and doubles points late — [Game8](https://game8.co/reviews/pokemon-unite/pokemon-unite-review)

### Inferences (synthesised lessons)
1. **All lanes visible at once, always.** Artifact's separate lane boards were a launch mistake that Valve reversed in 2.0. If three lanes can't be legibly shown together in portrait in real time, cut to two lanes plus a side objective, or make one or two lanes resolve automatically.
2. **Compress each lane's state into something readable at a glance.** Snap reduces a lane to one number per side. A real-time hybrid needs a similar compression: lane health or pressure bars, a cap on simultaneous units per lane, and clear "this lane is losing" alerts.
3. **Cap match length at Clash Royale or Snap scale (about 3–5 minutes).** Artifact's 20–30-minute games across three lanes were a core complaint, and Valve halved the timers. Unite caps at 10 minutes even for a full MOBA. Use comeback or overtime mechanics, such as Unite's double points or Clash Royale-style sudden death, to keep short games decisive.
4. **Remove uncontrollable post-decision randomness.** Artifact's arrows were resented. Put randomness before decisions and in plain view (Snap's location reveals). Unit targeting AI must be deterministic and telegraphed.
5. **Cut MOBA systems aggressively. Keep the fantasy, not the bookkeeping.** Keep heroes (as one or two persistent champions), towers (as the win condition), and creeps (as automatic waves). Collapse items and gold into one or two readable in-match choices. Drop or abstract the jungle; none of the successful translations kept it. Avoid Artifact's five heroes with full item and respawn bookkeeping.
6. **Respect attention budgets in real time.** Snap removed waiting time with simultaneous turns. Real-time play removes thinking time. Combining real-time play with three lanes means the design must reduce the number of decisions per minute per lane compared with Clash Royale's two lanes, not add to it.
7. **Monetization: no paid entry, no paid power through packs or a market.** Avoid grind walls on unit or hero levels (Rumble, Unite). Cosmetics plus battle pass plus a non-power collection path wins goodwill (Snap) but may cap revenue per user. Randomized premium bundles (Spotlight Caches) cause backlash.
8. **Settle the fundamentals before global launch.** Artifact's year-long "fix the fundamentals" pause after launch was fatal. Test lane count, match length, readability and economy in soft launch with mainstream players, not just core and pro players (Medium critique of Artifact's playtest pool).
9. **Plan for the decay curve and keep live-ops costs lean.** Even hits lose 80–90% of peak monthly revenue within about 3 years (Snap), and failures do so within one year (Rumble). Size content production to the tail. Build server-side balancing and content delivery from day one (Snap's 2026 priority).
10. **IP and hero reuse drives downloads, not necessarily revenue or retention.** Artifact (Dota), Underlords (Dota), Rumble (Warcraft) and Magic Chess: Go Go (MLBB) all launched strongly. Only a design that suits mobile kept players.
11. **Give new players short-term goals and a PvE on-ramp.** Garfield named the lack of short-term goals for new players. PvE modes (Runeterra's Path of Champions, Rumble's campaign) were where remaining players gathered.
12. **Account for publisher and ownership risk.** Snap's January 2025 outage came from its publisher's corporate parent, not the game.

### Gaps
- The lessons depend on cross-genre analogy. No shipped game was found that does exactly what is planned (real-time card deployment into a 3-lane MOBA map in portrait), so there is no direct evidence on whether such a layout is readable. Early prototyping and playtesting on lane count is the main unanswered question.
- Clash Royale's own design and performance, and other real-time hero-deployment titles (for example Clash Mini, Minion Masters, Brawl-style hybrids), were outside this note or could not be searched once the budget ran out.

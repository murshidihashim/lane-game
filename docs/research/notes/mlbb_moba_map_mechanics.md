# MLBB and Mobile MOBA Map, Match Structure and Core Systems (as reference for a card-deployment x 3-lane hybrid)

Method note for the report writer: in this session the hosts `mobile-legends.fandom.com` and `en.moonton.com` were blocked by the network sandbox, so full wiki/official pages could not be fetched. Numbers below come from search-engine extracts of those pages plus community guides (mlbbhub, mlbbdex, metammo, Liquipedia, Samurai Gamers, Bulbapedia, Game8) and official posts/support pages where surfaced. MLBB changes its map yearly (Sept 2025 "Project NEXT" Annual Map Change; Sept 2026 Season 42 / patch 2.2.16 map change). Treat every exact timer/gold value as "approximately current, verify in client" unless marked official. Research date: 2026-11-11.

## 1. Map layout: three lanes, river, jungle, orientation

### Takeaway
MLBB's Land of Dawn is a classic diagonal 3-lane map: Gold Lane (marksman farm lane), EXP Lane (solo fighter lane), Mid Lane (mage), split by a river with two epic-monster pits, and four jungle quadrants with buff camps, a Lithowanderer/crab-style river camp and small camps. Lane identity is created by explicit economic rules (lane-specific gold/EXP bonuses), not by geometry alone. All mobile MOBAs (HoK, Wild Rift, AoV) use the same 3-lane + river + 2-pit template; Pokémon Unite is the outlier with 2 lanes + a central jungle.

### Cited Findings
- MLBB has five positions (Gold Lane, EXP Lane, Mid Lane, Jungle, Roam) and six hero roles; Gold Lane typically goes to a marksman because it gives a per-minion gold bonus to the first player who last-hits there — [Playnews roles guide](https://www.playnews.gg/en/guides/mlbb-guide-to-the-6-roles-and-5-positions-to-get-started); [metammo Gold Lane guide](https://metammo.com/mobile-legends-guide/guides/gold-lane-guide)
- EXP Lane is a solo lane giving bonus experience to a lone laner; the bonus is lost when a second allied hero joins. Size of bonus conflicts: one guide says +25% EXP for the first 5 minutes; another says the lane's cannon minion awards +35% EXP to the last-hitter for the first 10 waves (~5 min) — [mlbbhub EXP lane guide](https://mlbbhub.com/guides/exp-lane-tips); [itembuild EXP lane guide](https://itembuild.com/mlbb-guide/role-guide/03-mlbb-exp-lane-guide); [metammo EXP lane guide](https://metammo.com/mobile-legends-guide/guides/exp-lane-guide) (values conflict; unverified against official notes)
- Lane names appear "top" vs "bottom" inconsistently across guides (one says Gold top / EXP bottom, another the reverse) because orientation depends on which side you start on — [mlbbhub beginner guide 2026](https://mlbbhub.com/news/mlbb-beginner-guide-2026); [GamingonPhone laning guide](https://gamingonphone.com/guides/mobile-legends-the-complete-laning-guide-and-tips/)
- First Turtle always spawns on the river pit next to the EXP Lane (so the EXP side river is the early objective side) — [MLBB Fandom: Turtle](https://mobile-legends.fandom.com/wiki/Turtle) (via search extract)
- Jungle camps and timers (community guides, conflicting by patch): Purple buff first spawn ~0:25 and Orange/Red buff ~0:20 (mlbbdex) vs 0:30 for both (mlbbhub); buff respawn ~90 s. Lithowanderer (river camp) first spawn 0:35 (Fandom/mlbbdex) or 0:45 (mlbbhub/metammo), respawn ~2 min. A "Little Crab" appears ~0:42 and is replaced by the larger Scavenger Crab after ~3 min — [mlbbdex map](https://mlbbdex.com/en/map); [mlbbhub map](https://mlbbhub.com/map); [mlbbhub jungle rotation](https://mlbbhub.com/guides/jungle-rotation); [metammo jungle timers 2026](https://metammo.com/mobile-legends-guide/guides/jungle-routes-and-objective-timers); [Google Play editorial on MLBB jungle monsters](https://play.google.com/store/apps/editorial?id=mc_editorialevergreen_post_install_mobile_mls_campaign_fcp&hl=en)
- Historical jungle tuning: general jungle spawn time changed 45 s -> 40 s in patch 1.4.94; a later change set creep respawn interval to 90 s with a 25 s first spawn; you can no longer use control effects on Lithowanderer (older patch) — [MLBB Fandom: Jungle](https://mobile-legends.fandom.com/wiki/Jungle) (via search extract)
- Project NEXT 2025 "Annual Map Change" (scheduled 17 Sept 2025) introduced four rotating map variants including "Dangerous Grass" (dense grass over high ground, inner turrets, Mid Lane and Lord pit) and "Broken Walls" (new shortcuts near objectives); junglers can now enter the Lord/Turtle pit from behind to steal — [Moonton news: Project NEXT 2025](https://en.moonton.com/news/237.html); [TechBeatph](https://techbeatph.com/wproot/four-new-maps-one-massive-mlbb-patch-update); [ALL-STAR Magazine](https://all-starmagazine.com/news-and-updates/mlbb-map-update-2025/)
- Sept 2026: Season 42 launched 16 Sept 2026 with a "Sanctum Island" visual revamp and a redesigned Lord; the 2026 Annual Map Change (reported as patch 2.2.16, live 28 Sept 2026) added Revealing Wisps (periodic wisps that expose nearby enemies), Healing Turtle and Golden Turret, plus upgraded Flying Cloud VFX — [neuralboost Season 42](https://neuralboost.gg/blog/mobile-legends-season-42-reset-times-rewards-and-the-28-september-map-change); [GPDS Game Shop](https://gpdsgameshop.com/blog/mlbb-annual-map-change-september-28); [timesaver.gg Sanctum Island](https://timesaver.gg/blog/mobile-legends-sanctum-island-map-changes-season-42); official confirmation of Healing Turtle/Golden Turret: [MLBB official X post](https://x.com/MobileLegendsOL/status/2104435939775062252)
- Honor of Kings: three lanes (named Clash, Mid, Farm by some sources) joined by a river running diagonally top-left to bottom-right; Tyrant pit in the lower river, Overlord pit in the upper river — [hokquickref strategy](https://hokquickref.com/strategy.html); [hub-game HoK bosses](https://hub-game.com/hok/en/guide/bosses)
- Arena of Valor: lanes are named after the objective they sit next to (Abyssal Dragon lane, Dark Slayer lane, mid); guides recommend two players in the Dragon lane and one in the Slayer lane because the Dragon is contested earlier — [Samurai Gamers: Dark Slayer lane](https://samurai-gamers.com/arena-of-valor/top-dark-slayer-lane/); [Samurai Gamers: Abyssal Dragon](https://samurai-gamers.com/arena-of-valor/abyssal-dragon-strategy-and-benefits/)
- Wild Rift uses a mirrored map: on the red side most aimed skills would otherwise point into the twin-stick HUD, so the map is flipped so both teams play from the same corner — [Riot support: Wild Rift map and modes](https://support.riotgames.com/en-us/wild-rift/gameplay/map-and-modes); [GamingBolt dev diary coverage](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary)
- Pokémon Unite (Theia Sky Ruins, default Ranked/Standard map since 2 Sept 2022, replacing Remoat Stadium): a top lane, a bottom lane and a central jungle area; each team has goal zones along each lane — [Bulbapedia: Theia Sky Ruins](https://bulbapedia.bulbagarden.net/wiki/Theia_Sky_Ruins); [Game8 Unite rules](https://game8.co/games/Pokemon-UNITE/archives/336065)

### Inferences
- Lane identity in MLBB is enforced by economy rules (Gold bonus for a solo carry, EXP bonus for a solo fighter, Retribution gold-sharing penalty for the jungler — see section 5) rather than by lane length; a card game can replicate this by giving each lane a distinct "income type" (e.g., one lane pays currency, one pays card-XP/upgrades, middle pays tempo/vision).
- The "objective on one side, other objective on the other side" layout (Turtle near EXP lane, Lord on the opposite river; AoV Dragon lane vs Slayer lane) is the main tool that makes lanes asymmetrical and pulls players across the map at known times.
- Wild Rift's mirroring decision shows UI occlusion matters: in a landscape card game the hand/elixir bar occupies the bottom of the screen, so each player should always see their own base at the same edge (Clash Royale also does this).

### Gaps
- No source surfaced giving MLBB lane lengths, map dimensions or walking time base-to-base; I found no reliable data on this for any mobile MOBA.
- Could not confirm whether MLBB mirrors the map for both teams (as Wild Rift does) — unverified.
- Exact current (post-28 Sept 2026) jungle timers and the four 2025 map variants' rotation rules are not confirmed from an official page.

## 2. Structures: turrets, base, protection mechanics

### Takeaway
MLBB has 3 turrets per lane (outer, inner, base/high-ground) — 9 per team — plus the base crystal. Early turrets are protected by a 5-minute energy shield and damage reduction, and base turrets get 50% damage reduction when no enemy minions are nearby (anti-backdoor). The Sept 2026 "Golden Turret" change raised inner/base turret HP but greatly increased team gold for turret kills.

### Cited Findings
- Each lane has three turrets; the goal is to push minion waves through and destroy them — [mlbbhub map guide](https://mlbbhub.com/map); [MLBB Fandom: Battlefield Guide](https://mobile-legends.fandom.com/wiki/Battlefield_Guide) (via search extract)
- Outer turret early "energy shield": absorbs 5,000 damage, reduces ranged and melee damage taken by 30%, and nearby allied heroes take 15% less damage; persists until destroyed or the first 5 minutes elapse — [MLBB Fandom: Turret](https://mobile-legends.fandom.com/wiki/Turret) (via search extract; patch date unknown)
- Outer turret gets 50% damage reduction when no enemy minions are nearby during the protection window (one guide) — [vcgamers laning/turret guide](https://www.vcgamers.com/news/en/creep-and-turret-laning-guide-on-the-ml-map/)
- Base turret: 50% damage reduction when no enemy minions are within its attack range (backdoor protection); base turret has a "Holy Defense" knockback skill against minions and heroes — [MLBB Fandom: Turret](https://mobile-legends.fandom.com/wiki/Turret) (via search extract)
- Turret adjustments were described as giving "more defense for allied heroes in the early to mid game" — [MLBB Fandom: Battlefield Guide](https://mobile-legends.fandom.com/wiki/Battlefield_Guide)
- Golden Turret (official, live with the 2026 map change): "Turrets grant significantly more team Gold when destroyed, but the HP of Inner Turrets and Base Turrets is also increased" — [MLBB official X post](https://x.com/MobileLegendsOL/status/2104435939775062252); exact split of the gold is unclear (one third-party source says split equally among players) — [blooing.com 2026 map changes](https://blooing.com/new-mlbb-map-changes-2026/)
- Wild Rift structural simplifications vs PC LoL: inhibitors removed (destroying a lane's base turret spawns super minions), the Nexus itself attacks like a turret, turret plates removed to speed up turret destruction — [GamingBolt dev diary coverage](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary); [AFK Gaming dev diary](https://afkgaming.com/esports/news/4137-36-champions-a-turret-like-nexus-and-more-in-lol-wild-rift-gameplay-dev-diary)
- Pokémon Unite replaces turrets with goal zones: forward-most goal zones break after 80 points scored into them, middle goal zones after 100, base goal zone is effectively indestructible (10,000) — [Bulbapedia: Goal zone](https://bulbapedia.bulbagarden.net/wiki/Goal_zone); [Game8 rules](https://game8.co/games/Pokemon-UNITE/archives/336065)

### Inferences
- MLBB's protection layer (time-gated shield, minion-gated damage reduction) exists to stop early snowball dives and "backdoor" wins; in a card-deployment game the same intent can be expressed simply as "towers take reduced damage unless your own unit wave is present" and "first-N-minutes tower shield."
- Golden Turret shows Moonton's 2026 direction: make structures harder to kill but more rewarding, to make turret trades the primary economy event — a good fit for a game where the player's units (not a hero) do the pushing.
- Wild Rift's removal of inhibitors and turret plates is a model for shortening match length by cutting structure layers rather than shrinking every timer.

### Gaps
- No current numbers for MLBB turret HP, damage, or base crystal HP/regeneration were found; base regeneration (fountain heal) mechanics not confirmed.
- Could not confirm whether MLBB spawns "super minions" after a base turret falls (only a low-reliability Prezi said so; other sources describe the Holy Defense knockback instead) — [Prezi masterclass](https://prezi.com/page/je2g38zin7ef/mobile-legends-bang-bang-mlbb-strategic-masterclass) (unreliable).
- Whether the 5,000-shield / 30% / 15% figures are still current after the 2025 and 2026 map changes is unknown.

## 3. Minion/creep waves

### Takeaway
Minion waves are the baseline push mechanism: they spawn on a fixed timer (reported as every 30 s in MLBB), walk down each lane, and gate structure damage (turret damage reduction applies when no minions are present). Objective kills (Lord, Turtle in 2026) work by adding super-units into these waves.

### Cited Findings
- Minions spawn every 30 seconds at each base and travel down each lane — [itembuild EXP lane guide](https://itembuild.com/mlbb-guide/role-guide/03-mlbb-exp-lane-guide) (single community source)
- Mid lane: the first 10 waves reportedly contain three "lancers" and one "infantry" — [mlbbdex map](https://mlbbdex.com/en/map) (single source; composition naming unverified)
- EXP lane cannon minion awards bonus EXP for the first 10 waves (~5 min) — [metammo EXP lane guide](https://metammo.com/mobile-legends-guide/guides/exp-lane-guide)
- To build a favourable wave you kill the enemy wave with your hero so your own minions stay unharmed (i.e. hero-cleared waves stack into pushes) — [MLBB Fandom: Battlefield Guide](https://mobile-legends.fandom.com/wiki/Battlefield_Guide)
- Older Lord behaviour: Lord buff increased the strength of all your minions spawning in the next wave — [MLBB Fandom: Lord](https://mobile-legends.fandom.com/wiki/Lord) (older version)
- Wild Rift: destroying a base turret yields super minions in that lane (inhibitors removed) — [GamingBolt](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary)
- Pokémon Unite removed minion last-hitting entirely; reviewers say this lowers the constant mental load of lane farming — [Upcomer: In Pokémon UNITE, simplicity is the point](https://upcomer.com/in-pokemon-unite-simplicity-is-the-point); [TheGamer Unite vs LoL](https://www.thegamer.com/pokemon-unite-new-moba-league-of-legends-comparison/)

### Inferences
- In a card-deployment hybrid, the automatic minion wave maps cleanly to "free baseline units every 30 s per lane"; the player's cards then act like heroes that tip the wave. This keeps the map alive even when the player is focused elsewhere.
- Lane-specific wave contents (cannon bonus in EXP lane) are a cheap lever for lane identity.

### Gaps
- No reliable MLBB first-wave spawn time, wave size per phase, or siege/cannon minion cadence found (the "siege minion every N waves" data surfaced only for PC LoL, which does not apply).
- No confirmed super-minion rule for MLBB.

## 4. Objectives: Turtle, Lord and equivalents in other mobile MOBAs

### Takeaway
Mobile MOBAs all use a two-objective cadence: an early, smaller river objective (MLBB Turtle 2:00; HoK Tyrant 4:00; AoV Abyssal Dragon 2:00; Wild Rift Dragons ~5:00 / Herald ~6:00) and a later "pushing" boss (MLBB Lord 8:00, evolves at 18:00; HoK Overlord; AoV Dark Slayer ~8:00; Wild Rift Baron ~10:00), often with a late-game super-objective (HoK Tempest Dragon 20:00, Wild Rift Elder 19:00, Unite Rayquaza in final 2:00). MLBB's 2026 Healing Turtle moved the Turtle from "team shield + gold" to "spawn an allied pusher in a lane," converging both objectives onto the same lane-push mechanism.

### Cited Findings
**MLBB Turtle**
- First spawn at exactly 2:00; first Turtle always next to the EXP lane — [MLBB Fandom: Turtle](https://mobile-legends.fandom.com/wiki/Turtle)
- Respawn 120 s if it dies before 6:00; at most 4 per match; reward (pre-Sept-2026) 60/70/80 gold per hero, EXP and a 120 s team shield — [mlbbdex map](https://mlbbdex.com/en/map). Conflicts: other guides say Turtle stops spawning after 7:30 or 8:00; a lower-reliability source reports Turtle respawn reduced 3:00 -> 2:30 so teams can take three Turtles before the first Lord — [metammo](https://metammo.com/mobile-legends-guide/guides/jungle-routes-and-objective-timers); [Befitnatic jungler economy rework](https://befitnatic.com/the-jungler-economy-rework-how-mobile-legends-latest-update-is-reshaping-professional-meta/)
- Healing Turtle (official, 2026 map change, live 28 Sept 2026 per third parties): "Defeating the Turtle no longer grants a shield buff. Instead, Allied Turtles will spawn in the lane to help push, and allied heroes can rapidly recover HP when near them" — [MLBB official X post](https://x.com/MobileLegendsOL/status/2104435939775062252). Third-party guides add the allied Turtle spawns on the enemy's strongest lane and that heal/gold numbers are not officially published — [timesaver.gg Healing Turtle guide](https://timesaver.gg/blog/mobile-legends-healing-turtle-golden-turret-objectives-guide); [GPDS](https://gpdsgameshop.com/blog/mlbb-annual-map-change-september-28)
- A Sept 2025 guide cited ~200 gold per team for Turtle and ~300 gold for Lord — unconfirmed vs official — [BitTopup patch 2.1.18 roaming gold rework](https://news.bittopup.com/news/mlbb-patch-2.1.18-roaming-gold-rework-unlock-200g-turtle-blessings) (low reliability)

**MLBB Lord**
- Spawns at 8:00 (most guides) or 2 minutes after the last Turtle is killed (Fandom phrasing); older Fandom text describes an untouched Turtle converting into a Lord at 8:00 (possibly outdated) — [mlbbhub map](https://mlbbhub.com/map); [MLBB Fandom: Lord](https://mobile-legends.fandom.com/wiki/Lord)
- Respawns ~3 min after death, ~2.5 min after 18:00; once killed it marches down a lane attacking enemy turrets; its charge deals true damage equal to 30% of the turret's max HP — [mlbbhub jungle rotation / map](https://mlbbhub.com/guides/jungle-rotation)
- Patch 1.9.64 removed the 12-minute evolution for the summoned Lord, so it now evolves only at 18:00 (older material listing 8/12/18 stages is outdated) — [Liquipedia: Patch 1.9.64](https://liquipedia.net/mobilelegends/Patch_1.9.64)
- Lord gold reported as ~300 per player (guides); Fandom lists an older 500-gold figure from the 2016 version — [mlbbdex](https://mlbbdex.com/en/map); [MLBB Fandom: Lord](https://mobile-legends.fandom.com/wiki/Lord) (unconfirmed for current patch)
- Lord visual/model redesign ("icy trident and armor") shipped with Season 42 on 16 Sept 2026; no Lord stat/reward change found for the 28 Sept map change — [neuralboost Season 42](https://neuralboost.gg/blog/mobile-legends-season-42-reset-times-rewards-and-the-28-september-map-change)
- Project NEXT 2025: junglers can enter the Lord/Turtle pit from behind to steal — [Moonton news](https://en.moonton.com/news/237.html)

**Honor of Kings**
- Tyrant (lower river) and Overlord (upper river) both spawn at 4:00, respawn on ~4-minute cycles, become "Shadow" versions at 10:00 with ~3:30 respawns; a Tempest Dragon arrives at 20:00 with 3-minute respawns as a late win-condition objective — [hub-game HoK bosses](https://hub-game.com/hok/en/guide/bosses); [hokquickref](https://hokquickref.com/strategy.html). Conflict: one guide gives Overlord 2:00 — fan sources only.

**Wild Rift**
- First Dragon ~5:00 (one 2020 guide says 4:00); after four dragons are slain, Elder Dragon can appear; official Riot "Elemental Rift" overview: Elder Dragon spawns at 19:00 — [Riot: Elemental Rift overview](https://wildrift.leagueoflegends.com/en-us/news/game-updates/elemental-rift-overview/); [The Game Haus timers (2020)](https://thegamehaus.com/wild-rift/wild-rift-jungle-and-honey-fruit-timers/2020/11/29/)
- Rift Herald first spawn 6:00 (Game Haus, riftcamp) vs 5:00 (Fandom); killing it refunds 75% ability cooldowns to the killer; Herald is the early turret-breaking objective — [WR wiki: Monster](https://wiki.leagueoflegends.com/en-us/WR:Monster); [riftcamp objectives](https://riftcamp.gg/en/guides/objectives)
- Baron Nashor at 10:00 (replacing Herald whether or not it was killed), 3-minute respawn; riftcamp lists 11:00 — [Fandom: Monster (Wild Rift)](https://leagueoflegends.fandom.com/wiki/Monster_(Wild_Rift)); [riftcamp](https://riftcamp.gg/en/guides/objectives)

**Arena of Valor**
- Abyssal Dragon 2:00 spawn / 2:00 respawn; Enraged Abyssal Dragon 10:00 / 5:00 respawn; Dark Slayer ~8:00 spawn (earlier patches 6:00 or 7:00), 5:00 respawn, scales until ~11:30 — [Samurai Gamers timings](https://samurai-gamers.com/arena-of-valor/all-minion-monster-and-item-timings/); [Samurai Gamers Dark Slayer lane](https://samurai-gamers.com/arena-of-valor/top-dark-slayer-lane/) (patch-dependent)

**Pokémon Unite**
- 10-minute matches; team with most points wins — [Game8 rules](https://game8.co/games/Pokemon-UNITE/archives/336065)
- Rayquaza (replaced Zapdos on Theia Sky Ruins) spawns with 2:00 remaining and does not respawn; killing team gets a breakable score shield and faster goal-scoring; Zapdos previously disabled the opposing team's goals — [Pokémon.com Theia Sky Ruins overview](https://www.pokemon.com/us/strategy/pokemon-unite-theia-sky-ruins-overview); [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Theia_Sky_Ruins); [Sportskeeda Rayquaza](https://www.sportskeeda.com/pokemon/rayquaza-pokemon-unite-when-appear-buffs)
- Final 2 minutes: points scored are doubled (Game8); Fandom wiki says "quadruples" — conflict — [Game8](https://game8.co/games/Pokemon-UNITE/archives/336065); [Pokémon Unite Fandom](https://pokemonunite.fandom.com/wiki/Theia_Sky_Ruins)
- After Rayquaza appears, wind currents/air currents grant movement speed in fixed areas, scaled by number of destroyed goal zones — [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Theia_Sky_Ruins); [comicbook.com](https://comicbook.com/gaming/news/pokemon-unite-theia-sky-ruins-map-changes)
- Strategy guides: if trailing late, securing Rayquaza is top priority (explicit comeback lever); critics argued boss buffs are "too powerful to be determined by last hits" — [Game8 Rayquaza guide](https://game8.co/games/Pokemon-UNITE/archives/387474); [SlashGear review](https://www.slashgear.com/780731/pokemon-unite-review-big-fun-big-concerns)

### Inferences
- The universal pattern is: known spawn timers -> both teams converge -> fight -> the winner converts it into lane pressure. Timers create scheduled "decision points" even for players who otherwise lane passively. A card game can run the same clock (e.g., small objective at 1:00/2:00, big pusher at mid-match, final-phase double-value objective).
- MLBB's 2026 shift (Turtle = spawn allied pushers) is directly transplantable: objectives that reward the commander with extra units in a lane are native to card deployment (an objective kill = "free card" deployed in the weakest/strongest lane).
- Unite's "final 2 minutes double points + one-time boss" design is the cleanest comeback valve and maps onto Clash Royale-style overtime/double-elixir periods; the risk (per critics) is that a single last-hit decides too much — a card design should make objective capture contestable over seconds, not a single hit.

### Gaps
- No official MLBB current numbers for Turtle/Lord HP, gold, or Healing Turtle heal values (third parties say Moonton has not published them).
- HoK numbers are from fan guides only; no official Level Infinite source surfaced.

## 5. Economy: gold, XP, levels, items, emblems, sharing rules, comeback mechanics

### Takeaway
MLBB's economy is gold + EXP from minions, jungle, kills, turrets and objectives, with explicit lane-sharing rules (Gold-lane last-hit gold bonus, EXP-lane solo bonus, jungler Retribution restricting minion-gold sharing). Builds use items plus the emblem system (base stats + 3-tier talent tree). Wild Rift caps level at 15 (down from PC LoL's 18) explicitly to shorten matches; Pokémon Unite removes the gold/shop loop entirely.

### Cited Findings
- Retribution (jungle battle spell): users are restricted from sharing minion gold with Gold, Mid or EXP laners; base damage listed as 520 (+80 per hero level) on Fandom; a 2026 blog claims 750 (+150/level) — unconfirmed; level-15 Retribution bonus listed as +15 Physical Attack/Magic Power (Fandom) vs +10 PA/+10 MP/+100 HP (MLBB Central) — conflict — [MLBB Central: Retribution types](https://mlbbcentral.com/mlbb-types-of-retribution/); [MLBB Fandom: Retribution](https://mobile-legends.fandom.com/wiki/Retribution); [joytify meta S41](https://www.joytify.com/blog/en-ph/moba-meta-mobile-legends/)
- Gold Lane: per-minion gold bonus to the first last-hitter; EXP Lane: solo EXP bonus (see section 1) — [metammo Gold Lane](https://metammo.com/mobile-legends-guide/guides/gold-lane-guide); [mlbbhub EXP lane](https://mlbbhub.com/guides/exp-lane-tips)
- Turret kills give "significantly more team Gold" since the 2026 Golden Turret change (team-shared economy) — [MLBB official X post](https://x.com/MobileLegendsOL/status/2104435939775062252)
- A "roaming gold rework" with "Blessings" (roam item upgrades) was reported for patch 2.1.18 (2025) — [BitTopup](https://news.bittopup.com/news/mlbb-patch-2.1.18-roaming-gold-rework-unlock-200g-turtle-blessings) (low reliability; details unverified)
- Emblems: each emblem gives fixed base stats and a three-tier talent tree (choose one talent per tier); the system was revamped in June 2023; pre-revamp, talents unlocked at emblem levels 10/15/20 — [mlbbhub emblem guide 2026](https://mlbbhub.com/news/mlbb-emblem-guide-2026-best-sets-every-role); [Spin.ph on revamp (June 2023)](https://www.spin.ph/esports/how-will-mlbb-s-revamped-emblem-system-affect-the-overall-landscape-a4858-20230628); [ONE Esports emblem talents](https://www.oneesports.gg/mobile-legends/emblem-system-guide-talents/). Sources conflict on whether talents can be mixed across emblem sets.
- Wild Rift lowered the level cap from 18 to 15 "in the spirit of quicker matches"; Wild Rift champions take two summoner spells vs MLBB's one battle spell — [GamingBolt dev diary](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary); [AFK Gaming: Wild Rift vs MLBB](https://afkgaming.com/mobileesports/Blogs/5228-how-will-wild-rift-do-against-mobile-legends)
- Pokémon Unite has no item shop or gold system (held items are pre-match), yet players still make in-match decisions; Heroes of the Storm earlier used team-wide leveling and talent trees instead of a gear shop — [RPGFan review](https://www.rpgfan.com/review/pokemon-unite); [TheGamer comparison](https://www.thegamer.com/pokemon-unite-new-moba-league-of-legends-comparison/)
- Launch-era analysis argued Unite "simplified the classic MOBA gameplay in order to attract the MOBA beginner but ... sacrificed the depth and thus lower[ed] the stickiness" — attributed in search extracts to [Deconstructor of Fun: Why Pokémon Unite Hasn't Reached the Top (yet?) (Nov 2021)](https://www.deconstructoroffun.com/blog/2021/11/21/pokemon-unite-9lc3j) or [G-Bakery substack](https://gbakery.substack.com/p/ambition-of-pokemon-moba) (exact attribution not verified)

### Inferences
- MLBB uses "rules that punish sharing" to force role specialisation; in a single-commander game there is no sharing problem, so lane income can instead be a strategic allocation choice (which lane do I invest cards in to farm which resource?).
- Team-shared structure gold (Golden Turret) and objective-spawned allies point to a design where the economy is driven by map control rather than individual last-hits — appropriate for a commander who cannot micro last-hits across three lanes.
- Unite's experience is a warning: removing the gold/build loop entirely lowers depth/stickiness; a card game's deck-building and in-match card upgrades can substitute for the item shop.

### Gaps
- Could not confirm MLBB hero level cap (widely cited as 15) from a source fetched in this session.
- No source found for an explicit MLBB kill-streak bounty / shutdown-gold comeback formula, or for item slot count (commonly six) — unverified.
- No exact gold-per-minute or XP curve figures for any mobile MOBA surfaced.

## 6. Match length and pacing; surrender; why mobile MOBAs are shorter

### Takeaway
Mobile MOBAs target ~10–20 minute matches versus ~30–45 for PC: MLBB 12–20 min, Wild Rift 15–20 min (about half of Summoner's Rift), Honor of Kings 15–20 min, Pokémon Unite a hard 10 min. Shortening is achieved by smaller maps, lower level caps, fewer structure layers, faster gold, and earlier objective timers; designers cite players' limited time/availability and low-end device constraints.

### Cited Findings
- MLBB Classic and Ranked matches last 12–20 minutes on average — [Wikipedia: Mobile Legends: Bang Bang](https://en.wikipedia.org/wiki/Mobile_Legends:_Bang_Bang)
- MLBB surrender: vote unavailable until ~3 minutes in; at least four players must agree; counts as a loss without AFK penalty — [VCGamers surrender guide](https://www.vcgamers.com/news/en/the-correct-way-to-surrender-in-mobile-legends-is-something-beginners-must-know/) (single beginner guide; unverified)
- Wild Rift: matches expected to run 15–20 minutes, "about half that of Summoner's Rift"; pre-game lobby streamlined; level cap 18 -> 15; map "smaller, faster, and specced for mobile"; changes "designed to reward quick, aggressive play, thereby promoting shorter games" — [Riot support: map and modes](https://support.riotgames.com/en-us/wild-rift/gameplay/map-and-modes); [GamingBolt dev diary](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary)
- Riot's gameplay lead said "time and availability to play" were consistent trends among players asking for mobile versions, and shorter length was also one of the trade-offs to ship the Alpha on time — [GamingBolt / Riot Q&A coverage](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary)
- Wild Rift open beta averaged ~18–25 min, positioned between AoV/MLBB and Summoner's Rift; PC LoL matches commonly ~40–45 min — [Global Games Forum](https://www.globalgamesforum.com/features/league-of-legends-wild-rift-enters-the-mobile-moba-arena); [Fragster](https://www.fragster.com/how-long-do-wild-rift-games-last-a-quick-guide-to-match-durations/)
- Honor of Kings: "quick-match (15–20 minutes)"; Level Infinite credits short match length and small packet size for supporting low-end devices — [Wikipedia: Honor of Kings](https://en.wikipedia.org/wiki/Honor_of_Kings); [SI Videogames / Level Infinite](https://videogames.si.com/features/honor-of-kings-level-infinite-mobile-moba)
- Strike of Kings (HoK's early Western soft launch): matches "usually no more than about 15 minutes at worst"; Tribeflame CEO Torulf Jernström argued needing ≥15 minutes per match is the main risk for the genre in the West — [PocketGamer.biz: Strike of Kings design](https://www.pocketgamer.biz/strike-of-kings-mobile-esports-design); [PocketGamer.biz: can Strike of Kings maintain momentum](https://www.pocketgamer.biz/can-strike-of-kings-continue-maintain-momentum)
- Pokémon Unite: hard 10-minute time limit — [RPGFan](https://www.rpgfan.com/review/pokemon-unite); [Game8](https://game8.co/games/Pokemon-UNITE/archives/336065)
- Phase structure visible in timers: laning with jungle buffs (0:20–0:45), first river objective 2:00 (MLBB Turtle / AoV Dragon), mid-game pushing boss ~8:00 (MLBB Lord, AoV Dark Slayer), late-game escalation ~18–20 min (MLBB Evolved Lord 18:00, Wild Rift Elder 19:00, HoK Tempest Dragon 20:00) — sources in section 4

### Inferences
- Even "short" mobile MOBAs (12–20 min) are 4–6x a Clash Royale match (~3 min + overtime; from general knowledge, verify in Clash Royale research). A hybrid probably needs a 5–8 minute target, implying compressed timers (e.g., first objective ~1:00, pusher boss ~3:00, final phase ~last 1:00) and fewer structure layers (Wild Rift precedent: cut a layer rather than shorten everything).
- Hard time limits with an end-phase multiplier (Unite) bound match length better than surrender votes, which only exist because matches can drag.

### Gaps
- No official MLBB statistic on median match duration by rank; no reliable source for MLBB's current surrender timing beyond one guide.
- No GDC talk or Game Developer article specifically analysing MLBB pacing was surfaced.

## 7. Roles, draft and bans

### Takeaway
MLBB has six roles (Tank, Fighter, Assassin, Mage, Marksman, Support) mapped onto five positions (Gold, EXP, Mid, Jungle, Roam). Ranked draft bans scale with rank — reported as 6 bans at Epic, 8 at Legend, 10 at Mythic+.

### Cited Findings
- Six roles and five positions (Gold, EXP, Mid, Jungle, Roam) — [Playnews](https://www.playnews.gg/en/guides/mlbb-guide-to-the-6-roles-and-5-positions-to-get-started); [manabuy role guide](https://manabuy.com/blog/mobile-legends-bang-bang/mlbb-role-guide-jungle-roam-exp-gold-mid)
- Draft by rank (2026 guide): Epic 6 bans (3/team), Legend 8 bans (4/team), Mythic+ 10 bans (5/team); mixed-rank parties use the highest member's rules; another table says Warrior–Master have no draft and 0 bans — partial conflict on lower tiers — [mlbbhub rank system 2026](https://mlbbhub.com/news/mlbb-rank-system-all-tiers-stars-season-reset-2026)
- The 10-ban system was first introduced via the Advanced (test) server — [AFK Gaming](https://afkgaming.com/mobileesports/news/10-hero-ban-system-unveiled-on-the-mobile-legends-advanced-server)
- AoV guidance: two heroes in the Dragon lane and one in the Slayer lane when the team has a jungler — [Samurai Gamers](https://samurai-gamers.com/arena-of-valor/top-dark-slayer-lane/)

### Inferences
- The 6-role taxonomy maps naturally to unit card archetypes (tank = frontline, marksman = sustained ranged DPS needing protection, assassin = backline diver, mage = burst/AoE, support = buffs/heals, fighter = bruiser). The "positions" layer (who goes where) becomes the commander's per-lane allocation decision.
- Ban phases exist to manage a large roster in 5v5 coordination; in 1v1 card play a deck-ban or pre-match card-ban step could provide similar counter-play but adds queue time.

### Gaps
- Exact roster size and draft pick order for MLBB as of late 2026 not confirmed.

## 8. Mobile controls, targeting and attention

### Takeaway
Mobile MOBAs use a left virtual joystick plus right-side skill buttons with drag-to-aim, auto-targeting/priority-lock helpers, and mirrored maps so skills don't aim into the HUD. Designers report target-lock systems work poorly for ground-targeted abilities — directly relevant to card drop placement.

### Cited Findings
- Twin-stick layout (movement left, aim/abilities right) is the genre convention used by Wild Rift and Heroes of Order & Chaos; auto-aim (face nearest enemy) lets players focus on movement/timing — [Clever Plays: PC vs mobile controls](https://clever-plays.com/blog/the-challenges-of-developing-for-pc-and-mobile-part-1-controls/); [cursa touch controls](https://cursa.app/en/page/touch-controls-for-mobile-games-input-patterns-and-feedback)
- Wild Rift offers a priority/lock-on option for its auto-targeting system — [Upcomer Wild Rift settings](https://upcomer.com/what-are-the-best-settings-in-league-of-legends-wild-rift)
- Wild Rift's mirrored map exists because on red side aimed skills would run into the twin-stick HUD; Riot wanted players focused on the enemy, not their thumb — [Riot support](https://support.riotgames.com/en-us/wild-rift/gameplay/map-and-modes)
- Vainglory's developer deliberately avoided virtual joypads and accelerometer input for its touch MOBA (tap-to-move instead) — [Game Developer: Five lessons building a MOBA for touch screens](https://gamedeveloper.com/business/five-lessons-i-ve-learned-building-a-moba-for-touch-screens)
- Target lock and target cycling do not suit games where players aim at ground positions rather than enemies — [Clever Plays (reposted at jikguard)](https://www.jikguard.com/news/the-challenges-of-developing-for-pc-and-mobile-part-1-controls/)
- MLBB's lead in SEA is partly attributed (opinion) to running smoothly on budget phones — [Synn Store blog](https://synnmlbb.com/blog/why-mlbb-still-dominates-wild-rift-in-sea-a-data-driven-comparison-of-mobile-moba-success); [CPG](https://consolepcgaming.com/why-mobile-legends-bang-bang-keeps-outsmarting-wild-rift-in-mobile-esports)

### Inferences
- MOBA control complexity (one hero, joystick, 3–4 skills, aim) is replaced in a card game by tap/drag-to-deploy (Clash Royale model); the hard UX problem shifts from aiming to attention: three lanes on a landscape screen require either a zoomed-out full map (small units) or a camera/minimap you swap between. MOBAs solve map awareness with a minimap and teammates; a solo commander has neither teammates nor a single avatar to anchor the camera, so the full map likely must be visible or one-tap reachable.
- Ground-placed cards are the case where auto-target helpers don't apply (per Clever Plays), so lane snapping (drop a card on a lane, not a precise point) is a likely simplifier.

### Gaps
- No quantitative data found on how much screen/attention split MLBB players handle (e.g., minimap glance frequency), and no Moonton writeup on MLBB control design.
- Riot's own detailed writeup of Wild Rift targeting rules was not surfaced.

## 9. Complexity reduction for casual audiences (Pokémon Unite, Wild Rift, Heroes of the Storm)

### Takeaway
Pokémon Unite is the strongest precedent for simplifying the MOBA: 2 lanes + central jungle, scoring into goal zones instead of destroying turrets, no last-hitting, no in-match gold/item shop, hard 10-minute limit, single decisive late boss. Reviewers praised accessibility but analysts said it cut depth and retention. Wild Rift simplified more conservatively (smaller map, level 15 cap, no inhibitors/turret plates, Nexus fights back).

### Cited Findings
- Unite's scoring system is "the most notable unique feature"; no item/gold system yet meaningful decisions remain; 10-minute cap — [RPGFan](https://www.rpgfan.com/review/pokemon-unite)
- Dropping last-hitting makes the game easier "without constant mental focus" — [TheGamer](https://www.thegamer.com/pokemon-unite-new-moba-league-of-legends-comparison/); [Upcomer](https://upcomer.com/in-pokemon-unite-simplicity-is-the-point)
- Heroes of the Storm previously simplified via shorter matches, team-wide leveling and talent trees instead of a gear shop — [TheGamer](https://www.thegamer.com/pokemon-unite-new-moba-league-of-legends-comparison/)
- Goal zones: two lanes with goal zones per side (forward 80 pts, middle 100 pts, base indestructible); scoring is interrupted if the scorer takes damage (unless goals are disabled by Rotom/Zapdos or the scorer has Rayquaza's shield) — [Bulbapedia: Goal zone](https://bulbapedia.bulbagarden.net/wiki/Goal_zone); [Pokémon.com overview](https://www.pokemon.com/us/strategy/pokemon-unite-theia-sky-ruins-overview)
- Critiques: pick-up-and-play focus "lacks the depth of other MOBAs"; pay-to-win concerns around item upgrades; hardcore players felt out of place — [Digital Trends review](https://qa2.www.digitaltrends.com/gaming/pokemon-unite-review); [Deconstructor of Fun (Nov 2021)](https://www.deconstructoroffun.com/blog/2021/11/21/pokemon-unite-9lc3j); positive for newcomers: [Massively OP](https://massivelyop.com/2021/07/30/massively-on-the-go-pokemon-unite-is-genuinely-fun-for-new-and-casual-moba-players/)
- Wild Rift simplifications (no inhibitors, no turret plates, shooting Nexus, smaller map, level 15) — [GamingBolt](https://gamingbolt.com/league-of-legends-wild-rift-streamlined-gameplay-revealed-in-new-dev-diary); [Riot support](https://support.riotgames.com/en-us/wild-rift/gameplay/map-and-modes)
- Wild Rift is perceived as harder to play than MLBB and AoV — [AFK Gaming comparison](https://afkgaming.com/mobileesports/Blogs/5228-how-will-wild-rift-do-against-mobile-legends) (opinion)

### Inferences
- A useful spectrum: PC LoL (most complex) -> Wild Rift -> HoK/AoV/MLBB -> Pokémon Unite -> Clash Royale (2 lanes, no jungle, ~3 min). A card x 3-lane hybrid sits between Unite and Clash Royale; the elements most worth keeping from MOBAs are (a) lane-specific identities, (b) timed neutral objectives with lane-push rewards, (c) multi-layer towers with early protection; elements to drop are last-hitting, in-match item shops, and per-hero leveling (replace with elixir/energy and card levels).
- Unite's goal-zone model (score into structures; structures break at thresholds) is an alternative to HP-based turrets that may read more clearly at card-game unit scale.

### Gaps
- Clash Royale's own arena numbers are outside this note's scope (expected in the parallel Clash Royale research) and were not sourced here.
- No retention/DAU data comparing Unite with MLBB was found in this session.

## 10. Player pain points and how a single-commander design might avoid them

### Takeaway
Recurring MLBB complaints centre on matchmaking imbalance in solo queue, AFK/toxic/feeding teammates, role forcing, and a report/penalty system perceived as unfair; mobile MOBAs also carry 12–20 minute session costs and snowballing. Most of these are artifacts of 5-player team dependency, which a 1v1 commander design removes by construction.

### Cited Findings
- Complaint themes (self-selected complaint board, not representative): broken matchmaking and losing streaks, unpunished toxicity, teammates blocking buffs without being banned, unfair penalties for MVP players, role forcing in ranked — [SikayetVar: solo queue imbalances and toxicity](https://www.sikayetvar.com/en/mobile-legends-us/solo-queue-imbalances-and-unpunished-toxicity-fuel-complaints-in-mobile-legends); [SikayetVar: role forcing](https://www.sikayetvar.com/en/mobile-legends-us/i-face-unfair-punishments-and-role-forcing-in-mobile-legends-ranked-matches); [SikayetVar: unfair penalty as MVP](https://www.sikayetvar.com/en/mobile-legends-us/i-got-unfairly-penalized-in-mobile-legends-despite-being-mvp-and-not-flaming)
- Aggregated Google Play review analysis shows mixed feedback on MLBB matchmaking — [Kimola report](https://kimola.com/reports/unlock-insights-into-mobile-legends-feedback-google-play-es-419-153076)
- Recurring problems listed by a guide: team imbalance, AFK/toxic players, heavy solo queue, limited hero pool — [VCGamers](https://www.vcgamers.com/news/en/?p=186328)
- Academic definition: intentional feeding = dying to opponents on purpose; AFK and verbal abuse are classed as toxic behaviour in MOBA research (game studied not confirmed as MLBB) — [arXiv 1504.02305](https://arxiv.org/pdf/1504.02305.pdf)
- Session length as a genre barrier in the West (≥15 min per match) — [PocketGamer.biz](https://www.pocketgamer.biz/can-strike-of-kings-continue-maintain-momentum)

### Inferences
- In a 1v1 commander game, AFK/feeding/role-forcing/teammate toxicity disappear; remaining risks are opponent-matching fairness (deck power, card levels -> P2W perception, as Unite was criticised for), BM/emotes, and snowballing.
- Snowball control can be borrowed from MOBAs: time-gated tower shields (MLBB first 5 min), minion-gated damage reduction (anti-backdoor), late-game escalating objectives (Lord evolution 18:00, Unite final-2-minute multiplier) and team-shared/objective-spawned units that the trailing player can contest.
- A hard match timer with an end-phase multiplier removes the need for surrender votes.

### Gaps
- No Moonton or third-party survey data quantifying toxicity/AFK rates in MLBB was found; complaint boards are anecdotal.
- No data found on MLBB snowball statistics (e.g., win rate of team taking first Turtle/first turret).

# Heroes · roster v2 (20 heroes)

_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._

Decisions: DEC-006 (folk-tale world and names), DEC-007 (power system), DEC-011 (heroes start on the map; ultimates are called), DEC-023 (strategy and action). Plans: PLAN-002, PLAN-004, PLAN-015. All numbers are first values to tune in play tests.

## How powers work

- **Trait**: always on.
- **Power**: fires by itself when its trigger happens, then waits its cooldown. When it is ready it waits 1.5 s for you first: tap the hero's Power gem to fire it **on cue**, 20% stronger (PLAN-015).
- **Level-up choices** (PLAN-015): at levels 2 and 3 pick the hero's own upgrade (the "Lv 2" and "Lv 3" text below, in order) or a general one: **Quick** at level 2 (the Power comes back 25% sooner) or **Strong** at level 3 (the Power does 30% more). If you don't choose within 8 s, the hero's own upgrade is chosen.
- **Ultimate**: unlocks at level 4, once per life (ready again after respawn). The ULT button glows at a good moment (the "best moment" below); tap it and the hero fires at the next good moment. 11 ultimates can also be **aimed**: drag the ULT button onto the map (see "Aim" below). Belang's is always on.
- **Warning rings** (PLAN-015): Riptide, Moon Kite, Stampede and Dawn Freeze land 1 s after a ring appears; Duel and Coil lock on after 0.6 s and miss a target that got 150 past their reach. Both sides see every ring.
- **Dodge dash**: flick one of your heroes on the map to dash 400 that way, once every 10 s.
- **Combo chains**: Power and ultimate damage from different heroes on the same enemy within 2 s chains: +15% for the second hero, +30% after that.
- **Best order**: +15% damage while following it (gankers keep it for a few seconds after arriving).
- **Heroes on the map**: you pick 3 heroes before the match; both start at your Pusaka. You command them and buy them items with Semangat. Species, lane troops, items and map rewards: see `species.md`.

## Roster

| Hero | Role | Best order | Health | Damage | Reach | Speed |
|---|---|---|---|---|---|---|
| Rimba, the Unseen Hunter | Ganker | Gank | 850 | 70 every 0.9 s | 520 | 8 |
| Benteng, the Living Fort | Defender | Defend | 1800 | 55 every 1.1 s | 180 | 6 |
| Kail, the Riverhook | Initiator | Defend | 1250 | 72 every 1.2 s | 300 | 7 |
| Seri, of the Hidden Folk | Support | Farm | 850 | 50 every 1.0 s | 450 | 7 |
| Belang, the Tiger Within | Jungler | Farm | 1150 | 60 every 0.9 s | 170 | 8 |
| Gergasi, the Wall-Breaker | Siege | Push | 2000 | 90 every 1.6 s | 180 | 4 |
| Dalang, the Shadow Puppeteer | Summoner | Push | 850 | 35 every 1.2 s | 550 | 6 |
| Senja, the Dusk Serpent | Mage | Push | 1150 | 72 every 1.2 s | 550 | 7 |
| Hujan, the Rain Caller | Healer | Defend | 850 | 35 every 1.1 s | 450 | 7 |
| Layang, the Kite Rider | Diver | Gank | 850 | 80 every 1.0 s | 170 (flies) | 10 |
| Pendekar, the Silat Master | Duelist | Gank | 1450 | 80 every 1.0 s | 180 | 8 |
| Pelanduk, the Clever Mousedeer | Trickster | Push | 680 | 55 every 0.9 s | 170 | 10 |
| Saudagar, the Spice Trader | Economist | Farm | 950 | 58 every 1.1 s | 450 | 7 |
| Badak, the Charging Rhino | Charger | Push | 1800 | 70 every 1.2 s | 180 | 7 |
| Tedung, the King Cobra | Assassin | Gank | 920 | 70 every 1.0 s | 300 | 8 |
| Tukang, the Bamboo Builder | Builder | Defend | 1150 | 50 every 1.1 s | 450 | 6 |
| Helang, the Sea Eagle | Marksman | Push | 600 | 94 every 1.3 s | 650 | 7 |
| Embun, the Mist Weaver | Controller | Defend | 850 | 50 every 1.1 s | 550 | 7 |
| Ombak, the Tide Rider | Pusher | Push | 1150 | 65 every 1.1 s | 300 | 7 |
| Buaya, the River Jaws | Bruiser | Farm | 1550 | 75 every 1.1 s | 180 | 7 |

### Rimba · the Unseen Hunter
Ganker · best order **Gank** · ranged

- **Trait: Forest Step.** 30% faster in the jungle. When an enemy spots her, she stays hidden 2 s longer.
- **Power: Volley** (every 10 s, when enemies are in range). Arrows hit the 3 nearest enemies for 105. Lv 2: 4 enemies. Lv 3: also slows them 30% for 2 s.
- **Ultimate: Hunter’s Mark** (best moment: call it, then her next Ambush hit). The target takes +50% damage from all your units for 6 s.
- **Aim:** Drag onto an enemy within 900 to mark it now.
- Strong vs lone heroes, Pemanah, supports. Weak vs Seri (reveal), Benteng (Stomp).
- Inspired by: Dota’s invisible gankers with a first-strike bonus; Clash Royale’s ranged support troops.

### Benteng · the Living Fort
Defender · best order **Defend** · melee

- **Trait: Hold the Gate.** Near a friendly tower he takes 30% less damage, and that tower attacks 20% faster.
- **Power: Stomp** (every 12 s, when enemies are close). Hits everything around him for 100 and slows it 40% for 3 s. Lv 2: bigger area. Lv 3: also stuns 0.5 s.
- **Ultimate: Unbreakable** (best moment: when a tower near him falls below 30%). Gives that tower a 1,000 shield for 8 s.
- **Aim:** Drag onto any of your towers to shield it.
- Strong vs swarms, Gergasi, ganks into his lane. Weak vs Senja (out-ranges and silences him), Dalang.
- Inspired by: Dota’s stomping tank initiators; Clash Royale’s splash melee and tower defence.

### Kail · the Riverhook
Initiator · best order **Defend** · ranged

- **Trait: Net.** His hits slow by 20% for 1 s.
- **Power: Hook** (every 12 s). Pulls the most dangerous visible enemy within 700 to his feet: heroes first, then the biggest troop. Lv 2: reach 850. Lv 3: the target is stunned 1 s.
- **Ultimate: Riptide** (best moment: when 4 or more enemies are within 600). A wave pushes every enemy near him in his lane back 400 and slows them 40% for 3 s.
- **Aim:** Drag onto a spot within 800: the wave hits there after its warning ring.
- Strong vs Gergasi and Kerbau (drags them into tower fire), lone heroes. Weak vs swarms, Pelanduk (a hooked decoy is a wasted hook).
- Inspired by: Dota’s hook-and-pull heroes; Clash Royale’s knock-back spells that undo a push.

### Seri · of the Hidden Folk
Support · best order **Farm** · ranged

- **Trait: Second Sight.** Hidden enemies within 900 of her are revealed to you.
- **Power: Spirit Lantern** (every 20 s). Leaves a lantern that reveals hidden enemies within 900 for 30 s. Lv 2: lasts 45 s. Lv 3: allies near it heal 2% a second.
- **Ultimate: Veil** (best moment: call it, then when one of your heroes starts a Gank). All your heroes become hidden for 6 s, wherever they are.
- Strong vs Rimba, Belang, every gank plan. Weak vs Pendekar, Layang (divers who reach her).
- Inspired by: Dota’s wards, true sight and smoke ganks; folk tales of the hidden forest people.

### Belang · the Tiger Within
Jungler · best order **Farm** · melee

- **Trait: Hunter’s Hunger.** Double XP from camps. Heals 25% and gives 1 extra Semangat for each camp it clears.
- **Power: Pounce** (every 10 s). Leaps onto an enemy within 500 for 90 and stuns it 0.5 s. Lv 2: +40% damage. Lv 3: stun 1 s.
- **Ultimate: Shape of the Beast** (best moment: always on from level 4). Transforms for good: +40% health, +30% attack speed, and its hits cleave nearby enemies.
- Strong vs the late game, supports, Pelanduk. Weak vs early pressure, Pendekar (Duel), Kail.
- Inspired by: Dota’s farming carries and shape-shifters; Clash Royale’s dashing troops; the weretiger of folk tales.

### Gergasi · the Wall-Breaker
Siege · best order **Push** · melee · hits buildings only

- **Trait: Wall-Breaker.** Only attacks towers and the Pusaka, for triple damage; he can’t hit troops or heroes. On Defend he blocks the lane: enemy troops near him move 50% slower.
- **Power: Boulder** (every 12 s, when an enemy tower is within 1,300). Throws a boulder at it for 150. Lv 2: 225. Lv 3: also knocks back troops around that tower.
- **Ultimate: Rampage** (best moment: when he reaches an enemy tower). For 8 s he moves 50% faster and his hits splash.
- Strong vs towers, slow defences. Weak vs Kail, Benteng, swarms (he can’t fight back).
- Inspired by: Clash Royale’s giants that only target buildings; Dota’s siege pushers; the giants of folk tales.

### Dalang · the Shadow Puppeteer
Summoner · best order **Push** · ranged

- **Trait: Behind the Screen.** Keeps behind your front troops in his lane, and waits at the river when there are none.
- **Power: Shadow Play** (every 14 s). Summons 2 shadow puppets for 14 s. Lv 2: 3 puppets. Lv 3: the puppets copy the troop class of the lane he is in, at a third of its health and half its damage.
- **Ultimate: Grand Performance** (best moment: when a big enemy troop is within 600). Takes control of it for 10 s.
- **Aim:** Drag onto an enemy troop within 700 to take control of it.
- Strong vs Gergasi, Kerbau, single-target heroes. Weak vs Senja, Benteng, Petir (splash).
- Inspired by: Dota’s summoners and mind control; Clash Royale’s spawners and copy cards; wayang kulit shadow puppetry.

### Senja · the Dusk Serpent
Mage · best order **Push** · ranged

- **Trait: Tide Scales.** Takes 50% less damage from spells and hero powers.
- **Power: Waterspout** (every 9 s, when 3 or more enemies are grouped). Hits the group for 140. Lv 2: bigger area. Lv 3: also stuns them 0.5 s.
- **Ultimate: Swallow the Moon** (best moment: when 2 or more enemy heroes are visible). Silences all enemy heroes for 5 s and halves the opponent’s Semangat refill for 10 s.
- Strong vs swarms, Dalang, Pelanduk. Weak vs Pendekar, Rimba, Layang.
- Inspired by: Dota’s nukers and global silences; Clash Royale’s splash wizards; island legends of the moon-eating serpent.

### Hujan · the Rain Caller
Healer · best order **Defend** · ranged

- **Trait: Monsoon.** Allies within 400 of her regain 1% health a second.
- **Power: Healing Rain** (every 10 s, when an ally near her is hurt). Heals allies within 350 for 150. Lv 2: 220. Lv 3: also repairs nearby towers for 100.
- **Ultimate: Flash Flood** (best moment: when 4 or more enemies attack a tower in her lane). Floods the lane for 6 s: enemies slowed 50%, your troops 30% faster.
- **Aim:** Drag onto any lane to flood it.
- Strong vs long fights, poke. Weak vs Belang, Pendekar, Senja (silence).
- Inspired by: Dota’s healers; Clash Royale’s healing troops; the monsoon.

### Layang · the Kite Rider
Diver · best order **Gank** · melee · flies

- **Trait: On the Wind.** Flies. Only ranged units, towers and spells can hit her. Never hidden: everyone sees her coming.
- **Power: Dive** (every 10 s). Swoops on the weakest enemy within 600 for 150. Lv 2: 225. Lv 3: flies back to where she was after the hit.
- **Ultimate: Moon Kite** (best moment: call it, then order a Gank). Crosses to the lane instantly and stuns enemies within 300 for 1 s.
- **Aim:** Drag onto any spot: she lands there after a warning ring.
- Strong vs Gergasi, Dalang, back-line heroes (Senja, Hujan). Weak vs Pemanah, towers, Rimba.
- Inspired by: Clash Royale’s flying troops (only some cards hit air); Dota’s global gankers; the wau bulan moon kite.

### Pendekar · the Silat Master
Duelist · best order **Gank** · melee

- **Trait: Silat Guard.** Every 4 s, fully blocks the next hit.
- **Power: Keris Strike** (every 10 s, when a target is within 600). Dashes to the nearest visible enemy hero (or biggest troop), hits it for 120 and silences it for 2 s. Lv 2: 3 s. Lv 3: 180 damage.
- **Ultimate: Duel** (best moment: when an enemy hero is within 400). Locks both heroes in a 4 s duel where only they can hit each other. If he wins, he keeps +10% damage for the match.
- **Aim:** Drag onto an enemy hero within 600 to challenge it.
- Strong vs Belang, Senja, Hujan. Weak vs Benteng, Kail, swarms.
- Inspired by: Dota’s duel and anti-carry heroes; Clash Royale’s dashing champions; silat martial art.

### Pelanduk · the Clever Mousedeer
Trickster · best order **Push** · melee

- **Trait: Unnoticed.** Enemies hit other targets first if any are in reach.
- **Power: Decoys** (every 10 s). Makes 2 copies that deal no damage but draw fire for 4 s. Lv 2: 3 copies. Lv 3: copies last 6 s.
- **Ultimate: Clever Escape** (best moment: call it in advance: when it would die). Vanishes instead and reappears at your Pusaka with 30% health.
- Strong vs towers, Kail, Pendekar (wasted single-target powers). Weak vs Senja, Benteng, Petir.
- Inspired by: Dota’s illusion heroes; Clash Royale’s cheap bait cards; the mousedeer trickster tales.

### Saudagar · the Spice Trader
Economist · best order **Farm** · ranged

- **Trait: Trade Route.** While he lives, your Semangat refills 10% faster.
- **Power: Trade Winds** (every 12 s). Gives you 1 Semangat. Lv 2: 1.5. Lv 3: 2.
- **Ultimate: Golden Monsoon** (best moment: any time). Gives you 3 Semangat, and your next item costs half.
- Strong vs long matches, item-heavy heroes. Weak vs early rushes, Tedung, Layang.
- Inspired by: Clash Royale’s Semangat collectors; Dota’s gold-greedy heroes; the spice traders of the old ports.

### Badak · the Charging Rhino
Charger · best order **Push** · melee

- **Trait: Thick Hide.** Takes 25% less damage from towers and the Pusaka.
- **Power: Charge** (every 12 s, when an enemy is within 600). Charges into it: enemies around the impact take 100, are knocked back and stunned 0.5 s. Lv 2: 150. Lv 3: stun 1 s.
- **Ultimate: Stampede** (best moment: when the enemy tower in his lane is within 2,000). Charges to the tower, hits it for 200 and stuns enemies around it for 1.5 s.
- **Aim:** Drag onto a spot within 1,600: he charges there after a warning ring.
- Strong vs Pemanah, Hujan, packed defences. Weak vs Kail, Dalang (taken over), Tedung.
- Inspired by: Clash Royale’s charging riders and rams; Dota’s charging initiators; the Sumatran rhino.

### Tedung · the King Cobra
Assassin · best order **Gank** · ranged

- **Trait: Venom.** Her hits poison: 2% of the target’s health a second for 3 s.
- **Power: Spit** (every 8 s, when enemies are within 500). Spits at the 2 nearest enemies: poison (4% a second for 3 s) and a 30% slow for 2 s. Lv 2: 3 enemies. Lv 3: poison doubled.
- **Ultimate: Coil** (best moment: when an enemy hero within 400 is below 50%). Stuns it 2 s and poisons it for 6% a second for 3 s.
- **Aim:** Drag onto an enemy hero within 500 to strike it at any health.
- Strong vs tanks, healers, Saudagar. Weak vs Hujan (heals poison off), Benteng, Pemanah.
- Inspired by: Dota’s poison heroes; Clash Royale’s Poison spell; the king cobra.

### Tukang · the Bamboo Builder
Builder · best order **Defend** · ranged

- **Trait: Carpenter.** Your towers within 700 of him repair 1% a second.
- **Power: Bamboo Watchtower** (every 20 s). Builds a small watchtower where he stands (500 health, shoots for 20 s). Lv 2: 700 health. Lv 3: lasts 30 s.
- **Ultimate: Bamboo Bulwark** (best moment: when one of your towers falls below 50%). All your towers get a 600 shield and attack 30% faster for 8 s.
- Strong vs Gergasi, Kerbau, slow pushes. Weak vs Senja, Petir, Badak.
- Inspired by: Clash Royale’s defensive buildings; Dota’s builders and tower glyph; bamboo craft.

### Helang · the Sea Eagle
Marksman · best order **Push** · ranged

- **Trait: Eagle Eye.** The longest reach of any hero, and +25% damage to heroes.
- **Power: Piercing Shot** (every 9 s, when an enemy is within 900). An arrow that hits every enemy in a line for 130. Lv 2: 180. Lv 3: also slows them 40% for 2 s.
- **Ultimate: Storm of Feathers** (best moment: when 3 or more enemies are in reach). Attacks twice as fast for 6 s.
- Strong vs Gergasi, Benteng, slow walkers. Weak vs Layang, Pendekar, Belang (divers).
- Inspired by: Dota’s snipers; Clash Royale’s piercing archers; the sea eagles of the islands.

### Embun · the Mist Weaver
Controller · best order **Defend** · ranged

- **Trait: Morning Mist.** Enemies within 400 of her are 15% slower.
- **Power: Fog Bank** (every 14 s, when 2 or more enemies are within 800). Fog covers them for 6 s: enemies inside are 40% slower, and your heroes inside are hard to see. Lv 2: lasts 8 s. Lv 3: bigger fog.
- **Ultimate: Dawn Freeze** (best moment: when 5 or more enemies are within 600). Freezes every enemy within 600 for 1.5 s.
- **Aim:** Drag onto a spot within 700: the freeze lands after a warning ring.
- Strong vs big pushes, swarms, Badak. Weak vs Helang, Rimba, Tedung.
- Inspired by: Dota’s area controllers; Clash Royale’s Freeze spell; mountain morning mist.

### Ombak · the Tide Rider
Pusher · best order **Push** · ranged

- **Trait: High Tide.** Your troops in her lane near her move 15% faster.
- **Power: Surge** (every 12 s, when enemies are ahead of her). A wave rolls 900 up her lane: enemies take 110 and are pushed back 250. Lv 2: 150. Lv 3: also slows them 30% for 2 s.
- **Ultimate: King Tide** (best moment: when 3 or more of your troops are in her lane). For 10 s, your troops in her lane deal 30% more damage and move 30% faster.
- **Aim:** Drag onto any lane to raise the tide there.
- Strong vs slow defences, Benteng, Tukang. Weak vs Embun, Senja, Kail.
- Inspired by: Dota’s wave pushers; Clash Royale’s Rage and The Log; the king tides of the coast.

### Buaya · the River Jaws
Bruiser · best order **Farm** · melee

- **Trait: Death Roll.** Heals 20% of the damage it deals.
- **Power: Drag Under** (every 12 s, when an enemy is within reach). Grabs the nearest enemy: stuns it 1.5 s and deals 180 over that time. Lv 2: 240. Lv 3: 300.
- **Ultimate: Swamp King** (best moment: when it is below 40% health). For 8 s it heals 5% a second and can’t be slowed, stunned or silenced.
- Strong vs Belang, Pendekar, long melee fights. Weak vs Helang, Tedung, Kail.
- Inspired by: Dota’s life-stealing bruisers; Clash Royale’s tanky melee; river crocodile tales.

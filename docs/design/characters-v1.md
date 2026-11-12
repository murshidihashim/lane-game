# Heroes and powers · concept v1

> **Superseded** by `docs/design/heroes.md` (roster v2, 20 heroes, generated from the game data) after the owner approved DEC-006 and DEC-007 and asked for 20 heroes (PLAN-002). Kept as the record of concept v1.

Owner: Murshidi. Written 12 Nov 2026 (Asia/Kuala_Lumpur). Status: **proposed, not approved**.
Request: "develop charactor game concept and powers, use dota & clash royale as inspiration".
Builds on DEC-002 (heroes are special cards you give orders to) and DEC-004 (powers fire
automatically). All numbers are starting values to tune in play tests.

## 1. The world (proposed theme)

The heroes come from a rainforest archipelago inspired by Southeast Asian folk tales: hidden forest
folk, a clever mousedeer, a weretiger, shadow puppets, silat fighters, monsoon rains and moon kites.
That gives the game its own look next to the medieval fantasy of most card battlers. It also speaks
to the first market (Malaysia, then Indonesia and the Philippines).

| Game term | Themed name (proposal) | Why |
|---|---|---|
| Mana | **Semangat** | Malay for spirit or life-force |
| Core | **Pusaka** | A family's sacred heirloom, the thing you protect |
| Tower | **Kubu** | Fort |
| Jungle camp | **Grove** | A guarded fruit grove in the jungle |

**Rules for the theme:**
- Every hero is an original character with a working name. Folklore gives the idea, not the person.
- No religious figures or deities, no real historical people, and no spirits of the dead for now,
  so the game stays comfortable for families across the region.
- No folklore figure that another game already uses as a hero. For example, MLBB has Badang,
  Gatotkaca and Lapu-Lapu.
- Names must be checked against other games' rosters and with MyIPO before they are final.

## 2. How powers work (power system v1)

Dota gives heroes a kit that grows during the match. Clash Royale keeps every card readable at a
glance and has moved hero abilities to "one use per deployment". This system takes both ideas.

| Part | When | What it is |
|---|---|---|
| **Trait** | Always | A passive that defines the hero (e.g. "faster in the jungle") |
| **Power** | Level 1, stronger at 2 and 3 | Fires automatically on a clear trigger, then waits a cooldown |
| **Ultimate** | Unlocks at level 4 | One big moment, **once per life**. It fires on its trigger, and dying makes it ready again after respawn |
| **Best order** | While following it | +15% damage. Shown as a star on that order's spot when you drag the hero |

- **Levels** come from XP, as in the prototype: lane fights, camps, kills. Each level adds +15%
  health and damage. Level 4 is the Dota-style power spike, so farming and staying alive matter.
- **Triggers are written on the card** in plain words, e.g. "when 3 or more enemies are close". You
  play the hero through orders: you choose where the hero is when its power goes off.
- **Readable on a phone:** a cooldown ring on the hero's portrait, a gold ring when the ultimate is
  ready, and the power's name pops up when it fires (already in the prototype).
- **No dice:** no random critical hits or dodges. The research found players resent randomness
  that overrules a decision they already made.
- **Ten effect words, one icon each:** Slow, Stun, Silence (no powers), Knockback, Pull, Shield,
  Heal, Reveal (shows hidden heroes), Hidden, Flying.
- **Deck:** 8 cards with at most 2 heroes. Before the match you pick your 2 heroes. Hero cards cost
  3 to 6 mana.

## 3. The roster (12 heroes)

Stats are 1 (low) to 5 (high). Build size: **S** uses rules the prototype already has,
**M** needs one new effect, **L** needs a new rule.

### Rimba · the Unseen Hunter
Ganker · cost 5 · best order **Gank** · ranged · HP 2 · Damage 4 · Range 4 · Speed 4 · Build S (rework of Ranger)
- **Trait: Forest Step.** 30% faster in the jungle. When an enemy spots her, she stays hidden 2 s longer.
- **Power: Volley** (every 10 s, when enemies are in range). Arrows hit the 3 nearest enemies.
  Level 2: 4 enemies. Level 3: also slows them 30% for 2 s.
- **Ultimate: Hunter's Mark** (on her first Ambush hit). The target takes +50% damage from all your units for 6 s.
- Strong vs lone heroes, Archers, supports. Weak vs Seri (reveal), Benteng (Stomp).
- Inspired by: Dota's invisible gankers with a bonus first strike · Clash Royale's ranged support troops.

### Benteng · the Living Fort
Defender · cost 5 · best order **Defend** · melee · HP 5 · Damage 2 · Range 1 · Speed 2 · Build S (rework of Warden)
- **Trait: Hold the Gate.** Near a friendly tower he takes 30% less damage, and that tower attacks 20% faster.
- **Power: Stomp** (every 12 s, when enemies are close). Damages and slows everything around him.
  Level 2: bigger area. Level 3: also stuns 0.5 s.
- **Ultimate: Unbreakable** (when the tower he guards falls below 30% health). Gives that tower a 1,000 shield for 8 s.
- Strong vs swarms, Gergasi, ganks into his lane. Weak vs Senja (out-ranges and silences him), Dalang.
- Inspired by: Dota's stomping tank initiators · Clash Royale's splash-damage melee and tower defence.

### Kail · the Riverhook
Initiator · cost 4 · best order **Defend** · short range · HP 3 · Damage 3 · Range 2 · Speed 3 · Build M (pull)
- **Trait: Net.** His hits slow by 20% for 1 s.
- **Power: Hook** (every 12 s). Pulls the most dangerous visible enemy within reach to his feet:
  heroes first, then the biggest troop. Level 2: longer reach. Level 3: the pulled target is stunned 1 s.
- **Ultimate: Riptide** (when 4 or more enemies are within reach). A wave pushes every enemy in his
  lane back and slows them 40% for 3 s.
- Strong vs Gergasi and Ram (drags them into tower fire), lone heroes. Weak vs swarms, Pelanduk (a hooked decoy is a wasted hook).
- Inspired by: Dota's hook-and-pull heroes · Clash Royale's knock-back spells that undo a push.

### Seri · of the Hidden Folk
Support (vision) · cost 4 · best order **Farm** · ranged · HP 2 · Damage 2 · Range 3 · Speed 3 · Build M (reveal)
- **Trait: Second Sight.** Hidden enemies near her are revealed to you.
- **Power: Spirit Lantern** (every 20 s). Leaves a lantern that reveals hidden enemies around it for
  30 s. Level 2: lasts 45 s. Level 3: allies near it heal 2% a second.
- **Ultimate: Veil** (when one of your heroes starts a Gank). All your heroes become hidden for 6 s, wherever they are.
- Strong vs Rimba, Belang, every gank plan. Weak vs Pendekar, Layang (divers who reach her).
- Inspired by: Dota's wards, true sight and smoke ganks · folk tales of the Orang Bunian, the hidden forest people.

### Belang · the Tiger Within
Jungler / late carry · cost 4 · best order **Farm** · melee · HP 3 (5 at level 4) · Damage 2 (5 at level 4) · Range 1 · Speed 4 · Build S
- **Trait: Hunter's Hunger.** Double XP from camps. Heals 25% and gives +1 extra mana for each camp it clears.
- **Power: Pounce** (every 10 s). Leaps onto an enemy up to a short distance away, dealing damage
  and stunning 0.5 s. Level 2: +40% damage. Level 3: stun 1 s.
- **Ultimate: Shape of the Beast** (always on from level 4). Transforms for good: +40% health,
  +30% attack speed, and its hits cleave nearby enemies.
- Strong vs the late game, supports, Pelanduk. Weak vs early pressure, Pendekar (Duel), Kail.
- Inspired by: Dota's farming carries (weak early, a monster late) and shape-shifters · Clash Royale's dashing melee troops · the weretiger of Malay folk tales.

### Gergasi · the Wall-Breaker
Siege · cost 6 · best order **Push** · melee · HP 5 · Damage 5 (towers only) · Range 1 · Speed 1 · Build S
- **Trait: Wall-Breaker.** Only attacks towers and the Core, for triple damage. He can't hit troops
  or heroes. On a Defend order he blocks the lane instead: enemy troops near him move 50% slower.
- **Power: Boulder** (every 12 s). Throws a boulder at the nearest enemy tower from long range.
  Level 2: 1.5× damage. Level 3: also knocks back troops around that tower.
- **Ultimate: Rampage** (the first time he reaches a tower at level 4). For 8 s he moves 50% faster and his hits splash.
- Strong vs towers, slow defences. Weak vs Kail, Benteng, swarms (he can't fight back).
- Inspired by: Clash Royale's giants that only target buildings · Dota's siege pushers · the gergasi giants of folk tales.

### Dalang · the Shadow Puppeteer
Summoner · cost 5 · best order **Push** · ranged · HP 2 · Damage 1 · Range 4 · Speed 2 · Build M/L
- **Trait: Behind the Screen.** Always keeps behind your front troops in his lane.
- **Power: Shadow Play** (every 8 s). Summons 2 shadow puppets (minions with +50% damage). Level 2: 3 puppets.
  Level 3: the puppets copy the last troop card you played, at half health.
- **Ultimate: Grand Performance** (when a big enemy troop is close). Takes control of it for 10 s.
- Strong vs Gergasi, single-target heroes. Weak vs Senja, Benteng, Firebolt (splash).
- Inspired by: Dota's summoners and mind-control · Clash Royale's spawners and copy cards · wayang kulit shadow puppetry.

### Senja · the Dusk Serpent
Mage · cost 5 · best order **Push** · ranged · HP 3 · Damage 3 · Range 4 · Speed 3 · Build M (silence, mana drain)
- **Trait: Tide Scales.** Takes 50% less damage from spells.
- **Power: Waterspout** (every 9 s, when 3 or more enemies are grouped). Splash damage in an area.
  Level 2: bigger area. Level 3: knocks them up, stunning 0.5 s.
- **Ultimate: Swallow the Moon** (when 2 or more enemy heroes are visible). Silences all enemy heroes
  for 5 s and halves the opponent's mana refill for 10 s.
- Strong vs swarms, Dalang, Pelanduk. Weak vs Pendekar, Rimba, Layang.
- Inspired by: Dota's nukers and global silences · Clash Royale's splash wizards and mana pressure · island legends of the moon-eating sea serpent.

### Hujan · the Rain Caller
Healer · cost 4 · best order **Defend** · ranged · HP 2 · Damage 1 · Range 3 · Speed 3 · Build M (heal)
- **Trait: Monsoon.** Allies near her regain 1% health a second.
- **Power: Healing Rain** (every 10 s, when allies near her are hurt). Heals all allies in an area.
  Level 2: bigger heal. Level 3: also repairs towers.
- **Ultimate: Flash Flood** (when 4 or more enemies attack her lane's tower). Floods the lane for 6 s:
  enemies slowed 50%, your troops 30% faster.
- Strong vs long fights, poke. Weak vs Belang, Pendekar, Senja (silence).
- Inspired by: Dota's healers · Clash Royale's healing troops · the monsoon.

### Layang · the Kite Rider
Diver (flying) · cost 4 · best order **Gank** · melee · HP 2 · Damage 4 · Range 1 · Speed 5 · Build L (flying rules)
- **Trait: On the Wind.** Flies over lanes and jungle. Only ranged units, towers and spells can hit
  her. She is never hidden: everyone sees her coming.
- **Power: Dive** (every 10 s). Swoops on the weakest enemy nearby for a heavy hit. Level 2: +50% damage.
  Level 3: flies back to safety after the hit.
- **Ultimate: Moon Kite** (when ordered to Gank at level 4). Crosses to the lane instantly and lands
  with a 1 s stun around her.
- Strong vs Gergasi, Dalang, back-line heroes (Senja, Hujan). Weak vs Archers, towers, Rimba.
- Inspired by: Clash Royale's flying troops (only some cards can hit air) · Dota's global gankers · the wau bulan moon kite.

### Pendekar · the Silat Master
Duelist · cost 5 · best order **Gank** · melee · HP 4 · Damage 4 · Range 1 · Speed 4 · Build L (duel)
- **Trait: Silat Guard.** Every 4 s, fully blocks the next hit.
- **Power: Keris Strike** (every 10 s). Dashes to the nearest visible enemy hero (or biggest troop),
  hits it and silences it for 2 s. Level 2: 3 s. Level 3: +50% damage.
- **Ultimate: Duel** (when an enemy hero is close). Locks both heroes in a 4 s duel where only they
  can hit each other. If Pendekar wins, he keeps +10% damage for the rest of the match.
- Strong vs Belang, Senja, Hujan. Weak vs Benteng, Kail, swarms.
- Inspired by: Dota's duel and anti-carry heroes · Clash Royale's dashing champions · silat martial art.

### Pelanduk · the Clever Mousedeer
Trickster · cost 3 · best order **Push** · melee · HP 1 · Damage 2 · Range 1 · Speed 5 · Build M/L (decoys)
- **Trait: Unnoticed.** Enemies hit other targets first if any are in reach.
- **Power: Decoys** (every 10 s). Makes 2 copies that deal no damage but draw tower fire for 4 s.
  Level 2: 3 copies. Level 3: copies last 6 s.
- **Ultimate: Clever Escape** (when it would die). Vanishes instead and reappears at your Core with 30% health.
- Strong vs towers, Kail, Pendekar (wasted single-target powers). Weak vs Senja, Benteng, Firebolt.
- Inspired by: Dota's illusion heroes · Clash Royale's cheap bait cards · the mousedeer trickster tales.

## 4. Who counters whom

| If they bring… | Answer with… | Because |
|---|---|---|
| Stealth ganks (Rimba, Belang, Seri's Veil) | Seri, Benteng | Reveal, and a fort that punishes the dive |
| Siege (Gergasi, a Ram push) | Kail, Benteng | Drag the siege into tower fire, or make the tower tougher |
| Swarms and summons (Dalang, Pelanduk, Imps) | Senja, Benteng | Splash damage |
| A carry or a caster (Belang, Senja, Hujan) | Pendekar, Rimba | Silence, Duel, Ambush |
| Divers (Layang, Pendekar) | Kail, Archers, towers | Pulls, and ranged units that can hit fliers |
| Single-target powers (Hook, Keris Strike, Mark) | Pelanduk | Decoys waste them |

The orders form a loose triangle, like Dota's macro game:
- A **Gank** punishes a hero who is out **Farming** alone.
- **Defend** (with vision) punishes ganks.
- Steady **Push** pressure stops the enemy from farming and ganking freely.

## 5. Troop cards to match the theme (optional)

| Prototype card | Themed name | Change |
|---|---|---|
| Spearmen | Silat Guards | none |
| Archers | Pemanah (archers) | They can hit flying heroes, which matters once Layang exists |
| Ram | Kerbau (water buffalo) | Charges towers, same role |
| Imps | Kelip-kelip (fireflies) | A fast swarm of fire-flies |
| Shieldbearer | Perisai (shield guard) | none |
| Firebolt | Petir (lightning) | none |

## 6. Suggested first batch to build

Six heroes, chosen to cover all five orders and to need only a few new effects:

| Hero | Tests | New effects needed |
|---|---|---|
| Rimba, Benteng | Gank and Defend (reworks of today's Ranger and Warden) | ultimate system, tower aura |
| Kail | Defend, counters siege | Pull, Stun |
| Seri | Farm and vision, counters ganks | Reveal lantern, team Hidden |
| Belang | Farm, the late-game carry | Transform at level 4 |
| Gergasi | Push, the Clash-style win condition | buildings-only hero, lane blocking |

It also needs: a "pick 2 heroes" screen before the match, the level-4 ultimates, the best-order
bonus, and portrait rings for cooldown and ultimate. The rest of the roster (Dalang, Senja, Hujan,
Layang, Pendekar, Pelanduk) follows once the first six play well. Layang needs flying rules, and
Pendekar needs the duel rule.

# Species, troops and map rewards · v1

_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._

Decisions: DEC-008 (species and lane waves), DEC-009 (hero orders and map rewards). Plan: PLAN-003. All numbers are first values to tune in play tests.

## How species work

- Before the match each player picks one of 5 species (and 2 heroes). The species decides your troop cards, your spell and what marches in your lanes.
- Every 20 s (first at 5 s) each lane sends a **wave** of the class you chose for that lane, at 60% strength. Tap a wave chip to change the next waves in that lane.
- Your deck: the species' classes as cards (full strength, cost below), its spell, Petir (lightning) and your 2 heroes.

| Species | Style | Classes | Spell |
|---|---|---|---|
| Kampung, the Village Guard | Balanced and steady: fighters, archers, a shield tank and a tower-breaking buffalo. | Silat Guard, Pemanah, Perisai, Kerbau | Gotong-royong |
| Hutan, the Jungle Beasts | Fast and fierce: monkey swarms, a leaping leopard, flying hornbills and a charging gaur. | Kera, Harimau Bintang, Enggang, Seladang | Auman |
| Sungai, the River Folk | Control and patience: armoured crabs, slowing archerfish and chain-shocking eels. | Ketam, Ikan Sumpit, Belut | Arus |
| Serangga, the Insect Hive | Numbers: ant swarms, poison hornets, a beetle tank and a queen that keeps hatching. | Kerengga, Tebuan, Kumbang, Ratu Sarang | Sengat |
| Batu, the Stone Highlanders | Slow and heavy: bursting pebbles, a boulder golem and a long-range stone sling. | Kerikil, Batu Besar, Lontar | Gempa |

### Kampung · the Village Guard

Balanced and steady: fighters, archers, a shield tank and a tower-breaking buffalo.

| Class | Card cost | Card gives | Wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|---|---|
| Silat Guard | 3 | 3 | 2 | 340 | 55 every 1.1 s | 160 | 9 | Sturdy melee fighters |
| Pemanah | 3 | 2 | 2 | 200 | 45 every 1.2 s | 550 (ranged) | 9 | Ranged; can hit fliers |
| Perisai | 4 | 1 | 1 | 1100 | 75 every 1.3 s | 170 | 8 | Tank; takes 30% less from ranged hits |
| Kerbau | 5 | 1 | 1 | 1500 | 220 every 1.5 s | 160 | 6 | Only hits towers and the Pusaka |

Spell: **Gotong-royong** (cost 3). Heals 250 and shields your side in an area.

### Hutan · the Jungle Beasts

Fast and fierce: monkey swarms, a leaping leopard, flying hornbills and a charging gaur.

| Class | Card cost | Card gives | Wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|---|---|
| Kera | 2 | 4 | 3 | 110 | 30 every 0.7 s | 130 | 15 | Very fast monkey swarm |
| Harimau Bintang | 4 | 1 | 1 | 600 | 110 every 1 s | 150 | 14 | Leopard; leaps onto its first target |
| Enggang | 4 | 2 | 2 | 260 | 50 every 1.1 s | 420 (ranged), flies | 11 | Flying hornbills; ranged |
| Seladang | 5 | 1 | 1 | 1600 | 90 every 1.4 s | 170 | 8 | Gaur tank; first hit knocks back and stuns |

Spell: **Auman** (cost 3). A roar: your side +30% damage and speed, 6 s.

### Sungai · the River Folk

Control and patience: armoured crabs, slowing archerfish and chain-shocking eels.

| Class | Card cost | Card gives | Wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|---|---|
| Ketam | 4 | 1 | 1 | 1300 | 60 every 1.2 s | 160 | 7 | Crab tank; takes half damage from ranged hits |
| Ikan Sumpit | 3 | 2 | 2 | 220 | 45 every 1.1 s | 520 (ranged) | 9 | Archerfish; ranged, hits slow |
| Belut | 4 | 2 | 2 | 380 | 50 every 1 s | 200 | 11 | Electric eels; hits jump to a second enemy |

Spell: **Arus** (cost 3). A current washes enemies back and slows them.

### Serangga · the Insect Hive

Numbers: ant swarms, poison hornets, a beetle tank and a queen that keeps hatching.

| Class | Card cost | Card gives | Wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|---|---|
| Kerengga | 2 | 6 | 4 | 70 | 22 every 0.6 s | 120 | 13 | Weaver-ant swarm |
| Tebuan | 3 | 3 | 2 | 120 | 28 every 0.8 s | 140, flies | 14 | Flying hornets; hits poison |
| Kumbang | 4 | 1 | 1 | 1400 | 70 every 1.3 s | 170 | 7 | Rhino beetle; takes 20% less damage |
| Ratu Sarang | 5 | 1 | 1 | 900 | 30 every 1.2 s | 400 (ranged) | 5 | Hive queen; hatches ants every 5 s |

Spell: **Sengat** (cost 3). A stinging cloud poisons enemies for 4 s.

### Batu · the Stone Highlanders

Slow and heavy: bursting pebbles, a boulder golem and a long-range stone sling.

| Class | Card cost | Card gives | Wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|---|---|
| Kerikil | 3 | 3 | 2 | 160 | bursts for 260 | 120 | 13 | Rolling pebbles; burst on a building |
| Batu Besar | 6 | 1 | 1 | 2200 | 100 every 1.6 s | 170 | 5 | Boulder golem; takes 25% less damage |
| Lontar | 4 | 1 | 1 | 450 | 120 every 2.2 s | 650 (ranged) | 5 | Stone sling; long range, splash |

Spell: **Gempa** (cost 4). A quake stuns enemies 1 s and cracks towers.

## Spells

| Spell | Cost | Area | Damage | To towers | What it does |
|---|---|---|---|---|---|
| Petir (every deck) | 4 | 250 | 260 | 78 | Lightning strikes an area |
| Gotong-royong | 3 | 320 | - | - | Heals 250 and shields your side in an area |
| Auman | 3 | 350 | - | - | A roar: your side +30% damage and speed, 6 s |
| Arus | 3 | 300 | 80 | - | A current washes enemies back and slows them |
| Sengat | 3 | 280 | - | - | A stinging cloud poisons enemies for 4 s |
| Gempa | 4 | 300 | 100 | 200 | A quake stuns enemies 1 s and cracks towers |

## Hero orders

Drag a hero portrait onto a glowing spot on the map: **Push** a lane, **Gank** another lane, **Defend** a tower, **Farm** a grove, den or Gajah Mina, collect a **relic**, place a **Ward** on a cairn, or **Retreat** to the Pusaka. Farm and Ward are errands: when done, the hero goes back to its last job.

## Map rewards

| Spot | Reward | Comes back |
|---|---|---|
| Fruit grove (2, on the river) | 2 Semangat, 60 XP | 45 s |
| Beast den (1 per side, in the jungle) | Jungle Fury: +20% damage, +15% speed for 60 s; 100 XP | 60 s |
| Gajah Mina (river pool, first at 90 s) | Joins the side that beats it and charges a lane; 3 Semangat, 120 XP | 120 s |
| Ward cairn (3 per side) | Shows hidden enemy heroes within 900 for 90 s; 20 XP to place. Up to 3 each. | - |
| Clearing an enemy ward (3 hero hits) | 1 Semangat, 30 XP | - |
| Relic (a pair at the shrines, first at 60 s, then every 45 s, lasts 40 s) | In turn: 2 Semangat, 80 XP, or 8 s of haste and shield | 45 s |
| Hero kill | 1 Semangat (+1 if the victim was on a streak; +2 for the match's first kill) | - |
| Tower | 2 Semangat | - |

A neutral camp left alone for 5 s heals back to full.

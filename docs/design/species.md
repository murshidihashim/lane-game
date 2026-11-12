# Species, lane troops, items and map rewards · v2

_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._

Decisions: DEC-008 (species and lane waves), DEC-009 (hero orders and map rewards), DEC-011 (no hand cards; items), DEC-012 (fog of war). Plans: PLAN-003, PLAN-004. All numbers are first values to tune in play tests.

## How species work

- Before the match each player picks one of 5 species (and 2 heroes). The species decides what can march in your lanes.
- Every 20 s (first at 5 s) each lane sends a **wave** of the class you chose for that lane. Waves are the only troops (no hand cards) and get 18% stronger each minute. Tap a wave chip to change the next waves in that lane.

| Species | Style | Classes |
|---|---|---|
| Kampung, the Village Guard | Balanced and steady: fighters, archers, a shield tank and a tower-breaking buffalo. | Silat Guard, Pemanah, Perisai, Kerbau |
| Hutan, the Jungle Beasts | Fast and fierce: monkey swarms, a leaping leopard, flying hornbills and a charging gaur. | Kera, Harimau Bintang, Enggang, Seladang |
| Sungai, the River Folk | Control and patience: armoured crabs, slowing archerfish and chain-shocking eels. | Ketam, Ikan Sumpit, Belut |
| Serangga, the Insect Hive | Numbers: ant swarms, poison hornets, a beetle tank and a queen that keeps hatching. | Kerengga, Tebuan, Kumbang, Ratu Sarang |
| Batu, the Stone Highlanders | Slow and heavy: bursting pebbles, a boulder golem and a long-range stone sling. | Kerikil, Batu Besar, Lontar |

### Kampung · the Village Guard

Balanced and steady: fighters, archers, a shield tank and a tower-breaking buffalo.

| Class | A wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|
| Silat Guard | 3 | 400 | 64 every 1.1 s | 160 | 6 | Sturdy melee fighters |
| Pemanah | 2 | 230 | 56 every 1.2 s | 550 (ranged) | 6 | Ranged; can hit fliers |
| Perisai | 1 | 1400 | 75 every 1.3 s | 170 | 6 | Tank; takes 40% less from ranged hits |
| Kerbau | 1 | 1700 | 250 every 1.5 s | 160 | 4 | Only hits towers and the Pusaka |

### Hutan · the Jungle Beasts

Fast and fierce: monkey swarms, a leaping leopard, flying hornbills and a charging gaur.

| Class | A wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|
| Kera | 4 | 135 | 30 every 0.7 s | 130 | 11 | Very fast monkey swarm |
| Harimau Bintang | 1 | 680 | 110 every 1 s | 150 | 10 | Leopard; leaps onto its first target |
| Enggang | 2 | 260 | 50 every 1.1 s | 420 (ranged), flies | 8 | Flying hornbills; ranged |
| Seladang | 1 | 1600 | 90 every 1.4 s | 170 | 6 | Gaur tank; first hit knocks back and stuns |

### Sungai · the River Folk

Control and patience: armoured crabs, slowing archerfish and chain-shocking eels.

| Class | A wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|
| Ketam | 1 | 1400 | 70 every 1.2 s | 160 | 5 | Crab tank; takes half damage from ranged hits |
| Ikan Sumpit | 2 | 220 | 52 every 1.1 s | 520 (ranged) | 6 | Archerfish; ranged, hits slow |
| Belut | 2 | 400 | 50 every 1 s | 200 | 8 | Electric eels; hits jump to a second enemy |

### Serangga · the Insect Hive

Numbers: ant swarms, poison hornets, a beetle tank and a queen that keeps hatching.

| Class | A wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|
| Kerengga | 6 | 84 | 24 every 0.6 s | 120 | 9 | Weaver-ant swarm |
| Tebuan | 3 | 135 | 31 every 0.8 s | 140, flies | 10 | Flying hornets; hits poison |
| Kumbang | 1 | 1400 | 78 every 1.3 s | 170 | 5 | Rhino beetle; takes 20% less damage |
| Ratu Sarang | 1 | 850 | 30 every 1.2 s | 400 (ranged) | 4 | Hive queen; hatches ants every 6 s |

### Batu · the Stone Highlanders

Slow and heavy: bursting pebbles, a boulder golem and a long-range stone sling.

| Class | A wave sends | Health | Damage | Reach | Speed | Ability |
|---|---|---|---|---|---|---|
| Kerikil | 2 | 160 | bursts for 200 | 120 | 9 | Rolling pebbles; burst on a building |
| Batu Besar | 1 | 1800 | 100 every 1.6 s | 170 | 4 | Boulder golem; takes 20% less damage |
| Lontar | 1 | 420 | 98 every 2.2 s | 650 (ranged) | 4 | Stone sling; long range, splash |

## Hero orders

Drag a hero portrait onto a glowing spot on the map: **Push** a lane, **Gank** another lane, **Defend** a tower, **Farm** a grove, den or Gajah Mina, collect a **relic**, place a **Ward** on a cairn, or **Retreat** to the Pusaka. Drop it anywhere else to **Move** there and hold the spot (it fights what comes within 600). Farm and Ward are errands: when done, the hero goes back to its last job.

## Items

Bought with Semangat in the Shop, for one hero, 3 slots each, kept through death. No random rewards. Semangat starts at 4, refills 1 every 8 s (twice as fast in the last minute) and holds at most 20.

| Item | Cost | What it does |
|---|---|---|
| Keris Lok | 7 | +20% damage |
| Baju Rantai | 7 | +30% health |
| Capal Angin | 4 | +20% move speed |
| Tangkal | 8 | Power comes back 30% sooner |
| Jamu Akar | 5 | Heals 2% health a second |
| Perisai Rotan | 8 | Takes 20% less damage |
| Gelang Tangkas | 7 | Attacks 25% faster |
| Pelita | 5 | Sees 30% further; reveals hidden heroes within 600 |

## Winning

Destroy the enemy Pusaka. At 300 s the side that destroyed more towers wins. If level, 90 s of sudden death: towers and the Pusaka take 3× damage and the next tower to fall wins; otherwise a draw. Towers take half damage for the first 60 s.


## Fog of war

Each side sees only around its own pieces: heroes 1000, troops 650, towers 1000, Pusaka 1100, wards 900, Tukang's watchtower 1000, and Seri's lanterns. Towers, both Pusaka, camps and relics are always shown. Heroes hidden in the jungle stay unseen until revealed.

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

# Species, lane troops, items and map rewards · v2

_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._

Decisions: DEC-008 (species and lane waves), DEC-009 (hero orders and map rewards), DEC-011 (no hand cards; items), DEC-012 (fog of war), DEC-024 (commander calls). Plans: PLAN-003, PLAN-004, PLAN-015. All numbers are first values to tune in play tests.

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

Tap a hero (its panel or the hero on the map) to open its orders, pick one, then tap a lit-up target (DEC-017): **Move** (go and hold a spot; it fights what comes within 600), **Attack** (go after an enemy you can see, then back to its job), **Push** or **Gank** a lane, **Defend** a tower, **Farm** a grove, den, Gajah Mina or relic, **Ward** a cairn, **Retreat** home to heal. Farm, Ward and Attack are errands: when done, the hero goes back to its last job. Dragging a portrait onto the map is a quick shortcut.

Heroes think for themselves a little: they walk through their own side, wait outside an enemy tower until their own troops are in its reach, head home to heal below 25% health while pushing (and go back at 80%), and go for enemy heroes in reach first, then the weakest enemy.

## Rally the waves (PLAN-015)

Each wave chip has a HOLD toggle. A held lane keeps its waves at your end of the lane (they fight only what comes within 500); up to 3 waves. Tap GO to release them together: for 8 s they move 25% faster and hit 15% harder. The next wave after 3 releases them by itself. The enemy sees the build-up only with vision there.

## Commander calls (DEC-024)

Before the match pick 2 of 6. In the match they cost Semangat (like items) and then cool down. Not cards: no hand, no deck, nothing random.

| Call | Cost | Cooldown | Aim | What it does |
|---|---|---|---|---|
| War Drum | 2 | 60 s | none | All your troops move 25% faster and hit 15% harder for 8 s. |
| Bamboo Barricade | 2 | 50 s | a lane you can see | A bamboo wall on a lane you can see: enemy troops must break it (900 health, 12 s). |
| Spirit Eye | 1 | 40 s | any spot | See any spot on the map for 8 s, hidden heroes too. |
| Penawar | 2 | 60 s | none | Heals all your heroes 25% and clears slows and poison. |
| Snare Trap | 1 | 45 s | a spot you can see | A hidden snare on a spot you can see: the first enemy hero to step in is stunned 1.5 s and seen for 4 s. |
| Fort Repair | 2 | 60 s | your tower or Pusaka | Restores 500 health to one of your towers or your Pusaka. |

Gajah Mina also slams the ground every 7 s while fought: a warning ring, then 260 damage and a 1 s stun to everyone still inside (radius 380).

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

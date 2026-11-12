// Tuning numbers and the roster. Every value here is a first guess to adjust in play tests.
// Time is in ticks: 20 ticks = 1 second. Distances are world units (a lane is ~520 wide).
// Names follow DEC-006 (folk-tale world); the power system follows DEC-007.

export const TICKS_PER_SECOND = 20;
export const sec = (s: number): number => Math.round(s * TICKS_PER_SECOND);

export const MATCH = {
  regulation: sec(300), // 5:00
  suddenDeath: sec(60), // then 1:00 of sudden death
  doubleManaFrom: sec(240), // last minute of regulation (and all of sudden death)
  towerShieldUntil: sec(60), // towers take half damage for the first minute
  towerShieldPercent: 50,
} as const;

/** Semangat (mana) is stored in points: 56 points = 1, +1 point per tick = 1 every 2.8 s. */
export const MANA = {
  name: 'Semangat',
  perMana: 56,
  start: 5 * 56,
  max: 10 * 56,
  regenPerTick: 1,
  doubleRegenPerTick: 2,
} as const;

export const WAVES = {
  first: sec(5),
  every: sec(20),
  spawnU: 300, // distance from own Core end along the lane
  strengthPct: 60, // wave units have 60% of a card unit's health and damage
  waveXp: 24, // XP a whole wave is worth to nearby enemy heroes
} as const;

export const DEPLOY = {
  delay: sec(1), // units appear, then start moving after this
  minU: 350, // can't drop right on top of your own Core
  riverGap: 120, // must stay this far on your side of the river centre
} as const;

export const XP = {
  radius: 900,
  minion: 8,
  troop: 12,
  hero: 80,
  tower: 60,
  camp: 60,
  levels: [0, 100, 250, 450], // XP needed for level 1..4
  perLevelPercent: 15, // +15% health and damage per level above 1
} as const;

export const HERO_RULES = {
  respawnBase: sec(10),
  respawnPerLevel: sec(5),
  ambushPercent: 200, // first hit after being hidden deals double damage
  ambushWindow: sec(4), // ...if it lands within 4 s of leaving the jungle
  revealRadius: 650, // enemies within this distance can see you, even in the jungle
  defendLeash: 900,
  gankArrive: 160,
  retreatHealPerSecondPercent: 4,
  retreatHealRadius: 600,
  bestOrderPercent: 15, // +15% damage while following the hero's best order (DEC-007)
  gankBonusTicks: sec(6), // a ganker keeps the bonus for 6 s after arriving
  ultLevel: 4,
  heroesPerDeck: 2,
} as const;

/** Neutral objectives on the map (DEC-009). */
export const NEUTRALS = {
  grove: { name: 'Fruit Grove', hp: 900, damage: 45, attackTicks: sec(1.2), range: 220, radius: 110, respawn: sec(45), mana: 2 * 56, xp: 60 },
  den: { name: 'Beast Den', hp: 1500, damage: 65, attackTicks: sec(1.2), range: 220, radius: 120, respawn: sec(60), mana: 0, xp: 100 },
  boss: { name: 'Gajah Mina', hp: 3500, damage: 120, attackTicks: sec(1.4), range: 300, radius: 160, respawn: sec(120), mana: 3 * 56, xp: 120, first: sec(90) },
  resetAfter: sec(5), // heals back to full if nobody hits it for this long
} as const;

/** Jungle Fury: the buff a hero gets for clearing a Beast Den. */
export const FURY = { ticks: sec(60), damagePct: 20, speedPct: 15 } as const;

export const WARDS = {
  radius: 900, // reveals hidden enemy heroes this close
  life: sec(90),
  hits: 3, // enemy hero hits to destroy one
  max: 3, // per player; placing a 4th removes the oldest
  placeXp: 20,
  bountyMana: 56,
  bountyXp: 30,
} as const;

export const RELICS = {
  first: sec(60),
  every: sec(45),
  life: sec(40),
  mana: 2 * 56,
  xp: 80,
  boostTicks: sec(8),
  pickup: 150,
} as const;

export const BOUNTY = {
  heroKill: 56, // Semangat to the killer's side
  streak: 56, // extra when the victim had 2+ kills in a row
  firstKill: 112, // extra for the first hero kill of the match
  tower: 112,
} as const;

/** @deprecated kept for older tests: same numbers as a Fruit Grove. */
export const CAMP = {
  hp: 900, damage: 45, attackTicks: sec(1.2), range: 220, radius: 110, respawn: sec(45), manaReward: 2 * 56, resetAfter: sec(5),
} as const;

export type UnitKind =
  // Kampung (village guard)
  | 'spearman' | 'archer' | 'shieldbearer' | 'ram'
  // Hutan (jungle beasts)
  | 'kera' | 'harimau' | 'enggang' | 'seladang'
  // Sungai (river folk)
  | 'ketam' | 'sumpit' | 'belut'
  // Serangga (insect hive)
  | 'kerengga' | 'tebuan' | 'kumbang' | 'ratu'
  // Batu (stone highlanders)
  | 'kerikil' | 'golem' | 'lontar'
  // summoned by heroes and the map
  | 'puppet' | 'decoy' | 'watchtower' | 'gajahmina';
export type Targets = 'any' | 'buildings';

export interface UnitStats {
  name: string;
  hp: number;
  damage: number;
  attackTicks: number;
  range: number;
  sight: number;
  speed: number; // world units per tick
  radius: number;
  targets: Targets;
  xp: number; // XP given to nearby enemy heroes when it dies
  /** What it does, in a few words (cards and docs). */
  ability?: string;
  flying?: boolean;
  splash?: number; // its hits also hit everything within this distance of the target
  armorRanged?: number; // percent of damage it takes from ranged attackers
  armor?: number; // percent of all damage it takes
  slowOnHit?: number; // its hits slow the target to this percent speed for 1 s
  poisonOnHit?: number; // its hits poison: this percent of max health a second for 2 s
  chain?: number; // its hits jump to one more enemy within 220 for this percent
  charge?: boolean; // its first hit knocks back and stuns 0.5 s
  leap?: number; // jumps onto its first target within this distance
  bomb?: number; // rolls into a building and explodes for this much in a 160 area
  spawn?: { kind: UnitKind; count: number; every: number; life: number };
}

const u = (name: string, hp: number, damage: number, attack: number, range: number, speed: number, radius: number, extra: Partial<UnitStats> = {}): UnitStats => ({
  name, hp, damage, attackTicks: sec(attack), range, sight: Math.max(500, range + 120), speed, radius, targets: 'any', xp: XP.troop, ...extra,
});

export const UNITS: Record<UnitKind, UnitStats> = {
  spearman: u('Silat Guard', 340, 55, 1.1, 160, 9, 60, { ability: 'Sturdy melee fighters' }),
  archer: u('Pemanah', 200, 45, 1.2, 550, 9, 55, { ability: 'Ranged; can hit fliers' }),
  shieldbearer: u('Perisai', 1100, 75, 1.3, 170, 8, 80, { armorRanged: 70, ability: 'Tank; takes 30% less from ranged hits' }),
  ram: u('Kerbau', 1500, 220, 1.5, 160, 6, 100, { targets: 'buildings', ability: 'Only hits towers and the Pusaka' }),

  kera: u('Kera', 110, 30, 0.7, 130, 15, 40, { ability: 'Very fast monkey swarm' }),
  harimau: u('Harimau Bintang', 600, 110, 1.0, 150, 14, 65, { leap: 450, ability: 'Leopard; leaps onto its first target' }),
  enggang: u('Enggang', 260, 50, 1.1, 420, 11, 60, { flying: true, ability: 'Flying hornbills; ranged' }),
  seladang: u('Seladang', 1600, 90, 1.4, 170, 8, 100, { charge: true, ability: 'Gaur tank; first hit knocks back and stuns' }),

  ketam: u('Ketam', 1300, 60, 1.2, 160, 7, 85, { armorRanged: 50, ability: 'Crab tank; takes half damage from ranged hits' }),
  sumpit: u('Ikan Sumpit', 220, 45, 1.1, 520, 9, 55, { slowOnHit: 75, ability: 'Archerfish; ranged, hits slow' }),
  belut: u('Belut', 380, 50, 1.0, 200, 11, 55, { chain: 60, ability: 'Electric eels; hits jump to a second enemy' }),

  kerengga: u('Kerengga', 70, 22, 0.6, 120, 13, 32, { xp: 4, ability: 'Weaver-ant swarm' }),
  tebuan: u('Tebuan', 120, 28, 0.8, 140, 14, 38, { flying: true, poisonOnHit: 3, ability: 'Flying hornets; hits poison' }),
  kumbang: u('Kumbang', 1400, 70, 1.3, 170, 7, 90, { armor: 80, ability: 'Rhino beetle; takes 20% less damage' }),
  ratu: u('Ratu Sarang', 900, 30, 1.2, 400, 5, 90, { spawn: { kind: 'kerengga', count: 2, every: sec(5), life: sec(12) }, ability: 'Hive queen; hatches ants every 5 s' }),

  kerikil: u('Kerikil', 160, 0, 1, 120, 13, 45, { targets: 'buildings', bomb: 260, ability: 'Rolling pebbles; burst on a building' }),
  golem: u('Batu Besar', 2200, 100, 1.6, 170, 5, 115, { armor: 75, ability: 'Boulder golem; takes 25% less damage' }),
  lontar: u('Lontar', 450, 120, 2.2, 650, 5, 75, { splash: 150, ability: 'Stone sling; long range, splash' }),

  puppet: u('Shadow puppet', 220, 38, 1.0, 150, 9, 50, { xp: 4 }),
  decoy: { ...u('Decoy', 250, 0, 1.0, 0, 14, 60), sight: 0, xp: 0 },
  watchtower: { ...u('Bamboo watchtower', 500, 40, 0.8, 500, 0, 80), xp: 10 },
  gajahmina: u('Gajah Mina', 2500, 150, 1.4, 220, 6, 130, { xp: 60, ability: 'River beast fighting for you' }),
};

// ---------------------------------------------------------------------------------------------
// Species (DEC-008): pick one before the match. Its classes are your troop cards and the creeps
// your lanes send; you choose the class for each lane.

export type SpeciesId = 'kampung' | 'hutan' | 'sungai' | 'serangga' | 'batu';

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  title: string;
  text: string;
  classes: ClassCardId[];
  spell: SpellCardId;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  kampung: { id: 'kampung', name: 'Kampung', title: 'the Village Guard', text: 'Balanced and steady: fighters, archers, a shield tank and a tower-breaking buffalo.', classes: ['spearmen', 'archers', 'shieldbearer', 'ram'], spell: 'gotong' },
  hutan: { id: 'hutan', name: 'Hutan', title: 'the Jungle Beasts', text: 'Fast and fierce: monkey swarms, a leaping leopard, flying hornbills and a charging gaur.', classes: ['kera', 'harimau', 'enggang', 'seladang'], spell: 'auman' },
  sungai: { id: 'sungai', name: 'Sungai', title: 'the River Folk', text: 'Control and patience: armoured crabs, slowing archerfish and chain-shocking eels.', classes: ['ketam', 'sumpit', 'belut'], spell: 'arus' },
  serangga: { id: 'serangga', name: 'Serangga', title: 'the Insect Hive', text: 'Numbers: ant swarms, poison hornets, a beetle tank and a queen that keeps hatching.', classes: ['kerengga', 'tebuan', 'kumbang', 'ratu'], spell: 'sengat' },
  batu: { id: 'batu', name: 'Batu', title: 'the Stone Highlanders', text: 'Slow and heavy: bursting pebbles, a boulder golem and a long-range stone sling.', classes: ['kerikil', 'golem', 'lontar'], spell: 'gempa' },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const STRUCTURES = {
  tower: { hp: 2200, damage: 55, attackTicks: sec(0.8), range: 750, radius: 150 },
  core: { hp: 3200, damage: 80, attackTicks: sec(0.8), range: 800, radius: 270 },
} as const;

// ---------------------------------------------------------------------------------------------
// Heroes (DEC-007): Trait (always on) · Power (automatic; ranks at levels 1-3) ·
// Ultimate (unlocks at level 4, once per life, automatic) · best order (+15% damage).

export type HeroKind =
  | 'rimba' | 'benteng' | 'kail' | 'seri' | 'belang' | 'gergasi' | 'dalang' | 'senja' | 'hujan' | 'layang'
  | 'pendekar' | 'pelanduk' | 'saudagar' | 'badak' | 'tedung' | 'tukang' | 'helang' | 'embun' | 'ombak' | 'buaya';

export type BestOrder = 'push' | 'defend' | 'gank' | 'farm';

export interface HeroDef extends UnitStats {
  id: HeroKind;
  code: string; // two letters for the portrait
  title: string;
  role: string;
  cost: number;
  best: BestOrder;
  flying: boolean;
  powerTicks: number; // power cooldown
  trait: { name: string; text: string };
  power: { name: string; when: string; text: string };
  ult: { name: string; when: string; text: string };
  strong: string;
  weak: string;
  inspired: string;
}

type HeroInput = Omit<HeroDef, 'xp' | 'targets' | 'flying' | 'sight' | 'attackTicks' | 'powerTicks'> & {
  attack: number; // seconds between hits
  power_s: number; // power cooldown in seconds
  sight?: number;
  targets?: Targets;
  flying?: boolean;
};

function hero(h: HeroInput): HeroDef {
  const { attack, power_s, ...rest } = h;
  return {
    ...rest,
    sight: h.sight ?? Math.max(600, h.range + 100),
    targets: h.targets ?? 'any',
    flying: h.flying ?? false,
    attackTicks: sec(attack),
    powerTicks: sec(power_s),
    xp: XP.hero,
  };
}

export const HEROES: Record<HeroKind, HeroDef> = {
  rimba: hero({
    id: 'rimba', code: 'Ri', name: 'Rimba', title: 'the Unseen Hunter', role: 'Ganker', cost: 5, best: 'gank',
    hp: 850, damage: 80, attack: 0.9, range: 520, speed: 12, radius: 70, power_s: 10,
    trait: { name: 'Forest Step', text: '30% faster in the jungle. When an enemy spots her, she stays hidden 2 s longer.' },
    power: { name: 'Volley', when: 'every 10 s, when enemies are in range', text: 'Arrows hit the 3 nearest enemies for 120. Lv 2: 4 enemies. Lv 3: also slows them 30% for 2 s.' },
    ult: { name: 'Hunter’s Mark', when: 'on her first Ambush hit', text: 'The target takes +50% damage from all your units for 6 s.' },
    strong: 'lone heroes, Pemanah, supports', weak: 'Seri (reveal), Benteng (Stomp)',
    inspired: 'Dota’s invisible gankers with a first-strike bonus; Clash Royale’s ranged support troops',
  }),
  benteng: hero({
    id: 'benteng', code: 'Be', name: 'Benteng', title: 'the Living Fort', role: 'Defender', cost: 5, best: 'defend',
    hp: 1800, damage: 55, attack: 1.1, range: 180, speed: 8, radius: 95, power_s: 12,
    trait: { name: 'Hold the Gate', text: 'Near a friendly tower he takes 30% less damage, and that tower attacks 20% faster.' },
    power: { name: 'Stomp', when: 'every 12 s, when enemies are close', text: 'Hits everything around him for 100 and slows it 40% for 3 s. Lv 2: bigger area. Lv 3: also stuns 0.5 s.' },
    ult: { name: 'Unbreakable', when: 'when a tower near him falls below 30%', text: 'Gives that tower a 1,000 shield for 8 s.' },
    strong: 'swarms, Gergasi, ganks into his lane', weak: 'Senja (out-ranges and silences him), Dalang',
    inspired: 'Dota’s stomping tank initiators; Clash Royale’s splash melee and tower defence',
  }),
  kail: hero({
    id: 'kail', code: 'Ka', name: 'Kail', title: 'the Riverhook', role: 'Initiator', cost: 4, best: 'defend',
    hp: 1150, damage: 65, attack: 1.2, range: 300, speed: 10, radius: 80, power_s: 12,
    trait: { name: 'Net', text: 'His hits slow by 20% for 1 s.' },
    power: { name: 'Hook', when: 'every 12 s', text: 'Pulls the most dangerous visible enemy within 700 to his feet: heroes first, then the biggest troop. Lv 2: reach 850. Lv 3: the target is stunned 1 s.' },
    ult: { name: 'Riptide', when: 'when 4 or more enemies are within 600', text: 'A wave pushes every enemy near him in his lane back 400 and slows them 40% for 3 s.' },
    strong: 'Gergasi and Kerbau (drags them into tower fire), lone heroes', weak: 'swarms, Pelanduk (a hooked decoy is a wasted hook)',
    inspired: 'Dota’s hook-and-pull heroes; Clash Royale’s knock-back spells that undo a push',
  }),
  seri: hero({
    id: 'seri', code: 'Se', name: 'Seri', title: 'of the Hidden Folk', role: 'Support', cost: 4, best: 'farm',
    hp: 850, damage: 50, attack: 1, range: 450, speed: 10, radius: 70, power_s: 20,
    trait: { name: 'Second Sight', text: 'Hidden enemies within 900 of her are revealed to you.' },
    power: { name: 'Spirit Lantern', when: 'every 20 s', text: 'Leaves a lantern that reveals hidden enemies within 900 for 30 s. Lv 2: lasts 45 s. Lv 3: allies near it heal 2% a second.' },
    ult: { name: 'Veil', when: 'when one of your heroes starts a Gank', text: 'All your heroes become hidden for 6 s, wherever they are.' },
    strong: 'Rimba, Belang, every gank plan', weak: 'Pendekar, Layang (divers who reach her)',
    inspired: 'Dota’s wards, true sight and smoke ganks; folk tales of the hidden forest people',
  }),
  belang: hero({
    id: 'belang', code: 'Bl', name: 'Belang', title: 'the Tiger Within', role: 'Jungler', cost: 4, best: 'farm',
    hp: 1150, damage: 55, attack: 0.9, range: 170, speed: 12, radius: 85, power_s: 10,
    trait: { name: 'Hunter’s Hunger', text: 'Double XP from camps. Heals 25% and gives 1 extra Semangat for each camp it clears.' },
    power: { name: 'Pounce', when: 'every 10 s', text: 'Leaps onto an enemy within 500 for 90 and stuns it 0.5 s. Lv 2: +40% damage. Lv 3: stun 1 s.' },
    ult: { name: 'Shape of the Beast', when: 'always on from level 4', text: 'Transforms for good: +40% health, +30% attack speed, and its hits cleave nearby enemies.' },
    strong: 'the late game, supports, Pelanduk', weak: 'early pressure, Pendekar (Duel), Kail',
    inspired: 'Dota’s farming carries and shape-shifters; Clash Royale’s dashing troops; the weretiger of folk tales',
  }),
  gergasi: hero({
    id: 'gergasi', code: 'Ge', name: 'Gergasi', title: 'the Wall-Breaker', role: 'Siege', cost: 6, best: 'push',
    hp: 1800, damage: 90, attack: 1.6, range: 180, speed: 6, radius: 110, power_s: 12, targets: 'buildings',
    trait: { name: 'Wall-Breaker', text: 'Only attacks towers and the Pusaka, for triple damage; he can’t hit troops or heroes. On Defend he blocks the lane: enemy troops near him move 50% slower.' },
    power: { name: 'Boulder', when: 'every 12 s, when an enemy tower is within 1,300', text: 'Throws a boulder at it for 150. Lv 2: 225. Lv 3: also knocks back troops around that tower.' },
    ult: { name: 'Rampage', when: 'the first time he reaches a tower at level 4', text: 'For 8 s he moves 50% faster and his hits splash.' },
    strong: 'towers, slow defences', weak: 'Kail, Benteng, swarms (he can’t fight back)',
    inspired: 'Clash Royale’s giants that only target buildings; Dota’s siege pushers; the giants of folk tales',
  }),
  dalang: hero({
    id: 'dalang', code: 'Da', name: 'Dalang', title: 'the Shadow Puppeteer', role: 'Summoner', cost: 5, best: 'push',
    hp: 850, damage: 35, attack: 1.2, range: 550, speed: 8, radius: 70, power_s: 8,
    trait: { name: 'Behind the Screen', text: 'Keeps behind your front troops in his lane, and waits at the river when there are none.' },
    power: { name: 'Shadow Play', when: 'every 8 s', text: 'Summons 2 shadow puppets for 20 s. Lv 2: 3 puppets. Lv 3: the puppets copy the last troop card you played, at half health.' },
    ult: { name: 'Grand Performance', when: 'when a big enemy troop is within 600', text: 'Takes control of it for 10 s.' },
    strong: 'Gergasi, Kerbau, single-target heroes', weak: 'Senja, Benteng, Petir (splash)',
    inspired: 'Dota’s summoners and mind control; Clash Royale’s spawners and copy cards; wayang kulit shadow puppetry',
  }),
  senja: hero({
    id: 'senja', code: 'Sj', name: 'Senja', title: 'the Dusk Serpent', role: 'Mage', cost: 5, best: 'push',
    hp: 1150, damage: 65, attack: 1.2, range: 550, speed: 10, radius: 80, power_s: 9,
    trait: { name: 'Tide Scales', text: 'Takes 50% less damage from spells and hero powers.' },
    power: { name: 'Waterspout', when: 'every 9 s, when 3 or more enemies are grouped', text: 'Hits the group for 140. Lv 2: bigger area. Lv 3: also stuns them 0.5 s.' },
    ult: { name: 'Swallow the Moon', when: 'when 2 or more enemy heroes are visible', text: 'Silences all enemy heroes for 5 s and halves the opponent’s Semangat refill for 10 s.' },
    strong: 'swarms, Dalang, Pelanduk', weak: 'Pendekar, Rimba, Layang',
    inspired: 'Dota’s nukers and global silences; Clash Royale’s splash wizards; island legends of the moon-eating serpent',
  }),
  hujan: hero({
    id: 'hujan', code: 'Hu', name: 'Hujan', title: 'the Rain Caller', role: 'Healer', cost: 4, best: 'defend',
    hp: 850, damage: 35, attack: 1.1, range: 450, speed: 10, radius: 70, power_s: 10,
    trait: { name: 'Monsoon', text: 'Allies within 400 of her regain 1% health a second.' },
    power: { name: 'Healing Rain', when: 'every 10 s, when an ally near her is hurt', text: 'Heals allies within 350 for 150. Lv 2: 220. Lv 3: also repairs nearby towers for 100.' },
    ult: { name: 'Flash Flood', when: 'when 4 or more enemies attack a tower in her lane', text: 'Floods the lane for 6 s: enemies slowed 50%, your troops 30% faster.' },
    strong: 'long fights, poke', weak: 'Belang, Pendekar, Senja (silence)',
    inspired: 'Dota’s healers; Clash Royale’s healing troops; the monsoon',
  }),
  layang: hero({
    id: 'layang', code: 'La', name: 'Layang', title: 'the Kite Rider', role: 'Diver', cost: 4, best: 'gank',
    hp: 850, damage: 80, attack: 1, range: 170, speed: 14, radius: 75, power_s: 10, flying: true,
    trait: { name: 'On the Wind', text: 'Flies. Only ranged units, towers and spells can hit her. Never hidden: everyone sees her coming.' },
    power: { name: 'Dive', when: 'every 10 s', text: 'Swoops on the weakest enemy within 600 for 150. Lv 2: 225. Lv 3: flies back to where she was after the hit.' },
    ult: { name: 'Moon Kite', when: 'when ordered to Gank at level 4', text: 'Crosses to the lane instantly and stuns enemies within 300 for 1 s.' },
    strong: 'Gergasi, Dalang, back-line heroes (Senja, Hujan)', weak: 'Pemanah, towers, Rimba',
    inspired: 'Clash Royale’s flying troops (only some cards hit air); Dota’s global gankers; the wau bulan moon kite',
  }),
  pendekar: hero({
    id: 'pendekar', code: 'Pe', name: 'Pendekar', title: 'the Silat Master', role: 'Duelist', cost: 5, best: 'gank',
    hp: 1450, damage: 80, attack: 1, range: 180, speed: 12, radius: 80, power_s: 10,
    trait: { name: 'Silat Guard', text: 'Every 4 s, fully blocks the next hit.' },
    power: { name: 'Keris Strike', when: 'every 10 s, when a target is within 600', text: 'Dashes to the nearest visible enemy hero (or biggest troop), hits it for 120 and silences it for 2 s. Lv 2: 3 s. Lv 3: 180 damage.' },
    ult: { name: 'Duel', when: 'when an enemy hero is within 400', text: 'Locks both heroes in a 4 s duel where only they can hit each other. If he wins, he keeps +10% damage for the match.' },
    strong: 'Belang, Senja, Hujan', weak: 'Benteng, Kail, swarms',
    inspired: 'Dota’s duel and anti-carry heroes; Clash Royale’s dashing champions; silat martial art',
  }),
  pelanduk: hero({
    id: 'pelanduk', code: 'Pl', name: 'Pelanduk', title: 'the Clever Mousedeer', role: 'Trickster', cost: 3, best: 'push',
    hp: 600, damage: 50, attack: 0.9, range: 170, speed: 14, radius: 60, power_s: 10,
    trait: { name: 'Unnoticed', text: 'Enemies hit other targets first if any are in reach.' },
    power: { name: 'Decoys', when: 'every 10 s', text: 'Makes 2 copies that deal no damage but draw fire for 4 s. Lv 2: 3 copies. Lv 3: copies last 6 s.' },
    ult: { name: 'Clever Escape', when: 'when it would die', text: 'Vanishes instead and reappears at your Pusaka with 30% health.' },
    strong: 'towers, Kail, Pendekar (wasted single-target powers)', weak: 'Senja, Benteng, Petir',
    inspired: 'Dota’s illusion heroes; Clash Royale’s cheap bait cards; the mousedeer trickster tales',
  }),
  saudagar: hero({
    id: 'saudagar', code: 'Sa', name: 'Saudagar', title: 'the Spice Trader', role: 'Economist', cost: 4, best: 'farm',
    hp: 850, damage: 50, attack: 1.1, range: 450, speed: 10, radius: 75, power_s: 15,
    trait: { name: 'Trade Route', text: 'While he lives, your Semangat refills 10% faster.' },
    power: { name: 'Trade Winds', when: 'every 15 s', text: 'Gives you 1 Semangat. Lv 2: 1.5. Lv 3: 2.' },
    ult: { name: 'Golden Monsoon', when: 'when you have less than 3 Semangat', text: 'For 8 s, your cards cost 1 less (at least 1).' },
    strong: 'long matches, expensive decks', weak: 'early rushes, Tedung, Layang',
    inspired: 'Clash Royale’s Semangat collectors; Dota’s gold-greedy heroes; the spice traders of the old ports',
  }),
  badak: hero({
    id: 'badak', code: 'Bd', name: 'Badak', title: 'the Charging Rhino', role: 'Charger', cost: 5, best: 'push',
    hp: 1800, damage: 70, attack: 1.2, range: 180, speed: 10, radius: 105, power_s: 12,
    trait: { name: 'Thick Hide', text: 'Takes 25% less damage from towers and the Pusaka.' },
    power: { name: 'Charge', when: 'every 12 s, when an enemy is within 600', text: 'Charges into it: enemies around the impact take 100, are knocked back and stunned 0.5 s. Lv 2: 150. Lv 3: stun 1 s.' },
    ult: { name: 'Stampede', when: 'at level 4, when the enemy tower in his lane is within 2,000', text: 'Charges to the tower, hits it for 200 and stuns enemies around it for 1.5 s.' },
    strong: 'Pemanah, Hujan, packed defences', weak: 'Kail, Dalang (taken over), Tedung',
    inspired: 'Clash Royale’s charging riders and rams; Dota’s charging initiators; the Sumatran rhino',
  }),
  tedung: hero({
    id: 'tedung', code: 'Te', name: 'Tedung', title: 'the King Cobra', role: 'Assassin', cost: 4, best: 'gank',
    hp: 850, damage: 65, attack: 1, range: 300, speed: 12, radius: 70, power_s: 8,
    trait: { name: 'Venom', text: 'Her hits poison: 2% of the target’s health a second for 3 s.' },
    power: { name: 'Spit', when: 'every 8 s, when enemies are within 500', text: 'Spits at the 2 nearest enemies: poison (4% a second for 3 s) and a 30% slow for 2 s. Lv 2: 3 enemies. Lv 3: poison doubled.' },
    ult: { name: 'Coil', when: 'when an enemy hero within 400 is below 50%', text: 'Stuns it 2 s and poisons it for 6% a second for 3 s.' },
    strong: 'tanks, healers, Saudagar', weak: 'Hujan (heals poison off), Benteng, Pemanah',
    inspired: 'Dota’s poison heroes; Clash Royale’s Poison spell; the king cobra',
  }),
  tukang: hero({
    id: 'tukang', code: 'Tu', name: 'Tukang', title: 'the Bamboo Builder', role: 'Builder', cost: 4, best: 'defend',
    hp: 1150, damage: 50, attack: 1.1, range: 450, speed: 8, radius: 80, power_s: 20,
    trait: { name: 'Carpenter', text: 'Your towers within 700 of him repair 1% a second.' },
    power: { name: 'Bamboo Watchtower', when: 'every 20 s', text: 'Builds a small watchtower where he stands (500 health, shoots for 20 s). Lv 2: 700 health. Lv 3: lasts 30 s.' },
    ult: { name: 'Bamboo Bulwark', when: 'when one of your towers falls below 50%', text: 'All your towers get a 600 shield and attack 30% faster for 8 s.' },
    strong: 'Gergasi, Kerbau, slow pushes', weak: 'Senja, Petir, Badak',
    inspired: 'Clash Royale’s defensive buildings; Dota’s builders and tower glyph; bamboo craft',
  }),
  helang: hero({
    id: 'helang', code: 'He', name: 'Helang', title: 'the Sea Eagle', role: 'Marksman', cost: 5, best: 'push',
    hp: 600, damage: 100, attack: 1.3, range: 700, speed: 10, radius: 65, power_s: 9,
    trait: { name: 'Eagle Eye', text: 'The longest reach of any hero, and +25% damage to heroes.' },
    power: { name: 'Piercing Shot', when: 'every 9 s, when an enemy is within 900', text: 'An arrow that hits every enemy in a line for 130. Lv 2: 180. Lv 3: also slows them 40% for 2 s.' },
    ult: { name: 'Storm of Feathers', when: 'when 3 or more enemies are in reach', text: 'Attacks twice as fast for 6 s.' },
    strong: 'Gergasi, Benteng, slow walkers', weak: 'Layang, Pendekar, Belang (divers)',
    inspired: 'Dota’s snipers; Clash Royale’s piercing archers; the sea eagles of the islands',
  }),
  embun: hero({
    id: 'embun', code: 'Em', name: 'Embun', title: 'the Mist Weaver', role: 'Controller', cost: 5, best: 'defend',
    hp: 850, damage: 50, attack: 1.1, range: 550, speed: 10, radius: 70, power_s: 14,
    trait: { name: 'Morning Mist', text: 'Enemies within 400 of her are 15% slower.' },
    power: { name: 'Fog Bank', when: 'every 14 s, when 2 or more enemies are within 800', text: 'Fog covers them for 6 s: enemies inside are 40% slower, and your heroes inside are hard to see. Lv 2: lasts 8 s. Lv 3: bigger fog.' },
    ult: { name: 'Dawn Freeze', when: 'when 5 or more enemies are within 600', text: 'Freezes every enemy within 600 for 1.5 s.' },
    strong: 'big pushes, swarms, Badak', weak: 'Helang, Rimba, Tedung',
    inspired: 'Dota’s area controllers; Clash Royale’s Freeze spell; mountain morning mist',
  }),
  ombak: hero({
    id: 'ombak', code: 'Om', name: 'Ombak', title: 'the Tide Rider', role: 'Pusher', cost: 5, best: 'push',
    hp: 1150, damage: 65, attack: 1.1, range: 300, speed: 10, radius: 85, power_s: 12,
    trait: { name: 'High Tide', text: 'Your troops in her lane near her move 15% faster.' },
    power: { name: 'Surge', when: 'every 12 s, when enemies are ahead of her', text: 'A wave rolls 900 up her lane: enemies take 110 and are pushed back 250. Lv 2: 150. Lv 3: also slows them 30% for 2 s.' },
    ult: { name: 'King Tide', when: 'when 3 or more of your troops are in her lane', text: 'For 10 s, your troops in her lane deal 30% more damage and move 30% faster.' },
    strong: 'slow defences, Benteng, Tukang', weak: 'Embun, Senja, Kail',
    inspired: 'Dota’s wave pushers; Clash Royale’s Rage and The Log; the king tides of the coast',
  }),
  buaya: hero({
    id: 'buaya', code: 'Bu', name: 'Buaya', title: 'the River Jaws', role: 'Bruiser', cost: 5, best: 'farm',
    hp: 1450, damage: 70, attack: 1.1, range: 180, speed: 10, radius: 95, power_s: 12,
    trait: { name: 'Death Roll', text: 'Heals 20% of the damage it deals.' },
    power: { name: 'Drag Under', when: 'every 12 s, when an enemy is within reach', text: 'Grabs the nearest enemy: stuns it 1.5 s and deals 180 over that time. Lv 2: 240. Lv 3: 300.' },
    ult: { name: 'Swamp King', when: 'when it drops below 40% health at level 4', text: 'For 8 s it heals 5% a second and can’t be slowed, stunned or silenced.' },
    strong: 'Belang, Pendekar, long melee fights', weak: 'Helang, Tedung, Kail',
    inspired: 'Dota’s life-stealing bruisers; Clash Royale’s tanky melee; river crocodile tales',
  }),
};

export const HERO_IDS = Object.keys(HEROES) as HeroKind[];

// ---------------------------------------------------------------------------------------------
// Cards. Hero cards use the hero's id as the card id.

export type ClassCardId =
  | 'spearmen' | 'archers' | 'shieldbearer' | 'ram'
  | 'kera' | 'harimau' | 'enggang' | 'seladang'
  | 'ketam' | 'sumpit' | 'belut'
  | 'kerengga' | 'tebuan' | 'kumbang' | 'ratu'
  | 'kerikil' | 'golem' | 'lontar';
export type SpellCardId = 'firebolt' | 'gotong' | 'auman' | 'arus' | 'sengat' | 'gempa';
export type TroopCardId = ClassCardId | SpellCardId;
export type CardId = TroopCardId | HeroKind;

export interface CardDef {
  id: CardId;
  name: string;
  cost: number; // in Semangat
  kind: 'troop' | 'spell' | 'hero';
  unit?: UnitKind;
  count?: number;
  /** How many of this class march in a lane wave. */
  wave?: number;
  hero?: HeroKind;
  text: string;
}

const troop = (id: ClassCardId, unit: UnitKind, count: number, wave: number, cost: number): CardDef => ({
  id, name: UNITS[unit].name, cost, kind: 'troop', unit, count, wave, text: `${count > 1 ? `${count} × ` : ''}${UNITS[unit].ability ?? ''}`,
});

export const CLASS_CARDS: Record<ClassCardId, CardDef> = {
  spearmen: troop('spearmen', 'spearman', 3, 2, 3),
  archers: troop('archers', 'archer', 2, 2, 3),
  shieldbearer: troop('shieldbearer', 'shieldbearer', 1, 1, 4),
  ram: troop('ram', 'ram', 1, 1, 5),
  kera: troop('kera', 'kera', 4, 3, 2),
  harimau: troop('harimau', 'harimau', 1, 1, 4),
  enggang: troop('enggang', 'enggang', 2, 2, 4),
  seladang: troop('seladang', 'seladang', 1, 1, 5),
  ketam: troop('ketam', 'ketam', 1, 1, 4),
  sumpit: troop('sumpit', 'sumpit', 2, 2, 3),
  belut: troop('belut', 'belut', 2, 2, 4),
  kerengga: troop('kerengga', 'kerengga', 6, 4, 2),
  tebuan: troop('tebuan', 'tebuan', 3, 2, 3),
  kumbang: troop('kumbang', 'kumbang', 1, 1, 4),
  ratu: troop('ratu', 'ratu', 1, 1, 5),
  kerikil: troop('kerikil', 'kerikil', 3, 2, 3),
  golem: troop('golem', 'golem', 1, 1, 6),
  lontar: troop('lontar', 'lontar', 1, 1, 4),
};

export interface SpellDef {
  delay: number;
  radius: number;
  damage: number; // to enemy troops and heroes
  structureDamage: number; // to enemy towers and the Pusaka
}

export const SPELLS: Record<SpellCardId, SpellDef & { name: string; cost: number; text: string }> = {
  firebolt: { name: 'Petir', cost: 4, text: 'Lightning strikes an area', delay: sec(0.6), radius: 250, damage: 260, structureDamage: 78 },
  gotong: { name: 'Gotong-royong', cost: 3, text: 'Heals 250 and shields your side in an area', delay: sec(0.3), radius: 320, damage: 0, structureDamage: 0 },
  auman: { name: 'Auman', cost: 3, text: 'A roar: your side +30% damage and speed, 6 s', delay: sec(0.3), radius: 350, damage: 0, structureDamage: 0 },
  arus: { name: 'Arus', cost: 3, text: 'A current washes enemies back and slows them', delay: sec(0.4), radius: 300, damage: 80, structureDamage: 0 },
  sengat: { name: 'Sengat', cost: 3, text: 'A stinging cloud poisons enemies for 4 s', delay: sec(0.4), radius: 280, damage: 0, structureDamage: 0 },
  gempa: { name: 'Gempa', cost: 4, text: 'A quake stuns enemies 1 s and cracks towers', delay: sec(0.6), radius: 300, damage: 100, structureDamage: 200 },
};

export const SPELL_IDS = Object.keys(SPELLS) as SpellCardId[];
export const CLASS_IDS = Object.keys(CLASS_CARDS) as ClassCardId[];

export const CARDS: Record<CardId, CardDef> = {
  ...CLASS_CARDS,
  ...(Object.fromEntries(SPELL_IDS.map((id) => [id, { id, name: SPELLS[id].name, cost: SPELLS[id].cost, kind: 'spell' as const, text: SPELLS[id].text }])) as Record<SpellCardId, CardDef>),
  ...(Object.fromEntries(HERO_IDS.map((id) => [id, {
    id, name: HEROES[id].name, cost: HEROES[id].cost, kind: 'hero' as const, hero: id, text: `Hero · ${HEROES[id].role}`,
  }])) as Record<HeroKind, CardDef>),
};

/** Every card in a fixed order (for hashing). */
export const ALL_CARDS: readonly CardId[] = [...CLASS_IDS, ...SPELL_IDS, ...HERO_IDS];

/** A species' cards: its classes, its spell and Petir. */
export function speciesDeck(id: SpeciesId): TroopCardId[] {
  return [...SPECIES[id].classes, SPECIES[id].spell, 'firebolt'];
}

/** @deprecated the Kampung deck (kept for older tests). */
export const TROOP_DECK: readonly TroopCardId[] = speciesDeck('kampung');

export const FIREBOLT = { delay: sec(0.6), radius: 250, damage: 260, structurePercent: 30 } as const;

export const HAND_SIZE = 4;

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
  size: 3,
  spawnU: 300, // distance from own Core end along the lane
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

export const CAMP = {
  hp: 900,
  damage: 45,
  attackTicks: sec(1.2),
  range: 220,
  radius: 110,
  respawn: sec(45),
  manaReward: 2 * 56,
  resetAfter: sec(5), // heals back to full if nobody hits it for this long
} as const;

export type UnitKind = 'minion' | 'spearman' | 'archer' | 'ram' | 'imp' | 'shieldbearer' | 'puppet' | 'decoy' | 'watchtower';
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
}

export const UNITS: Record<UnitKind, UnitStats> = {
  minion: { name: 'Minion', hp: 200, damage: 25, attackTicks: sec(1), range: 150, sight: 500, speed: 8, radius: 50, targets: 'any', xp: XP.minion },
  spearman: { name: 'Silat Guard', hp: 340, damage: 55, attackTicks: sec(1.1), range: 160, sight: 550, speed: 9, radius: 60, targets: 'any', xp: XP.troop },
  archer: { name: 'Pemanah', hp: 200, damage: 45, attackTicks: sec(1.2), range: 550, sight: 600, speed: 9, radius: 55, targets: 'any', xp: XP.troop },
  ram: { name: 'Kerbau', hp: 1500, damage: 220, attackTicks: sec(1.5), range: 160, sight: 600, speed: 6, radius: 100, targets: 'buildings', xp: XP.troop },
  imp: { name: 'Kelip-kelip', hp: 90, damage: 35, attackTicks: sec(0.8), range: 130, sight: 500, speed: 14, radius: 40, targets: 'any', xp: XP.troop },
  shieldbearer: { name: 'Perisai', hp: 1100, damage: 75, attackTicks: sec(1.3), range: 170, sight: 550, speed: 8, radius: 80, targets: 'any', xp: XP.troop },
  // Summoned by heroes
  puppet: { name: 'Shadow puppet', hp: 220, damage: 38, attackTicks: sec(1), range: 150, sight: 500, speed: 9, radius: 50, targets: 'any', xp: 4 },
  decoy: { name: 'Decoy', hp: 250, damage: 0, attackTicks: sec(1), range: 0, sight: 0, speed: 14, radius: 60, targets: 'any', xp: 0 },
  watchtower: { name: 'Bamboo watchtower', hp: 500, damage: 40, attackTicks: sec(0.8), range: 500, sight: 500, speed: 0, radius: 80, targets: 'any', xp: 10 },
};

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

export type TroopCardId = 'spearmen' | 'archers' | 'ram' | 'imps' | 'firebolt' | 'shieldbearer';
export type CardId = TroopCardId | HeroKind;

export interface CardDef {
  id: CardId;
  name: string;
  cost: number; // in Semangat
  kind: 'troop' | 'spell' | 'hero';
  unit?: UnitKind;
  count?: number;
  hero?: HeroKind;
  text: string;
}

const TROOP_CARDS: Record<TroopCardId, CardDef> = {
  spearmen: { id: 'spearmen', name: 'Silat Guards', cost: 3, kind: 'troop', unit: 'spearman', count: 3, text: '3 sturdy fighters' },
  archers: { id: 'archers', name: 'Pemanah', cost: 3, kind: 'troop', unit: 'archer', count: 2, text: '2 archers; can hit fliers' },
  ram: { id: 'ram', name: 'Kerbau', cost: 5, kind: 'troop', unit: 'ram', count: 1, text: 'Buffalo that only hits towers' },
  imps: { id: 'imps', name: 'Kelip-kelip', cost: 2, kind: 'troop', unit: 'imp', count: 4, text: '4 fast fire-flies' },
  shieldbearer: { id: 'shieldbearer', name: 'Perisai', cost: 4, kind: 'troop', unit: 'shieldbearer', count: 1, text: 'One tough shield guard' },
  firebolt: { id: 'firebolt', name: 'Petir', cost: 4, kind: 'spell', text: 'Lightning strikes an area' },
};

export const TROOP_DECK: readonly TroopCardId[] = ['spearmen', 'archers', 'ram', 'imps', 'firebolt', 'shieldbearer'];

export const CARDS: Record<CardId, CardDef> = {
  ...TROOP_CARDS,
  ...(Object.fromEntries(HERO_IDS.map((id) => [id, {
    id, name: HEROES[id].name, cost: HEROES[id].cost, kind: 'hero' as const, hero: id, text: `Hero · ${HEROES[id].role}`,
  }])) as Record<HeroKind, CardDef>),
};

/** Every card in a fixed order (for hashing). */
export const ALL_CARDS: readonly CardId[] = [...TROOP_DECK, ...HERO_IDS];

export const FIREBOLT = { delay: sec(0.6), radius: 250, damage: 260, structurePercent: 30 } as const;

export const HAND_SIZE = 4;

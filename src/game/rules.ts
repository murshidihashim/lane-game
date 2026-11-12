// Tuning numbers for the prototype. Every value here is a first guess to adjust in play tests.
// Time is in ticks: 20 ticks = 1 second. Distances are world units (a lane is ~520 wide).

export const TICKS_PER_SECOND = 20;
export const sec = (s: number): number => Math.round(s * TICKS_PER_SECOND);

export const MATCH = {
  regulation: sec(300), // 5:00
  suddenDeath: sec(60), // then 1:00 of sudden death
  doubleManaFrom: sec(240), // last minute of regulation (and all of sudden death)
  towerShieldUntil: sec(60), // towers take half damage for the first minute
  towerShieldPercent: 50,
} as const;

/** Mana is stored in points: 56 points = 1 mana, +1 point per tick = 1 mana every 2.8 s. */
export const MANA = {
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

export type UnitKind = 'minion' | 'spearman' | 'archer' | 'ram' | 'imp' | 'shieldbearer';
export type HeroKind = 'ranger' | 'warden';
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
  spearman: { name: 'Spearman', hp: 340, damage: 55, attackTicks: sec(1.1), range: 160, sight: 550, speed: 9, radius: 60, targets: 'any', xp: XP.troop },
  archer: { name: 'Archer', hp: 200, damage: 45, attackTicks: sec(1.2), range: 550, sight: 600, speed: 9, radius: 55, targets: 'any', xp: XP.troop },
  ram: { name: 'Ram', hp: 1500, damage: 220, attackTicks: sec(1.5), range: 160, sight: 600, speed: 6, radius: 100, targets: 'buildings', xp: XP.troop },
  imp: { name: 'Imp', hp: 90, damage: 35, attackTicks: sec(0.8), range: 130, sight: 500, speed: 14, radius: 40, targets: 'any', xp: XP.troop },
  shieldbearer: { name: 'Shieldbearer', hp: 1100, damage: 75, attackTicks: sec(1.3), range: 170, sight: 550, speed: 8, radius: 80, targets: 'any', xp: XP.troop },
};

export interface HeroStats extends UnitStats {
  letter: string;
  role: string;
  abilityName: string;
  abilityTicks: number;
  abilityRange: number;
  abilityDamage: number;
  abilityTargets: number; // Ranger: how many enemies; Warden: 0 = everyone in range
  slowTicks: number;
  slowPercent: number; // speed while slowed, in percent
}

export const HEROES: Record<HeroKind, HeroStats> = {
  ranger: {
    name: 'Ranger', letter: 'R', role: 'Fast, ranged. Good at ganks.',
    hp: 900, damage: 75, attackTicks: sec(0.9), range: 520, sight: 650, speed: 12, radius: 70, targets: 'any', xp: XP.hero,
    abilityName: 'Volley', abilityTicks: sec(10), abilityRange: 520, abilityDamage: 140, abilityTargets: 3, slowTicks: 0, slowPercent: 100,
  },
  warden: {
    name: 'Warden', letter: 'W', role: 'Tough, slows enemies. Good at defending.',
    hp: 1700, damage: 65, attackTicks: sec(1.1), range: 180, sight: 600, speed: 8, radius: 90, targets: 'any', xp: XP.hero,
    abilityName: 'Stomp', abilityTicks: sec(12), abilityRange: 320, abilityDamage: 100, abilityTargets: 0, slowTicks: sec(3), slowPercent: 60,
  },
};

export const STRUCTURES = {
  tower: { hp: 2200, damage: 55, attackTicks: sec(0.8), range: 750, radius: 150 },
  core: { hp: 3200, damage: 80, attackTicks: sec(0.8), range: 800, radius: 270 },
} as const;

export type CardId = 'spearmen' | 'archers' | 'ram' | 'imps' | 'firebolt' | 'shieldbearer' | 'ranger' | 'warden';

export interface CardDef {
  id: CardId;
  name: string;
  cost: number; // in mana
  kind: 'troop' | 'spell' | 'hero';
  unit?: UnitKind;
  count?: number;
  hero?: HeroKind;
  text: string;
}

export const CARDS: Record<CardId, CardDef> = {
  spearmen: { id: 'spearmen', name: 'Spearmen', cost: 3, kind: 'troop', unit: 'spearman', count: 3, text: '3 sturdy fighters' },
  archers: { id: 'archers', name: 'Archers', cost: 3, kind: 'troop', unit: 'archer', count: 2, text: '2 ranged shooters' },
  ram: { id: 'ram', name: 'Ram', cost: 5, kind: 'troop', unit: 'ram', count: 1, text: 'Only hits towers, hits hard' },
  imps: { id: 'imps', name: 'Imps', cost: 2, kind: 'troop', unit: 'imp', count: 4, text: '4 fast, weak biters' },
  shieldbearer: { id: 'shieldbearer', name: 'Shieldbearer', cost: 4, kind: 'troop', unit: 'shieldbearer', count: 1, text: 'One tough blocker' },
  firebolt: { id: 'firebolt', name: 'Firebolt', cost: 4, kind: 'spell', text: 'Blast an area anywhere' },
  ranger: { id: 'ranger', name: 'Ranger', cost: 5, kind: 'hero', hero: 'ranger', text: 'Hero: fast ganker' },
  warden: { id: 'warden', name: 'Warden', cost: 5, kind: 'hero', hero: 'warden', text: 'Hero: tough defender' },
};

export const FIREBOLT = { delay: sec(0.6), radius: 250, damage: 260, structurePercent: 30 } as const;

export const DECK: readonly CardId[] = ['spearmen', 'archers', 'ram', 'imps', 'firebolt', 'shieldbearer', 'ranger', 'warden'];
export const HAND_SIZE = 4;

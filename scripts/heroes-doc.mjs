// Writes docs/design/heroes.md and docs/design/species.md from the game's own data (src/game/rules.ts),
// so the roster documents never drift from the game. Usage:
//   node --experimental-strip-types --no-warnings scripts/heroes-doc.mjs          write the files
//   node --experimental-strip-types --no-warnings scripts/heroes-doc.mjs --check  fail if one is out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { HEROES, HERO_IDS, MANA, HERO_RULES, SPECIES, SPECIES_IDS, CLASSES, UNITS, ITEMS, ITEM_IDS, ITEM_SLOTS, VISION, WAVES, NEUTRALS, FURY, WARDS, RELICS, BOUNTY } = await import('../src/game/rules.ts');
const OUT = 'docs/design/heroes.md';
const OUT2 = 'docs/design/species.md';
const sec = (t) => `${+(t / 20).toFixed(1)} s`;
const sp = (m) => `${m / MANA.perMana}`;
const orderName = { push: 'Push', defend: 'Defend', gank: 'Gank', farm: 'Farm' };

const L = [];
L.push('# Heroes · roster v2 (20 heroes)', '');
L.push('_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._', '');
L.push('Decisions: DEC-006 (folk-tale world and names), DEC-007 (power system), DEC-011 (heroes start on the map; ultimates are called). Plans: PLAN-002, PLAN-004. All numbers are first values to tune in play tests.', '');
L.push('## How powers work', '');
L.push(`- **Trait**: always on.`);
L.push(`- **Power**: fires by itself when its trigger happens, then waits its cooldown. Ranks 1–3 follow the hero's level.`);
L.push(`- **Ultimate**: unlocks at level ${HERO_RULES.ultLevel}, once per life (ready again after respawn). The ULT button glows at a good moment (the "best moment" below); tap it and the hero fires at the next good moment. Belang's is always on.`);
L.push(`- **Best order**: +${HERO_RULES.bestOrderPercent}% damage while following it (gankers keep it for a few seconds after arriving).`);
L.push(`- **Heroes on the map**: you pick ${HERO_RULES.heroesPerPlayer} heroes before the match; both start at your Pusaka. You command them and buy them items with ${MANA.name}. Species, lane troops, items and map rewards: see \`species.md\`.`, '');
L.push('## Roster', '');
L.push('| Hero | Role | Best order | Health | Damage | Reach | Speed |');
L.push('|---|---|---|---|---|---|---|');
for (const id of HERO_IDS) {
  const h = HEROES[id];
  L.push(`| ${h.name}, ${h.title} | ${h.role} | ${orderName[h.best]} | ${h.hp} | ${h.damage} every ${(h.attackTicks / 20).toFixed(1)} s | ${h.range}${h.flying ? ' (flies)' : ''} | ${h.speed} |`);
}
L.push('');
for (const id of HERO_IDS) {
  const h = HEROES[id];
  L.push(`### ${h.name} · ${h.title}`);
  L.push(`${h.role} · best order **${orderName[h.best]}** · ${h.range >= 300 ? 'ranged' : 'melee'}${h.flying ? ' · flies' : ''}${h.targets === 'buildings' ? ' · hits buildings only' : ''}`, '');
  L.push(`- **Trait: ${h.trait.name}.** ${h.trait.text}`);
  L.push(`- **Power: ${h.power.name}** (${h.power.when}). ${h.power.text}`);
  L.push(`- **Ultimate: ${h.ult.name}** (best moment: ${h.ult.when}). ${h.ult.text}`);
  L.push(`- Strong vs ${h.strong}. Weak vs ${h.weak}.`);
  L.push(`- Inspired by: ${h.inspired}.`, '');
}
const text = L.join('\n');

// ---- species, troops, spells and map rewards (PLAN-003) ----
const S = [];
S.push('# Species, lane troops, items and map rewards · v2', '');
S.push('_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._', '');
S.push('Decisions: DEC-008 (species and lane waves), DEC-009 (hero orders and map rewards), DEC-011 (no hand cards; items), DEC-012 (fog of war). Plans: PLAN-003, PLAN-004. All numbers are first values to tune in play tests.', '');
S.push('## How species work', '');
S.push(`- Before the match each player picks one of ${SPECIES_IDS.length} species (and 2 heroes). The species decides what can march in your lanes.`);
S.push(`- Every ${sec(WAVES.every)} (first at ${sec(WAVES.first)}) each lane sends a **wave** of the class you chose for that lane. Waves are the only troops (no hand cards) and get ${WAVES.growPctPerMinute}% stronger each minute. Tap a wave chip to change the next waves in that lane.`, '');
S.push('| Species | Style | Classes |', '|---|---|---|');
for (const id of SPECIES_IDS) {
  const d = SPECIES[id];
  S.push(`| ${d.name}, ${d.title} | ${d.text} | ${d.classes.map((c) => CLASSES[c].name).join(', ')} |`);
}
S.push('');
for (const id of SPECIES_IDS) {
  const d = SPECIES[id];
  S.push(`### ${d.name} · ${d.title}`, '', d.text, '');
  S.push('| Class | A wave sends | Health | Damage | Reach | Speed | Ability |', '|---|---|---|---|---|---|---|');
  for (const c of d.classes) {
    const card = CLASSES[c];
    const u = UNITS[card.unit];
    const reach = u.range >= 300 ? `${u.range} (ranged)` : `${u.range}`;
    const dmg = u.damage > 0 ? `${u.damage} every ${sec(u.attackTicks)}` : u.bomb ? `bursts for ${u.bomb}` : '-';
    S.push(`| ${card.name} | ${card.wave} | ${u.hp} | ${dmg} | ${reach}${u.flying ? ', flies' : ''} | ${u.speed} | ${u.ability ?? ''} |`);
  }
  S.push('');
}
S.push('## Hero orders', '');
S.push('Drag a hero portrait onto a glowing spot on the map: **Push** a lane, **Gank** another lane, **Defend** a tower, **Farm** a grove, den or Gajah Mina, collect a **relic**, place a **Ward** on a cairn, or **Retreat** to the Pusaka. Drop it anywhere else to **Move** there and hold the spot (it fights what comes within ' + HERO_RULES.moveLeash + '). Farm and Ward are errands: when done, the hero goes back to its last job.', '');
S.push('## Items', '');
S.push(`Bought with ${MANA.name} in the Shop, for one hero, ${ITEM_SLOTS} slots each, kept through death. No random rewards. ${MANA.name} starts at ${sp(MANA.start)}, refills 1 every ${sec(MANA.perMana / MANA.regenPerTick)} (twice as fast in the last minute) and holds at most ${sp(MANA.max)}.`, '');
S.push('| Item | Cost | What it does |', '|---|---|---|');
for (const id of ITEM_IDS) S.push(`| ${ITEMS[id].name} | ${ITEMS[id].cost} | ${ITEMS[id].text} |`);
S.push('', '## Fog of war', '');
S.push(`Each side sees only around its own pieces: heroes ${VISION.hero}, troops ${VISION.unit}, towers ${VISION.tower}, Pusaka ${VISION.core}, wards ${VISION.ward}, Tukang's watchtower ${VISION.watchtower}, and Seri's lanterns. Towers, both Pusaka, camps and relics are always shown. Heroes hidden in the jungle stay unseen until revealed.`, '');
S.push('## Map rewards', '', '| Spot | Reward | Comes back |', '|---|---|---|');
S.push(`| Fruit grove (2, on the river) | ${sp(NEUTRALS.grove.mana)} ${MANA.name}, ${NEUTRALS.grove.xp} XP | ${sec(NEUTRALS.grove.respawn)} |`);
S.push(`| Beast den (1 per side, in the jungle) | Jungle Fury: +${FURY.damagePct}% damage, +${FURY.speedPct}% speed for ${sec(FURY.ticks)}; ${NEUTRALS.den.xp} XP | ${sec(NEUTRALS.den.respawn)} |`);
S.push(`| Gajah Mina (river pool, first at ${sec(NEUTRALS.boss.first)}) | Joins the side that beats it and charges a lane; ${sp(NEUTRALS.boss.mana)} ${MANA.name}, ${NEUTRALS.boss.xp} XP | ${sec(NEUTRALS.boss.respawn)} |`);
S.push(`| Ward cairn (3 per side) | Shows hidden enemy heroes within ${WARDS.radius} for ${sec(WARDS.life)}; ${WARDS.placeXp} XP to place. Up to ${WARDS.max} each. | - |`);
S.push(`| Clearing an enemy ward (${WARDS.hits} hero hits) | ${sp(WARDS.bountyMana)} ${MANA.name}, ${WARDS.bountyXp} XP | - |`);
S.push(`| Relic (a pair at the shrines, first at ${sec(RELICS.first)}, then every ${sec(RELICS.every)}, lasts ${sec(RELICS.life)}) | In turn: ${sp(RELICS.mana)} ${MANA.name}, ${RELICS.xp} XP, or ${sec(RELICS.boostTicks)} of haste and shield | ${sec(RELICS.every)} |`);
S.push(`| Hero kill | ${sp(BOUNTY.heroKill)} ${MANA.name} (+${sp(BOUNTY.streak)} if the victim was on a streak; +${sp(BOUNTY.firstKill)} for the match's first kill) | - |`);
S.push(`| Tower | ${sp(BOUNTY.tower)} ${MANA.name} | - |`, '');
S.push('A neutral camp left alone for ' + sec(NEUTRALS.resetAfter) + ' heals back to full.', '');
const text2 = S.join('\n');

if (process.argv.includes('--check')) {
  for (const [file, want] of [[OUT, text], [OUT2, text2]]) {
    const cur = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (cur !== want) { console.error(`${file} is out of date. Run: npm run docs:heroes`); process.exit(1); }
    console.log(`${file} is up to date.`);
  }
} else {
  writeFileSync(OUT, text);
  writeFileSync(OUT2, text2);
  console.log(`Wrote ${OUT} (${HERO_IDS.length} heroes) and ${OUT2} (${SPECIES_IDS.length} species).`);
}

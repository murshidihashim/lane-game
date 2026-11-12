// Writes docs/design/heroes.md from the game's own hero data (src/game/rules.ts), so the roster
// document never drifts from the game. Usage:
//   node --experimental-strip-types --no-warnings scripts/heroes-doc.mjs          write the file
//   node --experimental-strip-types --no-warnings scripts/heroes-doc.mjs --check  fail if it is out of date
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { HEROES, HERO_IDS, CARDS, TROOP_DECK, MANA, HERO_RULES } = await import('../src/game/rules.ts');
const OUT = 'docs/design/heroes.md';
const orderName = { push: 'Push', defend: 'Defend', gank: 'Gank', farm: 'Farm' };

const L = [];
L.push('# Heroes · roster v2 (20 heroes)', '');
L.push('_Generated from `src/game/rules.ts` by `scripts/heroes-doc.mjs`. Do not edit by hand: change the game data and run the script._', '');
L.push('Decisions: DEC-006 (folk-tale world and names), DEC-007 (power system). Plan: PLAN-002. All numbers are first values to tune in play tests.', '');
L.push('## How powers work', '');
L.push(`- **Trait**: always on.`);
L.push(`- **Power**: fires by itself when its trigger happens, then waits its cooldown. Ranks 1–3 follow the hero's level.`);
L.push(`- **Ultimate**: unlocks at level ${HERO_RULES.ultLevel}, fires by itself on its trigger, once per life (ready again after respawn).`);
L.push(`- **Best order**: +${HERO_RULES.bestOrderPercent}% damage while following it (gankers keep it for a few seconds after arriving).`);
L.push(`- **Deck**: 6 troop and spell cards plus your ${HERO_RULES.heroesPerDeck} heroes, picked before the match. Costs are in ${MANA.name} (spirit), the purple bar.`, '');
L.push('## Roster', '');
L.push('| Hero | Role | Cost | Best order | Health | Damage | Reach | Speed |');
L.push('|---|---|---|---|---|---|---|---|');
for (const id of HERO_IDS) {
  const h = HEROES[id];
  L.push(`| ${h.name}, ${h.title} | ${h.role} | ${h.cost} | ${orderName[h.best]} | ${h.hp} | ${h.damage} every ${(h.attackTicks / 20).toFixed(1)} s | ${h.range}${h.flying ? ' (flies)' : ''} | ${h.speed} |`);
}
L.push('');
for (const id of HERO_IDS) {
  const h = HEROES[id];
  L.push(`### ${h.name} · ${h.title}`);
  L.push(`${h.role} · cost ${h.cost} · best order **${orderName[h.best]}** · ${h.range >= 300 ? 'ranged' : 'melee'}${h.flying ? ' · flies' : ''}${h.targets === 'buildings' ? ' · hits buildings only' : ''}`, '');
  L.push(`- **Trait: ${h.trait.name}.** ${h.trait.text}`);
  L.push(`- **Power: ${h.power.name}** (${h.power.when}). ${h.power.text}`);
  L.push(`- **Ultimate: ${h.ult.name}** (${h.ult.when}). ${h.ult.text}`);
  L.push(`- Strong vs ${h.strong}. Weak vs ${h.weak}.`);
  L.push(`- Inspired by: ${h.inspired}.`, '');
}
L.push('## Troop and spell cards', '');
L.push('| Card | Cost | What it is |', '|---|---|---|');
for (const id of TROOP_DECK) L.push(`| ${CARDS[id].name} | ${CARDS[id].cost} | ${CARDS[id].text} |`);
L.push('');
const text = L.join('\n');

if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== text) { console.error(`${OUT} is out of date. Run: node --experimental-strip-types --no-warnings scripts/heroes-doc.mjs`); process.exit(1); }
  console.log(`${OUT} is up to date.`);
} else {
  writeFileSync(OUT, text);
  console.log(`Wrote ${OUT} (${HERO_IDS.length} heroes).`);
}

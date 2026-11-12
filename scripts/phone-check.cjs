// PLAN-001 T1/T5, PLAN-002, PLAN-003 T6 prep: opens the built game at phone size and plays it.
// Needs Playwright with Chromium available on the machine (not a project dependency).
// Usage: npm run build && node scripts/phone-check.cjs [screenshot-folder]
const { chromium, devices } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const out = process.argv[2] || 'phone-check';
fs.mkdirSync(out, { recursive: true });
const file = 'file://' + path.resolve('dist/lane-game.html');
const fail = (msg) => { console.error('FAIL', msg); process.exitCode = 1; };

async function page(browser, query) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(file + query);
  await p.waitForTimeout(300);
  return { p, errors };
}

(async () => {
  const browser = await chromium.launch();

  // 1. Controls: drag a hero card, tap-to-place a troop, drag a hero order.
  {
    const { p, errors } = await page(browser, '?seed=7');
    await p.screenshot({ path: `${out}/1-help.png` });
    await p.click('button[data-action="start"]');
    // Pick screen: choose the Batu species, then Kail and Seri.
    await p.waitForSelector('#pick.show');
    await p.click('#species-batu');
    await p.click('#pick-kail');
    await p.click('#pick-seri');
    await p.screenshot({ path: `${out}/1b-pick.png` });
    await p.click('#pick-go');
    const picks = await p.evaluate(() => window.__game.sim.players[0].picks);
    if (JSON.stringify(picks) !== '["kail","seri"]') fail('pick screen did not start a match with Kail + Seri: ' + JSON.stringify(picks));
    else console.log('PASS pick screen starts a match with the two chosen heroes');
    const sp = await p.evaluate(() => ({ species: window.__game.sim.players[0].species, lanes: window.__game.sim.players[0].laneClass }));
    if (sp.species !== 'batu' || !sp.lanes.every((c) => ['kerikil', 'golem', 'lontar'].includes(c))) fail('species pick did not give Batu lanes: ' + JSON.stringify(sp));
    else console.log('PASS species pick starts the match as Batu, lanes', JSON.stringify(sp.lanes));
    const st = () => p.evaluate(() => { const g = window.__game; const s = g.sim; return { hand: s.players[0].hand, mana: s.players[0].mana, heroes: Object.keys(s.players[0].heroIds), L: g.layout, units: s.ents.filter((e) => e.kind === 'unit' && e.owner === 0 && !e.wave).length }; });
    let s = await st();
    const c = (r) => [r.x + r.w / 2, r.y + r.h / 2];
    const w2s = (wx, wy) => [s.L.field.x + wx * s.L.scale, s.L.field.y + (wy - 500) * s.L.scale];
    const drag = async (a, b) => {
      await p.mouse.move(a[0], a[1]); await p.mouse.down();
      for (let k = 1; k <= 8; k++) await p.mouse.move(a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8);
      await p.waitForTimeout(60); await p.mouse.up();
    };
    const hero = s.hand.includes('seri') ? 'seri' : s.hand.includes('kail') ? 'kail' : null;
    if (hero) {
      const lp = w2s(570, 4600);
      await drag(c(s.L.cards[s.hand.indexOf(hero)]), [lp[0], lp[1] + 28]);
      await p.waitForTimeout(1500);
      s = await st();
      if (!s.heroes.includes(hero)) fail('dragging a hero card did not play the hero');
      else console.log('PASS drag a hero card into the left lane:', hero);
      await p.screenshot({ path: `${out}/2-hero-played.png` });
    } else console.log('NOTE no hero card in the opening hand for this seed');
    // tap the cheapest troop card, then tap the right lane, once it is affordable
    const cost = { kerikil: 3, lontar: 4, golem: 6 };
    let troop = -1;
    for (let wait = 0; wait < 40 && troop < 0; wait++) {
      await p.waitForTimeout(250);
      s = await st();
      const options = s.hand.map((k, i) => [k, i]).filter(([k]) => k in cost).sort((a, b) => cost[a[0]] - cost[b[0]]);
      if (options.length && s.mana >= cost[options[0][0]] * 56) troop = options[0][1];
    }
    if (troop < 0) fail('no affordable troop card within 10 s');
    const before = s.units;
    await p.mouse.click(...c(s.L.cards[troop]));
    await p.waitForTimeout(80);
    await p.screenshot({ path: `${out}/3-card-selected.png` });
    await p.mouse.click(...w2s(3330, 4400));
    await p.waitForTimeout(400);
    s = await st();
    if (s.units <= before) fail('tap card + tap lane did not place troops');
    else console.log('PASS tap a card, then tap a lane, places troops');
    // tap the left wave chip: the next Batu class marches in the left lane
    {
      const lane0 = (await p.evaluate(() => window.__game.sim.players[0].laneClass[0]));
      await p.mouse.click(...c(s.L.waves[0]));
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${out}/3b-wave-chip.png` });
      const after = await p.evaluate(() => window.__game.sim.players[0].laneClass[0]);
      const order = ['kerikil', 'golem', 'lontar'];
      if (after !== order[(order.indexOf(lane0) + 1) % 3]) fail(`wave chip tap: left lane ${lane0} -> ${after}`);
      else console.log(`PASS tapping the left wave chip changes the left lane wave: ${lane0} -> ${after}`);
    }
    if (hero) {
      const slot = c(s.L.heroSlots[hero === 'kail' ? 0 : 1]);
      const camp = w2s(1260, 3470);
      await p.mouse.move(slot[0], slot[1]); await p.mouse.down();
      for (let k = 1; k <= 8; k++) await p.mouse.move(slot[0] + (camp[0] - slot[0]) * k / 8, slot[1] + (camp[1] + 28 - slot[1]) * k / 8);
      await p.waitForTimeout(80);
      await p.screenshot({ path: `${out}/4-order-drag.png` });
      await p.mouse.up();
      await p.waitForTimeout(300);
      const order = await p.evaluate((k) => window.__game.sim.heroOf(0, k).order.type, hero);
      if (order !== 'farm') fail(`hero order drag gave "${order}", expected farm`);
      else console.log('PASS drag a hero portrait onto a camp gives a Farm order');
      // and onto a ward cairn: a Ward order
      s = await st();
      const ward = w2s(1050, 4200);
      await drag(slot, [ward[0], ward[1] + 28]);
      await p.waitForTimeout(300);
      const order2 = await p.evaluate((k) => window.__game.sim.heroOf(0, k).order.type, hero);
      if (order2 !== 'ward') fail(`hero ward drag gave "${order2}", expected ward`);
      else console.log('PASS drag a hero portrait onto a ward cairn gives a Ward order');
    }
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${out}/5-playing.png` });
    if (errors.length) fail('page errors: ' + errors.join(' | '));
  }

  // 2. A full match from start to the result screen (bot plays both sides at 25x speed).
  {
    const { p, errors } = await page(browser, '?seed=5&nohelp=1&autoplay=1&speed=25');
    try {
      await p.waitForSelector('#result.show', { timeout: 90_000 });
      const r = await p.evaluate(() => ({ result: window.__game.sim.result, tick: window.__game.sim.tick, title: document.getElementById('result-title').textContent }));
      console.log('PASS full match reached the result screen:', JSON.stringify(r));
      await p.screenshot({ path: `${out}/6-result.png` });
    } catch (e) { fail('match did not reach the result screen: ' + e.message); }
    if (errors.length) fail('page errors: ' + errors.join(' | '));
  }

  // 2b. A mid-match look with heroes and powers (bot plays both sides).
  {
    const { p, errors } = await page(browser, '?seed=12&nohelp=1&autoplay=1&speed=8');
    await p.waitForFunction(() => window.__game.sim.tick > 3000, null, { timeout: 60_000 });
    await p.evaluate(() => window.__game.setRunning(false));
    await p.screenshot({ path: `${out}/6b-midgame.png` });
    const info = await p.evaluate(() => ({ picks: window.__game.sim.players.map((x) => x.picks), heroes: window.__game.sim.ents.filter((e) => e.kind === 'hero').map((e) => `${e.hero} Lv${e.level}`) }));
    console.log('INFO mid-match heroes:', JSON.stringify(info));
    if (errors.length) fail('page errors: ' + errors.join(' | '));
  }

  // 3. Two-lane mode.
  {
    const { p, errors } = await page(browser, '?lanes=2&nohelp=1&seed=3');
    await p.waitForTimeout(3000);
    const lanes = await p.evaluate(() => window.__game.sim.lanes);
    if (JSON.stringify(lanes) !== '[0,2]') fail('2-lane mode lanes: ' + JSON.stringify(lanes));
    else console.log('PASS ?lanes=2 starts a match with only the side lanes');
    await p.screenshot({ path: `${out}/7-two-lanes.png` });
    if (errors.length) fail('page errors: ' + errors.join(' | '));
  }
  await browser.close();
  console.log(process.exitCode ? 'PHONE CHECK FAILED' : 'PHONE CHECK OK');
})();

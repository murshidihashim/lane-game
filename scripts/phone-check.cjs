// PLAN-001 T1/T5, PLAN-002, PLAN-003, PLAN-004 T5: opens the built game at phone size and plays it.
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

  // 1. Controls (DEC-011): heroes on the map, wave chips, hero orders incl. Move, shop, ULT.
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
    const st = () => p.evaluate(() => { const g = window.__game; const s = g.sim; return { mana: s.players[0].mana, heroes: s.heroes(0).map((h) => h.hero), L: g.layout }; });
    let s = await st();
    const c = (r) => [r.x + r.w / 2, r.y + r.h / 2];
    const w2s = (wx, wy) => [s.L.field.x + wx * s.L.scale, s.L.field.y + (wy - 500) * s.L.scale];
    const drag = async (a, b) => {
      await p.mouse.move(a[0], a[1]); await p.mouse.down();
      for (let k = 1; k <= 8; k++) await p.mouse.move(a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8);
      await p.waitForTimeout(60); await p.mouse.up();
    };
    // No hand cards (DEC-011): both heroes are on the map from the start.
    if (JSON.stringify(s.heroes.sort()) !== '["kail","seri"]') fail('heroes did not start on the map: ' + JSON.stringify(s.heroes));
    else console.log('PASS both heroes start on the map; there is no card row');
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/2-start.png` });

    // tap the left wave chip: the next Batu class marches in the left lane
    {
      const lane0 = await p.evaluate(() => window.__game.sim.players[0].laneClass[0]);
      await p.mouse.click(...c(s.L.waves[0]));
      await p.waitForTimeout(150);
      const after = await p.evaluate(() => window.__game.sim.players[0].laneClass[0]);
      const order = ['kerikil', 'golem', 'lontar'];
      if (after !== order[(order.indexOf(lane0) + 1) % 3]) fail(`wave chip tap: left lane ${lane0} -> ${after}`);
      else console.log(`PASS tapping the left wave chip changes the left lane wave: ${lane0} -> ${after}`);
    }

    // hero orders by dragging the portrait: a camp (Farm), a ward cairn (Ward), an empty spot (Move)
    const portrait = c(s.L.heroes[0].portrait);
    const orderOf = () => p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order.type);
    const camp = w2s(1260, 3470);
    await p.mouse.move(...portrait); await p.mouse.down();
    for (let k = 1; k <= 8; k++) await p.mouse.move(portrait[0] + (camp[0] - portrait[0]) * k / 8, portrait[1] + (camp[1] + 28 - portrait[1]) * k / 8);
    await p.waitForTimeout(80);
    await p.screenshot({ path: `${out}/3-order-drag.png` });
    await p.mouse.up();
    await p.waitForTimeout(200);
    if ((await orderOf()) !== 'farm') fail('drag onto a camp did not give Farm');
    else console.log('PASS drag a hero portrait onto a camp gives a Farm order');
    const ward = w2s(1050, 4200);
    await drag(portrait, [ward[0], ward[1] + 28]);
    await p.waitForTimeout(200);
    if ((await orderOf()) !== 'ward') fail('drag onto a cairn did not give Ward');
    else console.log('PASS drag a hero portrait onto a ward cairn gives a Ward order');
    const spot = w2s(1500, 4700); // open jungle, away from every order spot
    await drag(portrait, [spot[0], spot[1] + 28]);
    await p.waitForTimeout(200);
    const mv = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order);
    if (mv.type !== 'move' || Math.abs(mv.x - 1500) > 150 || Math.abs(mv.y - 4700) > 150) fail('drag onto an empty spot did not give Move there: ' + JSON.stringify(mv));
    else console.log('PASS drag a hero portrait onto an empty spot gives a Move order to that spot');

    // shop: tap Shop, buy Capal Angin (4 Semangat, what you start with) for Kail
    await p.mouse.click(...c(s.L.shop));
    await p.waitForSelector('#shop.show');
    await p.screenshot({ path: `${out}/4-shop.png` });
    await p.click('#item-capal');
    await p.waitForTimeout(250);
    const items = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').items);
    if (JSON.stringify(items) !== '["capal"]') fail('shop did not buy Capal Angin for Kail: ' + JSON.stringify(items));
    else console.log('PASS the shop buys an item for a hero');
    await p.click('button[data-action="shop-close"]');

    // ultimate: bring Kail to level 4, tap ULT (called), then a crowd arrives and it fires with a banner
    await p.evaluate(() => { const sim = window.__game.sim; const h = sim.heroOf(0, 'kail'); sim.giveXp(h, 450); });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/5-ult-ready.png` });
    await p.mouse.click(...c(s.L.heroes[0].ult));
    await p.waitForTimeout(120);
    const armed = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').ultArmed);
    if (!armed) fail('tapping ULT did not call the ultimate');
    else console.log('PASS tapping ULT calls the ultimate');
    await p.screenshot({ path: `${out}/5b-ult-called.png` });
    await p.evaluate(() => {
      const sim = window.__game.sim; const h = sim.heroOf(0, 'kail');
      for (let i = 0; i < 5; i++) sim.summon(1, 'spearman', h.x - 200 + i * 100, h.y - 300, 1);
    });
    await p.waitForFunction(() => !window.__game.sim.heroOf(0, 'kail').ultReady, null, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(450);
    await p.screenshot({ path: `${out}/6-ult-fired.png` });
    if (await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').ultReady)) fail('the called ultimate did not fire when enemies came');
    else console.log('PASS the called ultimate fires at a good moment (banner and effect on screen)');
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
    await p.waitForFunction(() => window.__game.sim.tick > 1700 || window.__game.sim.result, null, { timeout: 90_000 });
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

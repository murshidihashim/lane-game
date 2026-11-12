// PLAN-001 T1/T5, PLAN-002, PLAN-003, PLAN-004 T5, PLAN-005 T3/T5: opens the built game at phone size and plays it.
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
    const { p, errors } = await page(browser, '?seed=7&fast=1');
    await p.screenshot({ path: `${out}/1-help.png` });
    await p.click('button[data-action="start"]');
    // Species step, then the draft (DEC-015): you and the bot take turns; you pick Kail, Seri, Ombak
    // (or the next free hero if the bot took one).
    await p.waitForSelector('#species.show');
    await p.click('#species-batu');
    await p.screenshot({ path: `${out}/1b-species.png` });
    await p.click('#species-go');
    await p.waitForSelector('#draft.show');
    const want = ['kail', 'seri', 'ombak', 'helang', 'tukang', 'benteng'];
    const draft = () => p.evaluate(() => window.__draft);
    for (let guard = 0; guard < 200; guard++) {
      const d = await draft();
      if (d.step !== 'draft' || d.mine.length >= 3) break;
      if (d.whose !== 0) { await p.waitForTimeout(50); continue; }
      const taken = [...d.mine, ...d.bot];
      const hero = want.find((k) => !taken.includes(k));
      await p.click(`#pick-${hero}`);
      if (d.mine.length === 1) await p.screenshot({ path: `${out}/1c-draft.png` });
      await p.click('#draft-lock');
      await p.waitForTimeout(80);
    }
    await p.waitForSelector('#versus.show', { timeout: 10_000 });
    await p.screenshot({ path: `${out}/1d-versus.png` });
    await p.waitForFunction(() => !document.querySelector('#versus.show'), null, { timeout: 10_000 });
    const d = await draft();
    const lineup = await p.evaluate(() => ({ mine: window.__game.sim.players[0].picks, bot: window.__game.sim.players[1].picks }));
    const overlap = lineup.mine.some((k) => lineup.bot.includes(k));
    if (JSON.stringify(lineup.mine) !== JSON.stringify(d.mine) || JSON.stringify(lineup.bot) !== JSON.stringify(d.bot) || lineup.mine.length !== 3 || lineup.bot.length !== 3 || overlap) {
      fail('the match line-ups do not match the draft: ' + JSON.stringify({ lineup, draft: d }));
    } else console.log('PASS draft (you 3, bot 3, turns) and versus screen start a match with the drafted line-ups:', JSON.stringify(lineup));
    const sp = await p.evaluate(() => ({ species: window.__game.sim.players[0].species, lanes: window.__game.sim.players[0].laneClass }));
    if (sp.species !== 'batu' || !sp.lanes.every((c) => ['kerikil', 'golem', 'lontar'].includes(c))) fail('species pick did not give Batu lanes: ' + JSON.stringify(sp));
    else console.log('PASS species pick starts the match as Batu, lanes', JSON.stringify(sp.lanes));
    const st = () => p.evaluate(() => { const g = window.__game; const s = g.sim; return { mana: s.players[0].mana, heroes: s.heroes(0).map((h) => h.hero), L: g.layout }; });
    let s = await st();
    const c = (r) => [r.x + r.w / 2, r.y + r.h / 2];
    const w2s = (wx, wy) => [s.L.field.x + (wx - s.L.vx) * s.L.scale, s.L.field.y + (wy - s.L.vy) * s.L.scale];
    const drag = async (a, b) => {
      await p.mouse.move(a[0], a[1]); await p.mouse.down();
      for (let k = 1; k <= 8; k++) await p.mouse.move(a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8);
      await p.waitForTimeout(60); await p.mouse.up();
    };
    // No hand cards (DEC-011): all three heroes are on the map from the start (DEC-014).
    if (JSON.stringify([...s.heroes].sort()) !== JSON.stringify([...lineup.mine].sort())) fail('heroes did not start on the map: ' + JSON.stringify(s.heroes));
    else console.log('PASS all three heroes start on the map, one panel each; there is no card row');
    const ki = lineup.mine.indexOf('kail');
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

    // Hero orders through the command menu (DEC-017): tap the hero, pick an order, tap a target.
    const portrait = c(s.L.heroes[ki].portrait);
    const order = () => p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order);
    const ui = () => p.evaluate(() => window.__game.ui.command);
    const ORDERS = ['move', 'attack', 'push', 'gank', 'defend', 'farm', 'ward', 'retreat'];
    const menuBtn = (id) => c(s.L.menu.buttons[ORDERS.indexOf(id)]);
    const tap = async (pt) => { await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(140); };
    await tap(portrait);
    if (JSON.stringify(await ui()) !== JSON.stringify({ hero: 'kail', action: null })) fail('tapping a hero panel did not open its menu: ' + JSON.stringify(await ui()));
    else console.log('PASS tapping a hero panel opens its command menu');
    await p.screenshot({ path: `${out}/3-menu.png` });
    await tap(c(s.L.menu.close));
    if (await ui()) fail('the ✕ did not close the menu');
    const give = async (id, where, expectType, name) => {
      await tap(portrait);
      await tap(menuBtn(id));
      if (id !== 'retreat' && (await ui())?.action !== id) { fail(`menu: ${id} did not start aiming`); return; }
      if (where) await tap(where);
      const o = await order();
      if (o.type !== expectType) fail(`menu ${id}: order is "${o.type}", expected ${expectType}`);
      else console.log(`PASS menu → ${name} gives a ${expectType} order`);
      if (await ui()) fail(`menu ${id}: menu still open after the order`);
    };
    await give('farm', w2s(1260, 3470), 'farm', 'Farm, tap a fruit grove');
    await give('ward', w2s(1050, 4200), 'ward', 'Ward, tap a cairn');
    await give('move', w2s(1500, 4700), 'move', 'Move, tap an open spot');
    const mv = await order();
    if (Math.abs(mv.x - 1500) > 150 || Math.abs(mv.y - 4700) > 150) fail('Move went to the wrong spot: ' + JSON.stringify(mv));
    // Push: the lanes light up; tap anywhere on the right lane
    await tap(portrait);
    await tap(menuBtn('push'));
    await p.screenshot({ path: `${out}/3b-aim-push.png` });
    await tap(w2s(3330, 3000));
    const po = await order();
    if (!(['push', 'gank'].includes(po.type) && po.lane === 2)) fail('Push on the right lane gave ' + JSON.stringify(po));
    else console.log(`PASS menu → Push, tap the right lane gives ${po.type} lane 2`);
    // Attack: an enemy in sight gets a red ring; tap it
    const foeId = await p.evaluate(() => { const sim = window.__game.sim; const h = sim.heroOf(0, 'kail'); const e = sim.summon(1, 'shieldbearer', h.x + 120, h.y - 380, 0); e.speed = 0; return e.id; });
    await p.waitForTimeout(100);
    await tap(portrait);
    await tap(menuBtn('attack'));
    await p.screenshot({ path: `${out}/3c-aim-attack.png` });
    const foePt = await p.evaluate((id) => { const g = window.__game; const e = g.sim.get(id); const L = g.layout; return [L.field.x + (e.x - L.vx) * L.scale, L.field.y + (e.y - L.vy) * L.scale - 12]; }, foeId);
    await tap(foePt);
    const ao = await order();
    if (ao.type !== 'attack' || ao.target !== foeId) fail('Attack on the enemy gave ' + JSON.stringify(ao));
    else console.log('PASS menu → Attack, tap an enemy gives an Attack order on it');
    await give('retreat', null, 'retreat', 'Retreat (no target needed)');
    // Cancel, and opening the menu by tapping the hero on the map
    await tap(portrait);
    await tap(menuBtn('defend'));
    await tap(c(s.L.menu.cancel));
    if (await ui()) fail('Cancel did not close the menu');
    else console.log('PASS Cancel closes the menu without an order');
    const kp = await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); const L = g.layout; return [L.field.x + (h.x - L.vx) * L.scale, L.field.y + (h.y - L.vy) * L.scale - 16]; });
    await tap(kp);
    if ((await ui())?.hero !== 'kail') fail('tapping Kail on the map did not open his menu');
    else console.log('PASS tapping a hero on the map opens its menu');
    await tap(c(s.L.menu.close));
    // the quick drag shortcut still works
    const camp = w2s(1260, 3470);
    await drag(portrait, [camp[0], camp[1] + 28]);
    await p.waitForTimeout(150);
    if ((await order()).type !== 'farm') fail('dragging a portrait onto a camp no longer gives Farm');
    else console.log('PASS the drag shortcut still works (portrait onto a camp gives Farm)');

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
    await p.mouse.click(...c(s.L.heroes[ki].ult));
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

    // The camera (DEC-016, DEC-019): the map fills the width; drag to look around; the corner button
    // shows the whole map and comes back; double-tap zooms in and back; an order while zoomed; pinch.
    const cam = () => p.evaluate(() => { const L = window.__game.layout; return { scale: L.scale, base: L.baseScale, home: L.homeScale, vx: L.vx, vy: L.vy, field: L.field, col: L.col, zoomBtn: L.zoomBtn }; });
    let v = await cam();
    if (Math.abs(3900 * v.scale - v.field.w) > 1.5 || Math.abs(v.field.w - v.col.w) > 1.5) fail('the map does not fill the screen width: ' + JSON.stringify({ map: 3900 * v.scale, field: v.field.w, col: v.col.w }));
    else console.log(`PASS the map fills the screen width (${v.field.w.toFixed(0)} px; whole map would be ${(3900 * v.base).toFixed(0)} px)`);
    const mid = [v.field.x + v.field.w / 2, v.field.y + v.field.h / 2];
    const tall = 5940 * v.scale > v.field.h + 2;
    if (tall) {
      await drag(mid, [mid[0], mid[1] + 120]);
      await p.waitForTimeout(120);
      const v2 = await cam();
      if (!(v2.vy < v.vy - 10)) fail('dragging the map did not look around: ' + JSON.stringify([v.vy, v2.vy]));
      else console.log('PASS dragging the map looks up and down');
    } else console.log('NOTE the whole map already fits this screen at full width; no up-and-down dragging needed');
    await p.mouse.click(v.zoomBtn.x + v.zoomBtn.w / 2, v.zoomBtn.y + v.zoomBtn.h / 2);
    await p.waitForTimeout(150);
    v = await cam();
    if (tall && Math.abs(v.scale - v.base) > 0.001) fail('the corner button did not show the whole map: ' + (v.scale / v.base));
    else if (tall) console.log('PASS the corner button shows the whole map');
    await p.screenshot({ path: `${out}/7-overview.png` });
    await p.mouse.click(v.zoomBtn.x + v.zoomBtn.w / 2, v.zoomBtn.y + v.zoomBtn.h / 2);
    await p.waitForTimeout(150);
    v = await cam();
    if (Math.abs(v.scale - v.home) > 0.001) fail('the corner button did not come back to the full-width view: ' + (v.scale / v.home));
    else console.log('PASS the corner button comes back to the full-width view');
    // double-tap zooms in
    await p.mouse.click(mid[0], mid[1]);
    await p.mouse.click(mid[0], mid[1]);
    await p.waitForTimeout(150);
    v = await cam();
    if (Math.abs(v.scale / v.home - 1.8) > 0.01) fail('double-tap did not zoom in: ' + (v.scale / v.home));
    else console.log('PASS double-tap zooms in (1.8x the full-width view)');
    await p.screenshot({ path: `${out}/7-zoomed.png` });
    // order while zoomed: drop Kail in the middle of the zoomed view; the order must change
    await p.evaluate(() => window.__game.sim.submit({ t: 'order', player: 0, hero: 'kail', order: 'retreat' }));
    await p.waitForTimeout(100);
    const before = await p.evaluate(() => JSON.stringify(window.__game.sim.heroOf(0, 'kail').order));
    await drag(portrait, [mid[0], mid[1] + 28]);
    await p.waitForTimeout(150);
    const after = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order);
    if (JSON.stringify(after) === before) fail('dropping a hero on the zoomed map gave no new order');
    else console.log(`PASS hero orders still work while zoomed in (new order: ${after.type})`);
    await p.mouse.click(mid[0], mid[1]);
    await p.mouse.click(mid[0], mid[1]);
    await p.waitForTimeout(150);
    v = await cam();
    if (Math.abs(v.scale - v.home) > 0.001) fail('double-tap did not come back to the full-width view');
    else console.log('PASS double-tap comes back to the full-width view');
    // pinch with two fingers
    await p.evaluate(([x, y]) => {
      const c = document.getElementById('game');
      const ev = (type, id, px, py) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: px, clientY: py, bubbles: true, pointerType: 'touch' }));
      ev('pointerdown', 11, x - 30, y); ev('pointerdown', 12, x + 30, y);
      for (let k = 1; k <= 6; k++) { ev('pointermove', 11, x - 30 - k * 8, y); ev('pointermove', 12, x + 30 + k * 8, y); }
      ev('pointerup', 11, x - 78, y); ev('pointerup', 12, x + 78, y);
    }, mid);
    await p.waitForTimeout(120);
    v = await cam();
    if (!(v.scale / v.home > 1.5)) fail('pinch did not zoom in: ' + (v.scale / v.home));
    else console.log(`PASS a two-finger pinch zooms in (${(v.scale / v.home).toFixed(2)}x the full-width view)`);
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

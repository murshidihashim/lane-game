// PLAN-001 T1/T5, PLAN-002, PLAN-003, PLAN-004 T5, PLAN-005 T3/T5, PLAN-015: opens the built game at phone size and plays it.
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
    // commander calls (DEC-024): tap two; a third replaces the older one
    await p.click('#call-eye');
    await p.click('#call-snare');
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
    const myCalls = await p.evaluate(() => window.__game.sim.players[0].calls);
    if (JSON.stringify(myCalls) !== '["eye","snare"]') fail('the commander calls picked before the match are not the match\'s: ' + JSON.stringify(myCalls));
    else console.log('PASS the two commander calls picked before the match are yours in it:', JSON.stringify(myCalls));
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

    // Hero orders through the ring (DEC-021): press a hero, slide onto an order, let go, tap a target;
    // or slide out through the order onto the target and let go there.
    const portrait = c(s.L.heroes[ki].portrait);
    const order = () => p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order);
    const ui = () => p.evaluate(() => ({ ring: window.__game.ui.ring, command: window.__game.ui.command }));
    const ORDERS = ['move', 'attack', 'push', 'gank', 'defend', 'farm', 'ward', 'retreat'];
    const slot = (id) => p.evaluate((i) => { const g = window.__game; const r = g.ui.ring; const R = g.layout.menu.ringR; const a = -Math.PI / 2 + (i * 2 * Math.PI) / 8; return [r.cx + Math.cos(a) * R, r.cy + Math.sin(a) * R]; }, ORDERS.indexOf(id));
    const tap = async (pt) => { await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(140); };
    const slideTo = async (from, to, steps = 6) => { for (let k = 1; k <= steps; k++) await p.mouse.move(from[0] + (to[0] - from[0]) * k / steps, from[1] + (to[1] - from[1]) * k / steps); };
    // press the portrait, slide onto an order's disc and let go there
    const pick = async (id) => {
      await p.mouse.move(portrait[0], portrait[1]); await p.mouse.down(); await p.waitForTimeout(80);
      await slideTo(portrait, await slot(id)); await p.waitForTimeout(40); await p.mouse.up(); await p.waitForTimeout(120);
    };
    // one gesture: press the portrait, slide onto an order, keep going onto the target, let go there
    const gesture = async (id, target) => {
      const finger = [target[0], target[1] + 28]; // the aim point sits a little above the finger
      await p.mouse.move(portrait[0], portrait[1]); await p.mouse.down(); await p.waitForTimeout(80);
      const sp = await slot(id);
      await slideTo(portrait, sp); await p.waitForTimeout(30);
      await slideTo(sp, finger, 8); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(150);
    };
    await tap(portrait);
    let u = await ui();
    if (!(u.ring && u.ring.hero === 'kail' && u.ring.sticky)) fail('a quick tap on a hero panel did not open its ring: ' + JSON.stringify(u));
    else console.log('PASS a quick tap on a hero panel opens its order ring (it stays open for a tap)');
    await p.screenshot({ path: `${out}/3-ring.png` });
    await tap([u.ring.cx, u.ring.cy]);
    if ((await ui()).ring) fail('tapping the middle of the ring did not close it');
    else console.log('PASS tapping the middle of the ring closes it');
    const give = async (id, where, expectType, name) => {
      await pick(id);
      if (id !== 'retreat' && (await ui()).command?.action !== id) { fail(`ring: sliding onto ${id} did not start aiming: ` + JSON.stringify(await ui())); return; }
      if (where) await tap(where);
      const o = await order();
      if (o.type !== expectType) fail(`ring ${id}: order is "${o.type}", expected ${expectType}`);
      else console.log(`PASS ring → slide onto ${name} gives a ${expectType} order`);
      const after = await ui();
      if (after.command || after.ring) fail(`ring ${id}: still aiming or open after the order`);
    };
    await give('farm', w2s(1260, 3470), 'farm', 'Farm, tap a fruit grove');
    await give('ward', w2s(1050, 4200), 'ward', 'Ward, tap a cairn');
    await give('move', w2s(1500, 4700), 'move', 'Move, tap an open spot');
    const mv = await order();
    if (Math.abs(mv.x - 1500) > 150 || Math.abs(mv.y - 4700) > 150) fail('Move went to the wrong spot: ' + JSON.stringify(mv));
    // Push: the lanes light up and the hint takes the lane chips' place; tap anywhere on the right lane
    await pick('push');
    const hintRow = await p.evaluate(() => { const L = window.__game.layout; return { hint: L.menu.hint.y, chips: L.waves[0].y, fieldBottom: L.field.y + L.field.h }; });
    if (hintRow.hint !== hintRow.chips || hintRow.hint < hintRow.fieldBottom) fail('the aiming hint is not in the lane-chip row: ' + JSON.stringify(hintRow));
    else console.log('PASS while aiming, the hint and Cancel sit in the lane-chip row (nothing covers the map)');
    await p.screenshot({ path: `${out}/3b-aim-push.png` });
    await tap(w2s(3330, 3000));
    const po = await order();
    if (!(['push', 'gank'].includes(po.type) && po.lane === 2)) fail('Push on the right lane gave ' + JSON.stringify(po));
    else console.log(`PASS ring → Push, tap the right lane gives ${po.type} lane 2`);
    // heroes talk back (PLAN-013): the order gets an answer in a speech bubble
    await p.waitForTimeout(150);
    const said = await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); const t = g.renderer.talk.get(h.id); return t ? { text: t.text, ago: Math.round(performance.now() - t.at) } : null; });
    if (!said || said.ago > 2500 || !/Pushing|Ganking/.test(said.text)) fail('Kail did not answer the Push order: ' + JSON.stringify(said));
    else console.log(`PASS Kail answers the order in a speech bubble ("${said.text}")`);
    await p.screenshot({ path: `${out}/3e-answer.png` });
    // Attack: an enemy in sight gets a red ring; tap it
    const foeId = await p.evaluate(() => { const sim = window.__game.sim; const h = sim.heroOf(0, 'kail'); const e = sim.summon(1, 'shieldbearer', h.x + 120, h.y - 380, 0); e.speed = 0; return e.id; });
    await p.waitForTimeout(100);
    await pick('attack');
    await p.screenshot({ path: `${out}/3c-aim-attack.png` });
    const foePt = await p.evaluate((id) => { const g = window.__game; const e = g.sim.get(id); const L = g.layout; return [L.field.x + (e.x - L.vx) * L.scale, L.field.y + (e.y - L.vy) * L.scale - 12]; }, foeId);
    await tap(foePt);
    const ao = await order();
    if (ao.type !== 'attack' || ao.target !== foeId) fail('Attack on the enemy gave ' + JSON.stringify(ao));
    else console.log('PASS ring → Attack, tap an enemy gives an Attack order on it');
    await give('retreat', null, 'retreat', 'Retreat (no target needed)');
    // one gesture: slide out through Move onto an open spot and let go there
    await gesture('move', w2s(1700, 4300));
    const g1 = await order();
    if (g1.type !== 'move' || Math.abs(g1.x - 1700) > 200 || Math.abs(g1.y - 4300) > 200) fail('one gesture through Move gave ' + JSON.stringify(g1));
    else console.log('PASS one gesture: slide out of the ring through Move and let go on the spot gives Move there');
    if ((await ui()).command) fail('one gesture: still aiming after the order');
    // tap an order on the open ring, then Cancel
    await tap(portrait);
    await tap(await slot('defend'));
    if ((await ui()).command?.action !== 'defend') fail('tapping Defend on the open ring did not start aiming');
    await tap(c(s.L.menu.cancel));
    if ((await ui()).command) fail('Cancel did not stop aiming');
    else console.log('PASS tap an order on the open ring, then Cancel stops aiming without an order');
    // your hero on the map: a quick tap opens the ring; a hold opens it round the finger
    const kp = await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); const L = g.layout; return [L.field.x + (h.x - L.vx) * L.scale, L.field.y + (h.y - L.vy) * L.scale - 16]; });
    await tap(kp);
    u = await ui();
    if (!(u.ring && u.ring.hero === 'kail')) fail('tapping Kail on the map did not open his ring');
    else console.log('PASS a quick tap on a hero on the map opens its ring');
    await tap([u.ring.cx, u.ring.cy]);
    await p.mouse.move(kp[0], kp[1]); await p.mouse.down(); await p.waitForTimeout(320);
    u = await ui();
    if (!(u.ring && !u.ring.pending)) fail('holding Kail on the map did not open his ring: ' + JSON.stringify(u));
    else console.log('PASS holding a hero on the map opens its ring round the finger');
    await p.screenshot({ path: `${out}/3d-ring-map.png` });
    await p.mouse.up(); await p.waitForTimeout(100);
    u = await ui();
    if (!(u.ring && u.ring.sticky)) fail('letting go without choosing did not leave the ring open for a tap');
    await tap([u.ring.cx, u.ring.cy]);
    if ((await ui()).ring) fail('tapping the middle of the ring did not close it');
    else console.log('PASS letting go without choosing leaves the ring open; tapping its middle closes it');

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
    // a spot on the map with none of your heroes under it (tapping your own hero opens its ring instead)
    const clearSpot = () => p.evaluate(() => {
      const g = window.__game; const L = g.layout; let best = null; let bestD = -1;
      const heroes = g.sim.heroes(0).filter((h) => h.alive).map((h) => [L.field.x + (h.x - L.vx) * L.scale, L.field.y + (h.y - L.vy) * L.scale - 16]);
      for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) {
        const x = L.field.x + (L.field.w * i) / 6; const y = L.field.y + (L.field.h * j) / 6;
        const d = Math.min(...heroes.map(([hx, hy]) => Math.hypot(hx - x, hy - y)), 999);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
      return best;
    });
    // double-tap zooms in
    let spot = await clearSpot();
    await p.mouse.click(spot[0], spot[1]);
    await p.mouse.click(spot[0], spot[1]);
    await p.waitForTimeout(150);
    v = await cam();
    if (Math.abs(v.scale / v.home - 1.8) > 0.01) fail('double-tap did not zoom in: ' + (v.scale / v.home));
    else console.log('PASS double-tap zooms in (1.8x the full-width view)');
    await p.screenshot({ path: `${out}/7-zoomed.png` });
    // order while zoomed: drop Kail in the middle of the zoomed view; the order must change
    await p.evaluate(() => window.__game.sim.submit({ t: 'order', player: 0, hero: 'kail', order: 'retreat' }));
    await p.waitForTimeout(100);
    const before = await p.evaluate(() => JSON.stringify(window.__game.sim.heroOf(0, 'kail').order));
    await gesture('move', [mid[0], mid[1]]);
    const after = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').order);
    if (JSON.stringify(after) === before) fail('an order through the ring on the zoomed map gave no new order');
    else console.log(`PASS hero orders still work while zoomed in (new order: ${after.type})`);
    spot = await clearSpot();
    await p.mouse.click(spot[0], spot[1]);
    await p.mouse.click(spot[0], spot[1]);
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
    // a hero off the screen gets a tab at the map's edge; tapping it looks there (PLAN-013)
    await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); g.sim.place(h, h.x, h.y < 3470 ? Math.min(h.y, 1800) : Math.max(h.y, 5200)); g.setView({ zoom: g.base.homeScale / g.base.baseScale, cx: 1950, cy: h.y < 3470 ? 6440 : 500 }); });
    await p.waitForTimeout(200);
    const kt = (await p.evaluate(() => window.__game.renderer.offscreen)).find((t) => t.hero === 'kail');
    if (!kt) fail('no edge tab for Kail when he is off the screen: ' + JSON.stringify(await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); return { alive: h.alive, x: h.x, y: h.y, vy: g.layout.vy, tabs: g.renderer.offscreen }; })));
    else {
      await p.screenshot({ path: `${out}/8-edge-tab.png` });
      await p.mouse.click(kt.x, kt.y);
      await p.waitForTimeout(200);
      const onScreen = await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); const L = g.layout; const y = L.field.y + (h.y - L.vy) * L.scale; return y > L.field.y && y < L.field.y + L.field.h; });
      if (!onScreen) fail('tapping Kail\'s edge tab did not bring him into view: ' + JSON.stringify({ tab: kt, now: await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); return { x: h.x, y: h.y, alive: h.alive, vy: g.layout.vy, scale: g.layout.scale, ring: g.ui.ring, heroes: g.sim.heroes(0).map((e) => [e.hero, e.x, e.y]) }; }) }));
      else console.log('PASS an off-screen hero has a tab at the map\'s edge; tapping it scrolls to him');
    }
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
  // 4. Strategy and action (PLAN-015, DEC-024): drag ULT to aim, its warning ring, flick to dash, the
  //    Power gem, hold and release a lane, a level-up choice, and commander calls.
  {
    const { p, errors } = await page(browser, '?seed=9&nohelp=1&picks=embun,kail,pendekar&calls=drum,eye');
    await p.waitForFunction(() => window.__game && window.__game.sim.tick > 40, null, { timeout: 30_000 });
    const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2];
    const lay = () => p.evaluate(() => { const l = window.__game.layout; return { heroes: l.heroes, holds: l.holds, calls: l.calls, field: l.field }; });
    const heroAt = (k) => p.evaluate((kind) => { const g = window.__game; const h = g.sim.heroOf(0, kind); const L = g.layout; return [L.field.x + (h.x - L.vx) * L.scale, L.field.y + (h.y - L.vy) * L.scale]; }, k);
    await p.evaluate(() => {
      const g = window.__game; const sim = g.sim;
      g.setRunning(false);
      for (let i = 0; i < 400; i++) sim.step();
      const e = sim.heroOf(0, 'embun'); sim.giveXp(e, 999); e.ultArmed = false; e.ultReady = true;
      g.setView({ zoom: g.base.homeScale / g.base.baseScale, cx: e.x, cy: e.y - 150 });
      g.setRunning(true);
    });
    let L = await lay();
    // a. drag Embun's ULT button up onto the map: Dawn Freeze is aimed there, behind a warning ring
    const [ux, uy] = mid(L.heroes[0].ult);
    const [ex, ey] = await heroAt('embun');
    await p.mouse.move(ux, uy); await p.mouse.down();
    for (let k = 1; k <= 8; k++) await p.mouse.move(ux + (ex - ux) * k / 8, uy + (ey - 140 - uy) * k / 8);
    await p.waitForTimeout(120);
    await p.screenshot({ path: `${out}/9a-ult-aim.png` });
    await p.mouse.up();
    await p.waitForTimeout(120);
    await p.screenshot({ path: `${out}/9b-warning-ring.png` });
    const aimed = await p.evaluate(() => ({ ready: window.__game.sim.heroOf(0, 'embun').ultReady, ring: window.__game.sim.casts.some((c) => c.hero === 'embun') || window.__game.sim.events.some((e) => e.k === 'ult') }));
    if (aimed.ready) fail('dragging ULT onto the map did not aim and fire the ultimate');
    else console.log('PASS dragging ULT onto the map aims Dawn Freeze there (warning ring first)');
    // b. flick Kail on the map: he dashes
    await p.evaluate(() => { const g = window.__game; const h = g.sim.heroOf(0, 'kail'); g.setView({ zoom: g.base.homeScale / g.base.baseScale, cx: h.x, cy: h.y - 100 }); });
    await p.waitForTimeout(60);
    const [kx, ky] = await heroAt('kail');
    // a finger's flick is quick: send its touch events in one go (a slow test machine can't stretch it)
    const flickMs = await p.evaluate(([x, y]) => {
      const cv = document.querySelector('canvas');
      const r = cv.getBoundingClientRect();
      const ev = (type, dx) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: r.left + x + dx, clientY: r.top + y }));
      const t0 = performance.now();
      ev('pointerdown', 0); ev('pointermove', 20); ev('pointermove', 45); ev('pointermove', 70); ev('pointerup', 70);
      return Math.round(performance.now() - t0);
    }, [kx, ky - 16]);
    await p.waitForTimeout(150);
    const dashed = await p.evaluate(() => window.__game.sim.heroes(0).filter((h) => h.dashCd > 0).map((h) => h.hero));
    if (!dashed.length) fail(`a flick on a hero did not make it dash (${flickMs} ms)`);
    else console.log(`PASS a quick flick on a hero makes it dash (${dashed.join(', ')}, ${flickMs} ms)`);
    // c. the Power gem: Kail's Hook on cue
    await p.evaluate(() => { const sim = window.__game.sim; const h = sim.heroOf(0, 'kail'); sim.summon(1, 'shieldbearer', h.x, h.y - 450, 1); h.powerCd = 0; h.powerWait = 60; });
    L = await lay();
    await p.mouse.click(...mid(L.heroes[1].power));
    await p.waitForTimeout(150);
    const hooked = await p.evaluate(() => window.__game.sim.heroOf(0, 'kail').powerCd);
    if (!(hooked > 0)) fail('tapping the Power gem did not fire Kail\'s Hook');
    else console.log('PASS tapping a hero\'s Power gem fires the Power on cue');
    // d. hold and release the left lane
    await p.mouse.click(...mid(L.holds[0]));
    await p.waitForTimeout(120);
    const held = await p.evaluate(() => window.__game.sim.players[0].hold[0]);
    await p.screenshot({ path: `${out}/9c-hold.png` });
    await p.mouse.click(...mid(L.holds[0]));
    await p.waitForTimeout(120);
    const released = await p.evaluate(() => !window.__game.sim.players[0].hold[0]);
    if (!held || !released) fail('the left chip\'s hold toggle did not hold and release the lane: ' + JSON.stringify({ held, released }));
    else console.log('PASS a wave chip\'s HOLD toggle holds that lane\'s waves, and GO releases them');
    // e. a level-up choice: tap the badge, then Quick
    await p.evaluate(() => { const h = window.__game.sim.heroOf(0, 'pendekar'); h.level = Math.max(2, h.level); h.upg = [-1, -1]; h.choiceAt = 0; });
    await p.waitForTimeout(150);
    await p.mouse.click(...mid(L.heroes[2].badge));
    await p.waitForTimeout(120);
    await p.screenshot({ path: `${out}/9d-choice.png` });
    const card = await p.evaluate(() => { const g = window.__game; const l = g.layout; const h = 92; const box = { x: l.col.x + 8, y: l.waves[0].y - 8 - h, w: l.col.w - 16, h }; const ow = (box.w - 18) / 2; return [box.x + 12 + ow + ow / 2, box.y + 26 + (h - 32) / 2]; });
    await p.mouse.click(card[0], card[1]);
    await p.waitForTimeout(150);
    const upg = await p.evaluate(() => window.__game.sim.heroOf(0, 'pendekar').upg[0]);
    if (upg !== 1) fail('the upgrade card did not give Pendekar the Quick upgrade: ' + upg);
    else console.log('PASS the level badge opens the upgrade card; tapping Quick picks it');
    // f. commander calls: War Drum at once; Spirit Eye on a tapped spot
    await p.evaluate(() => { window.__game.sim.players[0].mana = 12 * 160; });
    await p.mouse.click(...mid(L.calls[0]));
    await p.waitForTimeout(120);
    await p.mouse.click(...mid(L.calls[1]));
    await p.waitForTimeout(80);
    await p.screenshot({ path: `${out}/9e-call-aim.png` });
    await p.mouse.click(L.field.x + L.field.w / 2, L.field.y + 80);
    await p.waitForTimeout(150);
    const calls = await p.evaluate(() => ({ cd: window.__game.sim.players[0].callCd, eye: window.__game.sim.zones.some((z) => z.kind === 'eye' && z.owner === 0) }));
    await p.screenshot({ path: `${out}/9f-calls.png` });
    if (!(calls.cd[0] > 0) || !calls.eye) fail('commander calls did not work: ' + JSON.stringify(calls));
    else console.log('PASS commander calls: War Drum fires at once; Spirit Eye goes where you tap');
    if (errors.length) fail('page errors: ' + errors.join(' | '));
  }
  await browser.close();
  console.log(process.exitCode ? 'PHONE CHECK FAILED' : 'PHONE CHECK OK');
})();

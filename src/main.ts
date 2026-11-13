// Entry point: reads test settings from the URL, wires the menus and starts the game.
// URL options (for testing): ?lanes=2|3 &speed=1|1.5|2 &bot=easy|normal &seed=123 &autoplay=1 &nohelp=1
//   &picks=kail,seri,rimba (your three heroes; with nohelp the species and draft screens are skipped)
//   &species=batu &calls=eye,snare (two commander calls) &fast=1 (short bot thinking and versus screen, for automated checks)
import type { BotLevel } from './game/bot';
import { LANES } from './game/map';
import { CALLS, HEROES, HERO_RULES, ITEMS, ITEM_IDS, ITEM_SLOTS, MANA, SPECIES, TICKS_PER_SECOND, type CallId, type HeroKind, type SpeciesId } from './game/rules';
import { DEFAULT_CALLS, DEFAULT_PICKS } from './game/sim';
import { type DraftSnapshot, PickFlow } from './ui/draft';
import { Game, type Settings } from './ui/game';

const params = new URLSearchParams(location.search);
const STORE = 'lane-game-settings';

function loadSettings(): Settings {
  const s: Settings = { lanes: 3, speed: 1, bot: 'normal' };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}') as Partial<Settings>;
    if (saved.lanes === 2 || saved.lanes === 3) s.lanes = saved.lanes;
    if (saved.speed === 1 || saved.speed === 1.5 || saved.speed === 2) s.speed = saved.speed;
    if (saved.bot === 'easy' || saved.bot === 'normal') s.bot = saved.bot;
  } catch {
    // Storage can be unavailable (private mode, previews); defaults are fine.
  }
  const lanes = params.get('lanes');
  if (lanes === '2' || lanes === '3') s.lanes = Number(lanes) as 2 | 3;
  const speed = Number(params.get('speed'));
  if (speed > 0 && speed <= 50) s.speed = speed;
  const bot = params.get('bot');
  if (bot === 'easy' || bot === 'normal') s.bot = bot as BotLevel;
  return s;
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    // Not critical: settings just won't be remembered.
  }
}

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
};
const help = $('help');
const settingsEl = $('settings');
const result = $('result');
const show = (el: HTMLElement, on: boolean) => el.classList.toggle('show', on);

const seedParam = params.get('seed');
const game = new Game($('game') as HTMLCanvasElement, loadSettings(), {
  seed: seedParam ? Number(seedParam) >>> 0 : undefined,
  autoplay: params.get('autoplay') === '1',
  onResult: (g) => showResult(g),
});

// ---------- species, draft and versus (DEC-014, DEC-015) ----------

const PICKS_STORE = 'lane-game-picks';
const SPECIES_STORE = 'lane-game-species';
const CALLS_STORE = 'lane-game-calls';

/** Your two commander calls (DEC-024) from the URL (&calls=eye,snare) or the last match, else the defaults. */
function loadCalls(): CallId[] {
  let list: string[] = (params.get('calls') ?? '').split(',');
  if (!list.some((k) => k in CALLS)) {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(CALLS_STORE) ?? '[]');
      list = Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      list = []; // ignore: defaults below
    }
  }
  const out = [...new Set(list.filter((k): k is CallId => k in CALLS))].slice(0, 2);
  for (const k of DEFAULT_CALLS) if (out.length < 2 && !out.includes(k)) out.push(k);
  return out;
}

function loadSpecies(): SpeciesId {
  const fromUrl = params.get('species');
  if (fromUrl && fromUrl in SPECIES) return fromUrl as SpeciesId;
  try {
    const saved = localStorage.getItem(SPECIES_STORE);
    if (saved && saved in SPECIES) return saved as SpeciesId;
  } catch {
    // ignore: default below
  }
  return 'kampung';
}

/** Your heroes from the URL or the last draft: up to 3 valid ones, topped up with the defaults. */
function loadPicks(): HeroKind[] {
  let list: string[] = (params.get('picks') ?? '').split(',');
  if (!list.some((k) => k in HEROES)) {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(PICKS_STORE) ?? '[]');
      list = Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : [];
    } catch {
      list = []; // ignore: defaults below
    }
  }
  const out = [...new Set(list.filter((k): k is HeroKind => k in HEROES))].slice(0, HERO_RULES.heroesPerPlayer);
  for (const k of DEFAULT_PICKS) if (out.length < HERO_RULES.heroesPerPlayer && !out.includes(k)) out.push(k);
  return out;
}

const flow = new PickFlow({
  fast: params.get('fast') === '1',
  onLocked: (l) => {
    game.picks = [...l.mine];
    game.botPicks = [...l.bot];
    game.species = l.species;
    game.calls = [...l.calls];
    try {
      localStorage.setItem(PICKS_STORE, JSON.stringify(l.mine));
      localStorage.setItem(SPECIES_STORE, l.species);
      localStorage.setItem(CALLS_STORE, JSON.stringify(l.calls));
    } catch { /* not critical */ }
    game.newMatch();
    const pl = game.sim.players;
    return { mine: pl[0].picks, bot: pl[1].picks, mySpecies: pl[0].species, botSpecies: pl[1].species };
  },
  onStart: () => game.setRunning(true),
});

function openDraft(): void {
  game.setRunning(false);
  flow.open(game.species, game.picks, game.calls);
}

game.picks = loadPicks();
game.species = loadSpecies();
game.calls = loadCalls();
game.newMatch();

function refreshSettings(): void {
  for (const group of settingsEl.querySelectorAll<HTMLElement>('[data-group]')) {
    const key = group.dataset.group as keyof Settings;
    for (const b of group.querySelectorAll<HTMLButtonElement>('button')) b.classList.toggle('on', String(game.settings[key]) === b.dataset.value);
  }
}

function openSettings(): void {
  refreshSettings();
  game.setRunning(false);
  show(settingsEl, true);
}

function showResult(g: Game): void {
  const r = g.sim.result;
  if (!r) return;
  const title = r.winner === 0 ? 'Victory!' : r.winner === 1 ? 'Defeat' : 'Draw';
  const why = { core: 'Core destroyed', towers: 'More towers destroyed when time ran out', sudden: 'Tower destroyed in sudden death', draw: 'No winner after sudden death' }[r.reason];
  $('result-title').textContent = title;
  $('result-title').style.color = r.winner === 0 ? '#7cc4ff' : r.winner === 1 ? '#ff8a80' : '#ffd166';
  $('result-sub').textContent = why;
  const secs = Math.floor(g.sim.tick / TICKS_PER_SECOND);
  const heroes = (p: 0 | 1) => g.sim.players[p].picks.map((k) => {
    const h = g.sim.heroOf(p, k);
    return h ? `${HEROES[k].name} Lv${h.level}${h.items.length ? ` (${h.items.map((i) => ITEMS[i].name).join(', ')})` : ''}` : HEROES[k].name;
  }).join('; ');
  const rows: [string, string][] = [
    ['Towers you destroyed', String(g.sim.players[0].towersDestroyed)],
    ['Towers the bot destroyed', String(g.sim.players[1].towersDestroyed)],
    ['Match time', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
    ['Your people', SPECIES[g.sim.players[0].species].name],
    ['Bot people', SPECIES[g.sim.players[1].species].name],
    ['Your heroes', heroes(0)],
    ['Bot heroes', heroes(1)],
    ['Lanes', `${g.settings.lanes} (${g.sim.lanes.map((id) => LANES[id].name).join(', ')})`],
    ['Match seed', String(g.sim.seed)],
  ];
  const table = $('result-table');
  table.replaceChildren(...rows.map(([a, b]) => {
    const tr = document.createElement('tr');
    const ta = document.createElement('td');
    const tb = document.createElement('td');
    ta.textContent = a;
    tb.textContent = b;
    tr.append(ta, tb);
    return tr;
  }));
  game.setRunning(false);
  closeShop();
  show(result, true);
}

document.addEventListener('open-settings', openSettings);

// ---------- shop (DEC-011): the match keeps running while it is open ----------

const shopEl = $('shop');
let shopHero: HeroKind = 'rimba';

function refreshShop(): void {
  const sim = game.sim;
  const picks = sim.players[0].picks;
  if (!picks.includes(shopHero)) shopHero = picks[0];
  $('shop-sem').textContent = `${Math.floor(sim.manaOf(0) / MANA.perMana)} ${MANA.name}${sim.players[0].halfPrice ? ' · next item half price' : ''}`;
  $('shop-tabs').replaceChildren(...picks.map((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.shopHero = k;
    b.className = k === shopHero ? 'on' : '';
    const h = sim.heroOf(0, k);
    b.textContent = `${HEROES[k].name} ${h ? h.items.length : 0}/${ITEM_SLOTS}`;
    return b;
  }));
  const h = sim.heroOf(0, shopHero);
  $('shop-items').replaceChildren(...ITEM_IDS.map((id) => {
    const d = ITEMS[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `item-${id}`;
    b.dataset.item = id;
    const own = !!h?.items.includes(id);
    b.className = `item${own ? ' own' : sim.cantBuy(0, shopHero, id) ? ' no' : ''}`;
    const c = document.createElement('span');
    c.className = 'c';
    c.textContent = own ? 'owned' : String(sim.itemCost(0, id));
    const n = document.createElement('b');
    n.textContent = d.name;
    b.append(c, n, document.createTextNode(d.text));
    return b;
  }));
}

let shopTimer = 0;
function openShop(hero: HeroKind): void {
  shopHero = hero;
  $('shop-msg').textContent = '';
  refreshShop();
  show(shopEl, true);
  window.clearInterval(shopTimer);
  shopTimer = window.setInterval(() => { if (shopEl.classList.contains('show')) refreshShop(); }, 300);
}

function closeShop(): void {
  show(shopEl, false);
  window.clearInterval(shopTimer);
}

document.addEventListener('open-shop', (ev) => openShop((ev as CustomEvent<HeroKind>).detail));
shopEl.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const tab = t.closest<HTMLButtonElement>('[data-shop-hero]');
  if (tab) { shopHero = tab.dataset.shopHero as HeroKind; refreshShop(); return; }
  const item = t.closest<HTMLButtonElement>('[data-item]');
  if (item) {
    $('shop-msg').textContent = game.buy(shopHero, item.dataset.item as keyof typeof ITEMS);
    window.setTimeout(refreshShop, 120);
  }
});

document.body.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest('button');
  if (!btn) return;
  const group = btn.parentElement?.dataset.group;
  if (group) {
    const s = { ...game.settings };
    const v = btn.dataset.value ?? '';
    let restart = false;
    if (group === 'lanes') { restart = s.lanes !== Number(v); s.lanes = Number(v) as 2 | 3; }
    if (group === 'speed') s.speed = Number(v);
    if (group === 'bot') { restart = s.bot !== v; s.bot = v as BotLevel; }
    game.settings = s;
    saveSettings(s);
    if (restart) game.newMatch();
    refreshSettings();
    return;
  }
  switch (btn.dataset.action) {
    case 'shop-close':
      closeShop();
      break;
    case 'start':
      show(help, false);
      openDraft();
      break;
    case 'change-heroes':
      show(result, false);
      show(settingsEl, false);
      openDraft();
      break;
    case 'help':
      show(settingsEl, false);
      show(help, true);
      break;
    case 'restart':
      game.newMatch();
      show(settingsEl, false);
      game.setRunning(true);
      break;
    case 'close':
      show(settingsEl, false);
      if (!game.sim.result) game.setRunning(true);
      else show(result, true);
      break;
    case 'settings':
      show(result, false);
      openSettings();
      break;
    case 'rematch':
      show(result, false);
      game.newMatch();
      game.setRunning(true);
      break;
  }
});

if (params.get('nohelp') === '1') game.setRunning(true);
else show(help, true);

// Exposed for automated browser checks and for reporting a match seed in bug reports.
(window as unknown as { __game: Game }).__game = game;
Object.defineProperty(window, '__draft', { get: (): DraftSnapshot => flow.snapshot() });

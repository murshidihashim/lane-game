// Entry point: reads test settings from the URL, wires the menus and starts the game.
// URL options (for testing): ?lanes=2|3 &speed=1|1.5|2 &bot=easy|normal &seed=123 &autoplay=1 &nohelp=1
//   &picks=kail,seri (your two heroes; with nohelp the pick screen is skipped)
import type { BotLevel } from './game/bot';
import { LANES } from './game/map';
import { HEROES, HERO_IDS, TICKS_PER_SECOND, type HeroKind } from './game/rules';
import { randomPicks } from './game/sim';
import { ORDER_COLORS } from './ui/render';
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
const pick = $('pick');
const settingsEl = $('settings');
const result = $('result');
const show = (el: HTMLElement, on: boolean) => el.classList.toggle('show', on);

const seedParam = params.get('seed');
const game = new Game($('game') as HTMLCanvasElement, loadSettings(), {
  seed: seedParam ? Number(seedParam) >>> 0 : undefined,
  autoplay: params.get('autoplay') === '1',
  onResult: (g) => showResult(g),
});

// ---------- hero picks ----------

const PICKS_STORE = 'lane-game-picks';
let chosen: HeroKind[] = [];
let shown: HeroKind = HERO_IDS[0];

function loadPicks(): HeroKind[] {
  const fromUrl = (params.get('picks') ?? '').split(',').filter((k): k is HeroKind => k in HEROES);
  if (fromUrl.length) return [...new Set(fromUrl)].slice(0, 2);
  try {
    const saved = JSON.parse(localStorage.getItem(PICKS_STORE) ?? '[]') as string[];
    const ok = saved.filter((k): k is HeroKind => k in HEROES);
    if (ok.length === 2) return ok;
  } catch {
    // ignore: defaults below
  }
  return ['rimba', 'benteng'];
}

function buildPickGrid(): void {
  const grid = $('pick-grid');
  grid.replaceChildren(...HERO_IDS.map((id) => {
    const d = HEROES[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.id = `pick-${id}`;
    b.dataset.hero = id;
    b.style.setProperty('--ring', ORDER_COLORS[d.best]);
    b.innerHTML = `<span class="cs"></span><span class="sig"></span><span class="nm"></span><span class="rl"></span>`;
    (b.querySelector('.cs') as HTMLElement).textContent = String(d.cost);
    (b.querySelector('.sig') as HTMLElement).textContent = d.code;
    (b.querySelector('.nm') as HTMLElement).textContent = d.name;
    (b.querySelector('.rl') as HTMLElement).textContent = d.role;
    return b;
  }));
}

function refreshPick(): void {
  for (const b of $('pick-grid').querySelectorAll<HTMLButtonElement>('.tile')) {
    const id = b.dataset.hero as HeroKind;
    const i = chosen.indexOf(id);
    b.classList.toggle('sel', i >= 0);
    b.querySelector('.n')?.remove();
    if (i >= 0) {
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(i + 1);
      b.append(n);
    }
  }
  const d = HEROES[shown];
  const det = $('pick-detail');
  const line = (label: string, name: string, when: string, text: string) => {
    const p = document.createElement('p');
    const b = document.createElement('b');
    b.textContent = `${label} · ${name}`;
    p.append(b, document.createTextNode(when ? ` (${when}). ${text}` : `. ${text}`));
    return p;
  };
  const h = document.createElement('h3');
  h.textContent = `${d.name}, ${d.title}`;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${d.role} · best order: ${d.best} · costs ${d.cost} · ${d.range >= 300 ? 'ranged' : 'melee'}${d.flying ? ', flies' : ''}`;
  const vs = document.createElement('p');
  vs.textContent = `Strong vs ${d.strong}. Weak vs ${d.weak}.`;
  det.replaceChildren(h, meta, line('Trait', d.trait.name, '', d.trait.text), line('Power', d.power.name, d.power.when, d.power.text), line('Ultimate, level 4', d.ult.name, d.ult.when, d.ult.text), vs);
  const go = $('pick-go') as HTMLButtonElement;
  go.disabled = chosen.length !== 2;
  go.textContent = chosen.length === 2 ? `Start with ${HEROES[chosen[0]].name} + ${HEROES[chosen[1]].name}` : `Pick ${2 - chosen.length} more`;
}

function openPick(): void {
  game.setRunning(false);
  chosen = [...game.picks];
  shown = chosen[0] ?? HERO_IDS[0];
  refreshPick();
  show(pick, true);
}

function startWithPicks(): void {
  if (chosen.length !== 2) return;
  game.picks = [...chosen];
  try { localStorage.setItem(PICKS_STORE, JSON.stringify(chosen)); } catch { /* not critical */ }
  show(pick, false);
  game.newMatch();
  game.setRunning(true);
}

$('pick-grid').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('.tile');
  if (!b) return;
  const id = b.dataset.hero as HeroKind;
  shown = id;
  const i = chosen.indexOf(id);
  if (i >= 0) chosen.splice(i, 1);
  else {
    // Your picks are the last two heroes you tapped.
    if (chosen.length >= 2) chosen.shift();
    chosen.push(id);
  }
  refreshPick();
});

buildPickGrid();
game.picks = loadPicks();
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
  const heroes = (p: 0 | 1) => g.sim.players[p].picks.map((k) => { const h = g.sim.heroOf(p, k); return `${HEROES[k].name} ${h ? `Lv${h.level}` : '(not played)'}`; }).join(', ');
  const rows: [string, string][] = [
    ['Towers you destroyed', String(g.sim.players[0].towersDestroyed)],
    ['Towers the bot destroyed', String(g.sim.players[1].towersDestroyed)],
    ['Match time', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
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
  show(result, true);
}

document.addEventListener('open-settings', openSettings);

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
    case 'start':
      show(help, false);
      openPick();
      break;
    case 'go':
      startWithPicks();
      break;
    case 'random-picks':
      chosen = randomPicks((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
      shown = chosen[0];
      refreshPick();
      break;
    case 'change-heroes':
      show(result, false);
      show(settingsEl, false);
      openPick();
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

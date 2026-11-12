// Entry point: reads test settings from the URL, wires the menus and starts the game.
// URL options (for testing): ?lanes=2|3 &speed=1|1.5|2 &bot=easy|normal &seed=123 &autoplay=1 &nohelp=1
import type { BotLevel } from './game/bot';
import { LANES } from './game/map';
import { TICKS_PER_SECOND } from './game/rules';
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
  const heroes = (p: 0 | 1) => (['ranger', 'warden'] as const).map((k) => { const h = g.sim.heroOf(p, k); return h ? `${k === 'ranger' ? 'Ranger' : 'Warden'} Lv${h.level}` : null; }).filter(Boolean).join(', ') || 'none played';
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
      game.setRunning(true);
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

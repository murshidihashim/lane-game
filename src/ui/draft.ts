// Hero selection (DEC-014, DEC-015): choose your people (species), then a draft against the bot
// on a lamp-lit stage, then a versus screen before the match. Original Hikayat look: night, oil-lamp
// light, songket gold, parchment labels. Screens only; the rules see just the final line-ups.
import { CLASSES, HEROES, HERO_IDS, HERO_RULES, SPECIES, SPECIES_IDS, type HeroKind, type SpeciesId } from '../game/rules';
import { DRAFT_ORDER, type Player, botDraftPick } from '../game/sim';
import { PAL, SPECIES_COLORS } from './art';
import { drawHeroFigure, drawPortrait, drawTroopFigure, heroScale } from './figures';
import { ORDER_COLORS } from './render';

/** What the draft decided. */
export interface Lineups { species: SpeciesId; mine: HeroKind[]; bot: HeroKind[] }

/** What the versus screen shows: the match as it will actually be played. */
export interface VersusInfo { mine: HeroKind[]; bot: HeroKind[]; mySpecies: SpeciesId; botSpecies: SpeciesId }

/** Plain draft state, readable by automated checks. */
export interface DraftSnapshot {
  step: 'closed' | 'species' | 'draft' | 'versus';
  turn: number;
  whose: Player | null;
  mine: HeroKind[];
  bot: HeroKind[];
  highlighted: HeroKind;
}

type Tab = 'trait' | 'power' | 'ult' | 'vs';

const TAU = Math.PI * 2;
const ease = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
const dprNow = () => Math.min(3, window.devicePixelRatio || 1);

const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};

/** A small drawn picture (portrait or troop figure) in its own canvas. */
function picture(size: number, cls: string, paint: (ctx: CanvasRenderingContext2D, dpr: number) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.className = cls;
  repaint(cv, size, paint);
  return cv;
}

function repaint(cv: HTMLCanvasElement, size: number, paint: (ctx: CanvasRenderingContext2D, dpr: number) => void): void {
  const dpr = dprNow();
  cv.width = Math.round(size * dpr);
  cv.height = Math.round(size * dpr);
  cv.style.width = `${size}px`;
  cv.style.height = `${size}px`;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint(ctx, dpr);
}

/** Size a canvas to its box on screen; returns its context (CSS px) and size. */
function fitCanvas(cv: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number; dpr: number } | null {
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  const dpr = dprNow();
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

/** The oil-lamp night backdrop shared by the stage and the versus screen. */
function lampLight(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number, strength = 1): void {
  const flicker = 0.92 + 0.08 * Math.sin(now / 90) * Math.sin(now / 37);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,196,110,${0.5 * flicker * strength})`);
  g.addColorStop(0.45, `rgba(224,140,60,${0.18 * flicker * strength})`);
  g.addColorStop(1, 'rgba(224,140,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A songket-gold zigzag band. */
function songketBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = PAL.maroon;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0, px = x; px <= x + w + h; i++, px += h) {
    ctx.lineTo(px, i % 2 ? y + h - 1.5 : y + 1.5);
  }
  ctx.stroke();
  ctx.restore();
}

export class PickFlow {
  private step: DraftSnapshot['step'] = 'closed';
  private species: SpeciesId = 'kampung';
  private mine: HeroKind[] = [];
  private bot: HeroKind[] = [];
  private turn = 0;
  private highlighted: HeroKind = HERO_IDS[0];
  private tab: Tab = 'trait';
  private seed = 0;
  private botAt = 0; // when the bot's current "thinking" started (ms)
  private botTimer = 0;
  private flashAt = new Map<string, number>(); // slot id -> when it filled (ms)
  private raf = 0;
  private versus: VersusInfo | null = null;
  private versusAt = 0;
  private startTimer = 0;
  private readonly thinkMs: number;
  private readonly loadMs: number;
  private readonly lockedMs: number;

  private readonly speciesEl = el('species');
  private readonly draftEl = el('draft');
  private readonly versusEl = el('versus');
  private readonly stage = el('draft-stage') as HTMLCanvasElement;
  private readonly versusCv = el('versus-canvas') as HTMLCanvasElement;

  constructor(private readonly opts: { fast: boolean; onLocked: (l: Lineups) => VersusInfo; onStart: () => void }) {
    this.thinkMs = opts.fast ? 60 : 750;
    this.loadMs = opts.fast ? 300 : 2200;
    this.lockedMs = opts.fast ? 40 : 650;
    this.buildSpecies();
    this.buildSlots();
    this.buildRoster();
    el('species-grid').addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-species]');
      if (!b) return;
      this.species = b.dataset.species as SpeciesId;
      this.refreshSpecies();
    });
    el('species-go').addEventListener('click', () => this.startDraft());
    el('draft-roster').addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-hero]');
      if (!b) return;
      this.highlighted = b.dataset.hero as HeroKind;
      this.refreshDraft();
    });
    el('draft-tabs').addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
      if (!b) return;
      this.tab = b.dataset.tab as Tab;
      this.refreshBio();
    });
    el('draft-lock').addEventListener('click', () => this.lock());
    el('draft-random').addEventListener('click', () => {
      const free = HERO_IDS.filter((k) => !this.taken(k));
      if (free.length) this.highlighted = free[Math.floor(Math.random() * free.length)];
      this.refreshDraft();
    });
    el('draft-back').addEventListener('click', () => this.open(this.species, this.mine));
    this.versusEl.addEventListener('click', () => {
      if (this.step === 'versus' && performance.now() - this.versusAt > 150) this.start();
    });
  }

  snapshot(): DraftSnapshot {
    return { step: this.step, turn: this.turn, whose: this.whose(), mine: [...this.mine], bot: [...this.bot], highlighted: this.highlighted };
  }

  /** Open the species step (then the draft). `recent` heroes are suggested first in the draft. */
  open(species: SpeciesId, recent: readonly HeroKind[] = []): void {
    this.cancelTimers();
    this.species = species;
    this.highlighted = recent[0] ?? HERO_IDS[0];
    this.step = 'species';
    this.refreshSpecies();
    this.draftEl.classList.remove('show');
    this.versusEl.classList.remove('show');
    this.speciesEl.classList.add('show');
  }

  // ---------- species ----------

  private buildSpecies(): void {
    el('species-grid').replaceChildren(...SPECIES_IDS.map((id) => {
      const d = SPECIES[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile sp';
      b.id = `species-${id}`;
      b.dataset.species = id;
      b.style.setProperty('--spc', SPECIES_COLORS[id]);
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = d.name;
      const rl = document.createElement('span');
      rl.className = 'rl';
      rl.textContent = `${d.classes.length} classes`;
      b.append(picture(36, 'pic', (ctx, dpr) => drawTroopFigure(ctx, CLASSES[d.classes[0]].unit, 18, 33, 26, 0, dpr, { facing: 1, walk: 0, attack: 0 })), nm, rl);
      return b;
    }));
  }

  private refreshSpecies(): void {
    for (const b of el('species-grid').querySelectorAll<HTMLButtonElement>('[data-species]')) b.classList.toggle('sel', b.dataset.species === this.species);
    const d = SPECIES[this.species];
    const h = document.createElement('h3');
    h.textContent = `${d.name}, ${d.title}`;
    const p = document.createElement('p');
    p.textContent = d.text;
    const list = document.createElement('p');
    list.textContent = d.classes.map((c) => `${CLASSES[c].name} (×${CLASSES[c].wave} a wave): ${CLASSES[c].text}`).join(' · ');
    el('species-detail').replaceChildren(h, p, list);
    el('species-go').textContent = `Choose heroes for ${d.name} ›`;
  }

  // ---------- draft ----------

  private whose(): Player | null {
    return this.step === 'draft' && this.turn < DRAFT_ORDER.length ? DRAFT_ORDER[this.turn] : null;
  }

  private taken(k: HeroKind): boolean {
    return this.mine.includes(k) || this.bot.includes(k);
  }

  private startDraft(): void {
    this.speciesEl.classList.remove('show');
    this.seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    this.mine = [];
    this.bot = [];
    this.turn = 0;
    this.tab = 'trait';
    this.flashAt.clear();
    this.step = 'draft';
    this.draftEl.classList.add('show');
    for (const id of HERO_IDS) this.paintRoster(id);
    this.nextTurn();
    this.loop();
  }

  private nextTurn(): void {
    this.refreshDraft();
    if (this.turn >= DRAFT_ORDER.length) {
      this.startTimer = window.setTimeout(() => this.showVersus(), this.lockedMs);
      return;
    }
    if (DRAFT_ORDER[this.turn] === 1) {
      this.botAt = performance.now();
      this.botTimer = window.setTimeout(() => this.botPick(), this.thinkMs);
    }
  }

  private lock(): void {
    if (this.whose() !== 0 || this.taken(this.highlighted)) return;
    this.mine.push(this.highlighted);
    this.flashAt.set(`you-${this.mine.length - 1}`, performance.now());
    this.paintRoster(this.highlighted);
    this.turn++;
    this.nextTurn();
  }

  private botPick(): void {
    if (this.whose() !== 1) return;
    const k = botDraftPick(this.seed, [...this.mine, ...this.bot], this.bot);
    this.bot.push(k);
    this.flashAt.set(`bot-${this.bot.length - 1}`, performance.now());
    this.paintRoster(k);
    this.turn++;
    this.nextTurn();
  }

  private buildSlots(): void {
    for (const side of ['you', 'bot'] as const) {
      el(`draft-${side}`).replaceChildren(...Array.from({ length: HERO_RULES.heroesPerPlayer }, (_, i) => {
        const s = document.createElement('div');
        s.className = 'slot';
        s.id = `slot-${side}-${i}`;
        s.textContent = String(i + 1);
        return s;
      }));
    }
  }

  private buildRoster(): void {
    el('draft-roster').replaceChildren(...HERO_IDS.map((id) => {
      const d = HEROES[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rost';
      b.id = `pick-${id}`;
      b.dataset.hero = id;
      b.style.setProperty('--ring', ORDER_COLORS[d.best]);
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = d.name;
      b.append(picture(40, 'face', (ctx, dpr) => drawPortrait(ctx, id, 20, 20, 19, 0, dpr)), nm);
      return b;
    }));
  }

  /** Repaint a roster portrait in the colour of whoever took it. */
  private paintRoster(id: HeroKind): void {
    const cv = el(`pick-${id}`).querySelector('canvas');
    if (!cv) return;
    const owner = this.bot.includes(id) ? 1 : 0;
    repaint(cv, 40, (ctx, dpr) => drawPortrait(ctx, id, 20, 20, 19, owner, dpr));
  }

  private refreshDraft(): void {
    const whose = this.whose();
    // line-up slots
    for (const side of ['you', 'bot'] as const) {
      const list = side === 'you' ? this.mine : this.bot;
      const next = whose === (side === 'you' ? 0 : 1) ? list.length : -1;
      for (let i = 0; i < HERO_RULES.heroesPerPlayer; i++) {
        const s = el(`slot-${side}-${i}`);
        const k = list[i];
        s.classList.toggle('full', !!k);
        s.classList.toggle('now', i === next);
        if (k && s.dataset.hero !== k) {
          s.dataset.hero = k;
          s.replaceChildren(picture(40, 'face', (ctx, dpr) => drawPortrait(ctx, k, 20, 20, 19, side === 'you' ? 0 : 1, dpr)));
          s.classList.remove('flash');
          void s.offsetWidth; // restart the pop animation
          s.classList.add('flash');
        } else if (!k) {
          delete s.dataset.hero;
          s.textContent = String(i + 1);
        }
        s.title = k ? HEROES[k].name : `${side === 'you' ? 'Your' : 'Bot'} pick ${i + 1}`;
      }
    }
    // turn banner
    const turnEl = el('draft-turn');
    const text = el('draft-turn-text');
    turnEl.classList.toggle('you', whose === 0);
    turnEl.classList.toggle('bot', whose === 1);
    if (whose === 0) text.textContent = `Your pick · ${this.mine.length + 1} of ${HERO_RULES.heroesPerPlayer}`;
    else if (whose === 1) text.textContent = 'The bot is picking…';
    else text.textContent = 'Line-ups locked!';
    // roster
    for (const b of el('draft-roster').querySelectorAll<HTMLButtonElement>('[data-hero]')) {
      const k = b.dataset.hero as HeroKind;
      const mine = this.mine.includes(k);
      const bot = this.bot.includes(k);
      b.classList.toggle('hl', k === this.highlighted);
      b.classList.toggle('taken', mine || bot);
      b.querySelector('.badge')?.remove();
      if (mine || bot) {
        const badge = document.createElement('span');
        badge.className = `badge ${mine ? 'you' : 'bot'}`;
        badge.textContent = mine ? 'YOU' : 'BOT';
        b.append(badge);
      }
      b.setAttribute('aria-pressed', String(k === this.highlighted));
    }
    // lock button
    const lockBtn = el('draft-lock') as HTMLButtonElement;
    const name = HEROES[this.highlighted].name;
    lockBtn.disabled = whose !== 0 || this.taken(this.highlighted);
    lockBtn.textContent = whose === 1 ? 'Waiting for the bot…'
      : whose === null ? 'Line-ups locked'
        : this.mine.includes(this.highlighted) ? `${name} is yours`
          : this.bot.includes(this.highlighted) ? `${name} is the bot's`
            : `Lock in ${name}`;
    (el('draft-random') as HTMLButtonElement).disabled = whose !== 0;
    this.refreshBio();
  }

  private refreshBio(): void {
    const d = HEROES[this.highlighted];
    el('bio-name').textContent = d.name;
    el('bio-title').textContent = d.title;
    const chips = el('bio-chips');
    const role = document.createElement('span');
    role.className = 'chip';
    role.textContent = d.role;
    const best = document.createElement('span');
    best.className = 'chip best';
    best.style.background = ORDER_COLORS[d.best];
    best.textContent = `★ ${d.best[0].toUpperCase()}${d.best.slice(1)}`;
    const reach = document.createElement('span');
    reach.className = 'chip';
    reach.textContent = `${d.range >= 300 ? 'Ranged' : 'Melee'}${d.flying ? ' · flies' : ''}`;
    chips.replaceChildren(role, best, reach);
    for (const b of el('draft-tabs').querySelectorAll<HTMLButtonElement>('[data-tab]')) b.classList.toggle('on', b.dataset.tab === this.tab);
    const box = el('bio-text');
    const head = document.createElement('b');
    const when = document.createElement('div');
    when.className = 'when';
    const body = document.createElement('div');
    switch (this.tab) {
      case 'trait': head.textContent = d.trait.name; when.textContent = 'Trait · always on'; body.textContent = d.trait.text; break;
      case 'power': head.textContent = d.power.name; when.textContent = `Power · fires by itself, ${d.power.when}`; body.textContent = d.power.text; break;
      case 'ult': head.textContent = d.ult.name; when.textContent = `Ultimate · level 4, you call it · best moment: ${d.ult.when}`; body.textContent = d.ult.text; break;
      case 'vs': head.textContent = 'Match-ups'; when.textContent = d.role; body.textContent = `Strong vs ${d.strong}. Weak vs ${d.weak}.`; break;
    }
    box.replaceChildren(head, when, body);
    box.scrollTop = 0;
  }

  // ---------- versus ----------

  private showVersus(): void {
    this.versus = this.opts.onLocked({ species: this.species, mine: [...this.mine], bot: [...this.bot] });
    this.step = 'versus';
    this.versusAt = performance.now();
    this.draftEl.classList.remove('show');
    this.versusEl.classList.add('show');
    this.startTimer = window.setTimeout(() => this.start(), this.loadMs + 120);
    this.loop();
  }

  private start(): void {
    if (this.step !== 'versus') return;
    this.cancelTimers();
    this.step = 'closed';
    this.versusEl.classList.remove('show');
    this.opts.onStart();
  }

  private cancelTimers(): void {
    window.clearTimeout(this.botTimer);
    window.clearTimeout(this.startTimer);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ---------- drawing ----------

  private loop(): void {
    if (this.raf) return;
    const frame = (now: number) => {
      this.raf = 0;
      if (this.step === 'draft') this.drawStage(now);
      else if (this.step === 'versus') this.drawVersus(now);
      else return;
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** The lamp-lit stage with the highlighted hero standing large, gently alive. */
  private drawStage(now: number): void {
    // the bot's "thinking" bar
    const bar = el('draft-turn-bar');
    bar.style.width = this.whose() === 1 ? `${Math.min(100, ((now - this.botAt) / this.thinkMs) * 100)}%` : '0%';
    const f = fitCanvas(this.stage);
    if (!f) return;
    const { ctx, w, h, dpr } = f;
    const k = this.highlighted;
    const bot = this.bot.includes(k);
    const mine = this.mine.includes(k);
    ctx.clearRect(0, 0, w, h);
    // night backdrop and the lamp above the stage
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#120b12');
    bg.addColorStop(1, '#24150d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    lampLight(ctx, w / 2, h * 0.2, Math.max(w, h) * 0.75, now);
    // carved arch frame (a wayang screen edge)
    ctx.strokeStyle = 'rgba(224,176,74,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, h - 24);
    ctx.lineTo(8, h * 0.32);
    ctx.quadraticCurveTo(w / 2, -h * 0.12, w - 8, h * 0.32);
    ctx.lineTo(w - 8, h - 24);
    ctx.stroke();
    // the lamp itself
    const lx = w / 2;
    const ly = 14;
    ctx.fillStyle = PAL.clay;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(lx, ly + 5, 9, 4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,214,110,${0.85 + 0.15 * Math.sin(now / 70)})`;
    ctx.beginPath(); ctx.moveTo(lx, ly - 7); ctx.quadraticCurveTo(lx + 5, ly, lx, ly + 4); ctx.quadraticCurveTo(lx - 5, ly, lx, ly - 7); ctx.fill();
    // a beam of light onto the stage
    const beam = ctx.createLinearGradient(0, ly, 0, h);
    beam.addColorStop(0, 'rgba(255,214,140,0.22)');
    beam.addColorStop(1, 'rgba(255,214,140,0.04)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(lx - 10, ly + 6); ctx.lineTo(lx + 10, ly + 6); ctx.lineTo(w * 0.86, h - 20); ctx.lineTo(w * 0.14, h - 20); ctx.closePath(); ctx.fill();
    // the stage floor: wooden planks with a songket edge
    const floorY = h - 24;
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, floorY, w, 24);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let x = -10; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x + 8, h); ctx.stroke(); }
    songketBand(ctx, 0, floorY - 4, w, 7);
    const pool = ctx.createRadialGradient(w / 2, floorY, 2, w / 2, floorY, w * 0.42);
    pool.addColorStop(0, 'rgba(255,208,130,0.5)');
    pool.addColorStop(1, 'rgba(255,208,130,0)');
    ctx.fillStyle = pool;
    ctx.beginPath(); ctx.ellipse(w / 2, floorY, w * 0.42, 12, 0, 0, TAU); ctx.fill();
    // embers rising from the lamp light
    for (let i = 0; i < 9; i++) {
      const t = ((now / 2600 + i / 9) % 1);
      const ex = w * (0.2 + 0.6 * ((i * 0.37) % 1)) + Math.sin(now / 700 + i) * 6;
      const ey = floorY - t * (h - 40);
      ctx.fillStyle = `rgba(255,190,110,${0.55 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(ex, ey, 1.4, 0, TAU); ctx.fill();
    }
    // the hero: idle sway (slow walk frames), a strike every few seconds
    const base = Math.min(160, (floorY - 40) / Math.max(1, heroScale(k)) * 0.86);
    const cycle = now % 3800;
    const attack = cycle < 520 ? cycle / 520 : 0;
    const walk = attack ? 0 : (now / 2400) % 1;
    const bob = Math.sin(now / 520) * 1.5;
    ctx.save();
    ctx.translate(0, bob);
    drawHeroFigure(ctx, k, w / 2, floorY + 2, base, bot ? 1 : 0, dpr, { facing: 1, walk, attack, alpha: bot ? 0.55 : 1 });
    ctx.restore();
    // taken: a parchment ribbon across the stage
    if (bot || mine) {
      const ry = h * 0.42;
      ctx.save();
      ctx.translate(w / 2, ry);
      ctx.rotate(-0.12);
      ctx.fillStyle = bot ? 'rgba(192,57,43,0.92)' : 'rgba(47,95,179,0.92)';
      ctx.strokeStyle = PAL.gold;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-w * 0.6, -13, w * 1.2, 26);
      ctx.strokeRect(-w * 0.6, -13, w * 1.2, 26);
      ctx.fillStyle = '#fff8e6';
      ctx.font = '800 13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bot ? 'TAKEN BY THE BOT' : 'IN YOUR LINE-UP', 0, 1);
      ctx.restore();
    }
  }

  /** Both line-ups face off, a VS stamp lands with a flash, and a loading bar fills. */
  private drawVersus(now: number): void {
    const v = this.versus;
    if (!v) return;
    const f = fitCanvas(this.versusCv);
    if (!f) return;
    const { ctx, w, h, dpr } = f;
    const t = now - this.versusAt;
    const midY = h * 0.5;
    ctx.clearRect(0, 0, w, h);
    // the bot's half above, yours below, split by a slanted songket band
    const top = ctx.createLinearGradient(0, 0, 0, midY);
    top.addColorStop(0, '#0d0709');
    top.addColorStop(1, '#4a1512');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, midY + 30);
    const bottom = ctx.createLinearGradient(0, midY, 0, h);
    bottom.addColorStop(0, '#14275a');
    bottom.addColorStop(1, '#070a14');
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, midY + 26); ctx.lineTo(w, midY - 26); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = bottom;
    ctx.fill();
    ctx.restore();
    lampLight(ctx, w * 0.8, h * 0.14, w * 0.8, now, 0.7);
    lampLight(ctx, w * 0.2, h * 0.7, w * 0.8, now + 500, 0.55);
    ctx.save();
    ctx.translate(w / 2, midY);
    ctx.rotate(-Math.atan2(52, w));
    songketBand(ctx, -w * 0.75, -6, w * 1.5, 12);
    ctx.restore();
    // line-ups
    const fig = Math.min(128, w * 0.3, h * 0.19);
    const row = (list: HeroKind[], owner: 0 | 1, feetY: number, fromRight: boolean) => {
      const slide = (1 - ease((t - 60) / 520)) * w * (fromRight ? 1 : -1);
      list.forEach((k, i) => {
        const x = w * (0.2 + 0.3 * i) + slide;
        const y = feetY + (i === 1 ? (owner === 1 ? -12 : 10) : 0); // the middle hero stands a step forward
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(x, y + 2, fig * 0.3, 7, 0, 0, TAU); ctx.fill();
        drawHeroFigure(ctx, k, x, y, fig, owner, dpr, { facing: owner === 0 ? 1 : -1, walk: (now / 2200 + i * 0.3) % 1, attack: 0 });
        ctx.fillStyle = '#fff8e6';
        ctx.font = '700 12.5px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(HEROES[k].name, x, y + 9);
        ctx.fillText(HEROES[k].name, x, y + 9);
      });
    };
    row(v.bot, 1, h * 0.4, true);
    row(v.mine, 0, h * 0.86, false);
    // side labels
    const sideLabel = (who: string, sp: SpeciesId, y: number, color: string, align: CanvasTextAlign) => {
      const x = align === 'left' ? 14 : w - 14;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 13px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(who, x, y);
      ctx.font = '700 17px Georgia, serif';
      ctx.fillStyle = '#f3e6c4';
      ctx.fillText(`${SPECIES[sp].name}, ${SPECIES[sp].title}`, x, y + 20);
    };
    sideLabel('BOT', v.botSpecies, 30, '#f4a28c', 'right');
    sideLabel('YOU', v.mySpecies, h * 0.555 + 22, '#9cc0ff', 'left');
    // the VS stamp: drops in big, then settles
    const s = t < 380 ? 2.8 - 1.8 * ease(t / 380) : 1 + 0.03 * Math.sin(now / 160);
    ctx.save();
    ctx.translate(w / 2, midY);
    ctx.scale(s, s);
    ctx.rotate(-0.08);
    ctx.fillStyle = PAL.maroon;
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(42, 0); ctx.lineTo(0, 38); ctx.lineTo(-42, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = '900 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAL.ink;
    ctx.strokeText('VS', 0, 2);
    ctx.fillStyle = PAL.gold;
    ctx.fillText('VS', 0, 2);
    ctx.restore();
    // the flash when it lands
    if (t > 330 && t < 700) {
      ctx.fillStyle = `rgba(255,244,214,${0.75 * (1 - (t - 330) / 370)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // loading bar and the tap hint
    const p = Math.min(1, t / this.loadMs);
    const bw = w - 60;
    const by = h - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(30, by, bw, 6);
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(30, by, bw * p, 6);
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgba(243,230,196,${0.65 + 0.35 * Math.sin(now / 240)})`;
    ctx.fillText(p < 1 ? 'Preparing the battlefield… · tap to start' : 'Tap to start', w / 2, by - 6);
  }
}

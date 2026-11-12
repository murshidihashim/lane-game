// Runs a match in the browser: fixed-step simulation, the bot, input, drawing and menus.
import { Bot, type BotLevel } from '../game/bot';
import { CARDS, MANA, TICKS_PER_SECOND, type CardId, type HeroKind } from '../game/rules';
import { type Command, DEFAULT_PICKS, Sim, randomPicks } from '../game/sim';
import { type Layout, computeLayout, inField, inRect, toWorld } from './layout';
import { cardCommand, orderCommand, orderTargets, placeCard } from './placement';
import { DRAG_LIFT, Renderer, type UiState, nearestTarget } from './render';

export interface Settings {
  lanes: 2 | 3;
  speed: number;
  bot: BotLevel;
}

const STEP_MS = 1000 / TICKS_PER_SECOND;
const TAP_SLOP = 10;

export class Game {
  sim!: Sim;
  settings: Settings;
  /** Your two heroes for the next match. */
  picks: HeroKind[] = [...DEFAULT_PICKS];
  /** Every accepted command with its tick: seed + this log replays the match exactly. */
  log: { tick: number; cmd: Command }[] = [];
  private bot!: Bot;
  private autoBot: Bot | null = null;
  private layout!: Layout;
  private ctx: CanvasRenderingContext2D;
  private renderer = new Renderer();
  private ui: UiState = { dragCard: null, selectedCard: -1, dragHero: null, selectedHero: null, hover: null, toast: null };
  private acc = 0;
  private last = 0;
  private running = false;
  private down: { x: number; y: number } | null = null;
  private resultShown = false;

  constructor(private canvas: HTMLCanvasElement, settings: Settings, private opts: { seed?: number; autoplay?: boolean; onResult: (g: Game) => void }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    this.ctx = ctx;
    this.settings = settings;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => this.cancelDrag());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.newMatch();
    requestAnimationFrame((t) => this.frame(t));
  }

  newMatch(seed?: number): void {
    const s = seed ?? this.opts.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const botPicks = randomPicks(s);
    this.sim = new Sim({ seed: s, lanes: this.settings.lanes, picks: [this.opts.autoplay ? randomPicks(s ^ 0x1234567) : this.picks, botPicks] });
    this.bot = new Bot(1, s, this.settings.bot);
    this.autoBot = this.opts.autoplay ? new Bot(0, s ^ 0x5bd1e995, 'normal') : null;
    this.log = [];
    this.renderer.reset();
    this.ui = { dragCard: null, selectedCard: -1, dragHero: null, selectedHero: null, hover: null, toast: null };
    this.acc = 0;
    this.resultShown = false;
  }

  setRunning(on: boolean): void {
    this.running = on;
    this.last = performance.now();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // The canvas is sized by CSS (it stays clear of the phone's notch and home bar).
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width) || window.innerWidth;
    const h = Math.round(rect.height) || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.layout = computeLayout(w, h, dpr);
  }

  private frame(now: number): void {
    const dt = Math.min(250, now - this.last);
    this.last = now;
    if (this.running && !this.sim.result) {
      this.acc += dt * this.settings.speed;
      let steps = 0;
      while (this.acc >= STEP_MS && steps < 12) {
        this.tick(now);
        this.acc -= STEP_MS;
        steps++;
      }
      if (steps >= 12) this.acc = 0;
    }
    if (this.sim.result && !this.resultShown) {
      this.resultShown = true;
      this.opts.onResult(this);
    }
    this.renderer.draw(this.ctx, this.layout, this.sim, this.ui, this.sim.result ? 1 : this.acc / STEP_MS, now);
    requestAnimationFrame((t) => this.frame(t));
  }

  private tick(now: number): void {
    for (const c of this.bot.think(this.sim)) this.send(c);
    if (this.autoBot) for (const c of this.autoBot.think(this.sim)) this.send(c);
    this.sim.step();
    this.renderer.addEvents(this.sim.events, now);
  }

  private send(cmd: Command): void {
    this.sim.submit(cmd);
    this.log.push({ tick: this.sim.tick, cmd });
  }

  private toast(text: string): void {
    this.ui.toast = { text, until: performance.now() + 1200 };
  }

  // ---------- input ----------

  private point(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private heroAt(x: number, y: number): HeroKind | null {
    const kinds = this.sim.players[0].picks;
    for (let i = 0; i < kinds.length; i++) if (inRect(this.layout.heroSlots[i], x, y) && this.sim.heroOf(0, kinds[i])) return kinds[i];
    return null;
  }

  private cardAt(x: number, y: number): number {
    return this.layout.cards.findIndex((r) => inRect({ ...r, y: r.y - 8, h: r.h + 16 }, x, y));
  }

  private onDown(e: PointerEvent): void {
    if (!this.running || this.sim.result) return;
    const p = this.point(e);
    this.down = p;
    this.canvas.setPointerCapture(e.pointerId);
    if (inRect(this.layout.gear, p.x, p.y)) return;
    const ci = this.cardAt(p.x, p.y);
    if (ci >= 0) {
      const card = this.sim.players[0].hand[ci];
      this.ui.dragCard = { index: ci, card, x: p.x, y: p.y, moved: false };
      this.ui.selectedHero = null;
      return;
    }
    const hero = this.heroAt(p.x, p.y);
    if (hero) {
      this.ui.dragHero = { hero, x: p.x, y: p.y, moved: false };
      this.ui.selectedCard = -1;
      return;
    }
    this.ui.hover = p;
  }

  private onMove(e: PointerEvent): void {
    const p = this.point(e);
    const moved = (d: { x: number; y: number }) => this.down !== null && Math.hypot(d.x - this.down.x, d.y - this.down.y) > TAP_SLOP;
    if (this.ui.dragCard) {
      this.ui.dragCard.x = p.x;
      this.ui.dragCard.y = p.y;
      if (moved(p)) this.ui.dragCard.moved = true;
    } else if (this.ui.dragHero) {
      this.ui.dragHero.x = p.x;
      this.ui.dragHero.y = p.y;
      if (moved(p)) this.ui.dragHero.moved = true;
    } else if (e.pointerType === 'mouse' || this.down) {
      this.ui.hover = p;
    }
  }

  private onUp(e: PointerEvent): void {
    const p = this.point(e);
    const wasDown = this.down;
    this.down = null;
    if (!this.running || this.sim.result) { this.cancelDrag(); return; }
    if (wasDown && inRect(this.layout.gear, p.x, p.y) && inRect(this.layout.gear, wasDown.x, wasDown.y)) {
      this.cancelDrag();
      document.dispatchEvent(new CustomEvent('open-settings'));
      return;
    }
    const dc = this.ui.dragCard;
    if (dc) {
      this.ui.dragCard = null;
      if (!dc.moved) {
        this.ui.selectedCard = this.ui.selectedCard === dc.index ? -1 : dc.index;
        if (this.ui.selectedCard >= 0 && !this.sim.canAfford(0, dc.card)) this.toast(`Needs ${CARDS[dc.card].cost} mana`);
        return;
      }
      this.ui.selectedCard = -1;
      if (inField(this.layout, p.x, p.y - DRAG_LIFT)) this.playCard(dc.card, p.x, p.y - DRAG_LIFT);
      return;
    }
    const dh = this.ui.dragHero;
    if (dh) {
      this.ui.dragHero = null;
      if (!dh.moved) {
        this.ui.selectedHero = this.ui.selectedHero === dh.hero ? null : dh.hero;
        this.ui.selectedCard = -1;
        return;
      }
      this.orderHero(dh.hero, p.x, p.y - DRAG_LIFT);
      return;
    }
    // A tap on the field with a card or hero selected.
    if (this.ui.selectedCard >= 0 && inField(this.layout, p.x, p.y)) {
      const card = this.sim.players[0].hand[this.ui.selectedCard];
      if (card) this.playCard(card, p.x, p.y);
      this.ui.selectedCard = -1;
    } else if (this.ui.selectedHero && inField(this.layout, p.x, p.y)) {
      if (this.orderHero(this.ui.selectedHero, p.x, p.y)) this.ui.selectedHero = null;
    }
    this.ui.hover = null;
  }

  private cancelDrag(): void {
    this.ui.dragCard = null;
    this.ui.dragHero = null;
    this.down = null;
  }

  private playCard(card: CardId, sx: number, sy: number): void {
    if (!this.sim.canAfford(0, card)) {
      const need = CARDS[card].cost - Math.floor(this.sim.players[0].mana / MANA.perMana);
      this.toast(`Not enough mana (need ${need} more)`);
      return;
    }
    const [wx, wy] = toWorld(this.layout, sx, sy);
    this.send(cardCommand(card, placeCard(this.sim, card, wx, wy)));
  }

  private orderHero(kind: HeroKind, sx: number, sy: number): boolean {
    const hero = this.sim.heroOf(0, kind);
    const t = nearestTarget(this.layout, orderTargets(this.sim, hero), sx, sy, 56);
    if (!t) { this.toast('Drop the hero on a glowing spot'); return false; }
    this.send(orderCommand(kind, t));
    return true;
  }
}

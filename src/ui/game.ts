// Runs a match in the browser: fixed-step simulation, the bot, input, drawing and menus.
import { Bot, type BotLevel } from '../game/bot';
import { LANE_NAMES, type LaneId } from '../game/map';
import { CLASSES, HEROES, ITEMS, MANA, SPECIES, TICKS_PER_SECOND, type HeroKind, type ItemId, type SpeciesId } from '../game/rules';
import { type Command, DEFAULT_PICKS, Sim, randomPicks, randomSpecies } from '../game/sim';
import { type Layout, type View, MAX_ZOOM, applyView, clampView, computeLayout, homeView, inField, inRect, toScreen, toWorld } from './layout';
import { COMMAND_ORDERS, type CommandAction, commandTargets, moveCommand, orderCommand, orderLabel, orderTargets, resolveCommand } from './placement';
import { DRAG_LIFT, Renderer, type UiState, nearestTarget } from './render';

export interface Settings {
  lanes: 2 | 3;
  speed: number;
  bot: BotLevel;
}

const STEP_MS = 1000 / TICKS_PER_SECOND;
const TAP_SLOP = 10;
const ZOOM_IN = 1.8; // the zoom button and double-tap zoom (DEC-016)
const DOUBLE_TAP_MS = 320;

export class Game {
  sim!: Sim;
  settings: Settings;
  /** Your three heroes for the next match (DEC-014). */
  picks: HeroKind[] = [...DEFAULT_PICKS];
  /** The bot's heroes from the draft (DEC-015); null = the bot picks at random. */
  botPicks: HeroKind[] | null = null;
  /** Your creep species for the next match (DEC-008). */
  species: SpeciesId = 'kampung';
  /** Every accepted command with its tick: seed + this log replays the match exactly. */
  log: { tick: number; cmd: Command }[] = [];
  private bot!: Bot;
  private autoBot: Bot | null = null;
  /** The screen layout with the whole map in view, and the camera on top of it (DEC-016). */
  private base!: Layout;
  private view: View = homeView();
  private layout!: Layout;
  /** Pointers on the canvas (two of them = a pinch), a field drag that may become a pan, the last tap. */
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d0: number; zoom0: number; wx: number; wy: number } | null = null;
  private pan: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  private lastTap: { x: number; y: number; at: number } | null = null;
  private ctx: CanvasRenderingContext2D;
  private renderer = new Renderer();
  private ui: UiState = { dragHero: null, command: null, hover: null, toast: null };
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
    canvas.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.pinch = null; this.cancelDrag(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.newMatch();
    requestAnimationFrame((t) => this.frame(t));
  }

  newMatch(seed?: number): void {
    const s = seed ?? this.opts.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const auto = !!this.opts.autoplay;
    const mine = auto ? randomPicks(s ^ 0x1234567) : this.picks;
    const botPicks = this.botPicks && !auto && !this.botPicks.some((k) => mine.includes(k)) ? this.botPicks : randomPicks(s, mine);
    this.sim = new Sim({
      seed: s, lanes: this.settings.lanes,
      picks: [mine, botPicks],
      species: [auto ? randomSpecies(s ^ 0x7654321) : this.species, randomSpecies(s)],
    });
    this.bot = new Bot(1, s, this.settings.bot);
    this.autoBot = this.opts.autoplay ? new Bot(0, s ^ 0x5bd1e995, 'normal') : null;
    this.log = [];
    this.renderer.reset();
    if (this.base) this.setView(homeView());
    this.ui = { dragHero: null, command: null, hover: null, toast: null };
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
    this.base = computeLayout(w, h, dpr);
    this.setView(this.view);
  }

  /** Move the camera (kept inside the map). */
  private setView(v: View): void {
    this.view = clampView(this.base, v);
    this.layout = applyView(this.base, this.view);
  }

  /** Zoom in on a screen point, or back out to the whole map. */
  private toggleZoom(sx: number, sy: number): void {
    if (this.view.zoom > 1.05) { this.setView(homeView()); return; }
    const [wx, wy] = toWorld(this.layout, sx, sy);
    this.setView({ zoom: ZOOM_IN, cx: wx, cy: wy });
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

  /** The hero whose panel (outside its ULT button and item slots) is at a point. */
  private heroAt(x: number, y: number): HeroKind | null {
    const kinds = this.sim.players[0].picks;
    for (let i = 0; i < kinds.length; i++) {
      const p = this.layout.heroes[i];
      if (inRect(p.box, x, y) && !inRect(p.ult, x, y) && !p.items.some((r) => inRect(r, x, y))) return kinds[i];
    }
    return null;
  }

  /** What a tap on the HUD buttons does (handled on release), or null. */
  private buttonAt(x: number, y: number):
    | { kind: 'gear' } | { kind: 'zoom' } | { kind: 'wave'; lane: LaneId } | { kind: 'ult'; hero: HeroKind } | { kind: 'shop'; hero: HeroKind | null }
    | { kind: 'menu-close' } | { kind: 'menu-order'; action: CommandAction } | { kind: 'menu-cancel' } | { kind: 'menu-bg' } | null {
    const l = this.layout;
    // The command menu (DEC-017) sits on top of the map, so it comes first.
    const cmd = this.ui.command;
    if (cmd && cmd.action === null && inRect(l.menu.box, x, y)) {
      if (inRect(l.menu.close, x, y)) return { kind: 'menu-close' };
      const i = l.menu.buttons.findIndex((r) => inRect(r, x, y));
      return i >= 0 ? { kind: 'menu-order', action: COMMAND_ORDERS[i].id } : { kind: 'menu-bg' };
    }
    if (cmd && cmd.action !== null && inRect(l.menu.hint, x, y)) return inRect(l.menu.cancel, x, y) ? { kind: 'menu-cancel' } : { kind: 'menu-bg' };
    if (inRect(l.gear, x, y)) return { kind: 'gear' };
    if (inRect(l.zoomBtn, x, y)) return { kind: 'zoom' };
    const w = l.waves.findIndex((r) => inRect(r, x, y));
    if (w >= 0) return { kind: 'wave', lane: w as LaneId };
    if (inRect(l.shop, x, y)) return { kind: 'shop', hero: this.ui.command?.hero ?? null };
    const kinds = this.sim.players[0].picks;
    for (let i = 0; i < kinds.length; i++) {
      const p = l.heroes[i];
      if (inRect(p.ult, x, y)) return { kind: 'ult', hero: kinds[i] };
      if (p.items.some((r) => inRect(r, x, y))) return { kind: 'shop', hero: kinds[i] };
    }
    return null;
  }

  private onDown(e: PointerEvent): void {
    if (!this.running || this.sim.result) return;
    const p = this.point(e);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that has already been released (or a synthetic one) can't be captured; the
      // gesture still works without capture, it just stops at the canvas edge.
    }
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) { this.startPinch(); return; }
    if (this.pointers.size > 2) return;
    this.down = p;
    if (this.buttonAt(p.x, p.y)) return; // handled on release
    const hero = this.heroAt(p.x, p.y);
    if (hero) {
      this.ui.dragHero = { hero, x: p.x, y: p.y, moved: false };
      return;
    }
    if (inField(this.layout, p.x, p.y)) this.pan = { x: p.x, y: p.y, cx: this.view.cx, cy: this.view.cy, moved: false };
    this.ui.hover = p;
  }

  /** Two fingers on the field: zoom around the point between them (DEC-016). */
  private startPinch(): void {
    const [a, b] = [...this.pointers.values()];
    const [wx, wy] = toWorld(this.layout, (a.x + b.x) / 2, (a.y + b.y) / 2);
    this.pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), zoom0: this.view.zoom, wx, wy };
    this.cancelDrag();
    this.pan = null;
    this.ui.hover = null;
  }

  private onMove(e: PointerEvent): void {
    const p = this.point(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const zoom = Math.max(1, Math.min(MAX_ZOOM, (this.pinch.zoom0 * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.d0));
      // keep the world point that started between the fingers under the fingers' midpoint
      const scale = this.base.baseScale * zoom;
      const mx = (a.x + b.x) / 2 - (this.base.field.x + this.base.field.w / 2);
      const my = (a.y + b.y) / 2 - (this.base.field.y + this.base.field.h / 2);
      this.setView({ zoom, cx: this.pinch.wx - mx / scale, cy: this.pinch.wy - my / scale });
      return;
    }
    const moved = (d: { x: number; y: number }) => this.down !== null && Math.hypot(d.x - this.down.x, d.y - this.down.y) > TAP_SLOP;
    if (this.ui.dragHero) {
      this.ui.dragHero.x = p.x;
      this.ui.dragHero.y = p.y;
      if (moved(p)) this.ui.dragHero.moved = true;
      return;
    }
    // One finger on the field while zoomed in: look around.
    if (this.pan && this.view.zoom > 1.01 && (this.pan.moved || moved(p))) {
      this.pan.moved = true;
      this.setView({ zoom: this.view.zoom, cx: this.pan.cx - (p.x - this.pan.x) / this.layout.scale, cy: this.pan.cy - (p.y - this.pan.y) / this.layout.scale });
      this.ui.hover = null;
      return;
    }
    if (e.pointerType === 'mouse' || this.down) this.ui.hover = p;
  }

  private onUp(e: PointerEvent): void {
    const p = this.point(e);
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null;
      this.down = null;
      this.lastTap = null;
      return;
    }
    const wasDown = this.down;
    this.down = null;
    const pan = this.pan;
    this.pan = null;
    if (!this.running || this.sim.result) { this.cancelDrag(); return; }
    const btn = wasDown ? this.buttonAt(wasDown.x, wasDown.y) : null;
    const same = btn && JSON.stringify(btn) === JSON.stringify(this.buttonAt(p.x, p.y));
    if (btn && same) {
      this.cancelDrag();
      if (btn.kind === 'gear') document.dispatchEvent(new CustomEvent('open-settings'));
      else if (btn.kind === 'zoom') this.toggleZoom(this.layout.field.x + this.layout.field.w / 2, this.layout.field.y + this.layout.field.h * 0.62);
      else if (btn.kind === 'wave') this.cycleWave(btn.lane);
      else if (btn.kind === 'ult') this.callUlt(btn.hero);
      else if (btn.kind === 'shop') document.dispatchEvent(new CustomEvent('open-shop', { detail: btn.hero ?? this.sim.players[0].picks[0] }));
      else if (btn.kind === 'menu-close' || btn.kind === 'menu-cancel') this.ui.command = null;
      else if (btn.kind === 'menu-order') this.chooseOrder(btn.action);
      return;
    }
    if (btn?.kind === 'menu-bg') return; // a drag that started on the menu
    const dh = this.ui.dragHero;
    if (dh) {
      this.ui.dragHero = null;
      if (!dh.moved) {
        // Tap a hero's panel: open (or close) its command menu.
        const cur = this.ui.command;
        this.ui.command = cur && cur.hero === dh.hero && cur.action === null ? null : { hero: dh.hero, action: null };
        return;
      }
      this.orderHero(dh.hero, p.x, p.y - DRAG_LIFT); // dragging a portrait onto the map: a quick order
      this.ui.command = null;
      return;
    }
    if (pan?.moved) { this.ui.hover = null; return; } // that was a look around, not a tap
    const cmd = this.ui.command;
    if (cmd && cmd.action !== null && inField(this.layout, p.x, p.y)) {
      // Aiming an order: the tap picks the target.
      const order = resolveCommand(this.layout, this.sim, cmd.hero, cmd.action, p.x, p.y);
      if (!order) { this.toast(COMMAND_ORDERS.find((o) => o.id === cmd.action)?.hint ?? 'Tap a highlighted target'); return; }
      this.send(order);
      this.ui.command = null;
      this.announce(cmd.hero);
      return;
    }
    const tapped = inField(this.layout, p.x, p.y) ? this.heroOnMapAt(p.x, p.y) : null;
    if (tapped) { this.ui.command = { hero: tapped, action: null }; this.lastTap = null; return; }
    if (cmd) { this.ui.command = null; return; } // a tap elsewhere closes the menu
    if (inField(this.layout, p.x, p.y)) {
      const now = performance.now();
      const t = this.lastTap;
      if (t && now - t.at < DOUBLE_TAP_MS && Math.hypot(p.x - t.x, p.y - t.y) < 30) {
        this.toggleZoom(p.x, p.y);
        this.lastTap = null;
      } else this.lastTap = { x: p.x, y: p.y, at: now };
    }
    this.ui.hover = null;
  }

  /** One of your heroes standing under the finger on the map, if any. */
  private heroOnMapAt(sx: number, sy: number): HeroKind | null {
    let best: HeroKind | null = null;
    let bestD = 30 * 30;
    for (const h of this.sim.heroes(0)) {
      if (!h.alive) continue;
      const [x, y] = toScreen(this.layout, h.x, h.y);
      const d = (x - sx) * (x - sx) + (y - 16 - sy) * (y - 16 - sy); // the body, above the feet
      if (d < bestD) { bestD = d; best = h.hero; }
    }
    return best;
  }

  /** A menu button: Retreat goes at once; the rest wait for a target on the map. */
  private chooseOrder(action: CommandAction): void {
    const cmd = this.ui.command;
    if (!cmd) return;
    if (action === 'retreat') {
      this.send({ t: 'order', player: 0, hero: cmd.hero, order: 'retreat' });
      this.ui.command = null;
      this.announce(cmd.hero);
      return;
    }
    if (action !== 'move' && commandTargets(this.sim, cmd.hero, action).length === 0) {
      this.toast(action === 'attack' ? 'No enemy in sight' : 'Nothing to aim at right now');
      return;
    }
    this.ui.command = { hero: cmd.hero, action };
  }

  /** Say what the hero is doing now (after the order is applied on the next step). */
  private announce(kind: HeroKind): void {
    window.setTimeout(() => {
      const h = this.sim.heroOf(0, kind);
      if (h) this.toast(`${HEROES[kind].name}: ${orderLabel(h, this.sim)}`);
    }, 80);
  }

  /** ULT button: call the ultimate (the hero fires it at the next good moment), or cancel the call. */
  private callUlt(kind: HeroKind): void {
    const h = this.sim.heroOf(0, kind);
    const def = HEROES[kind];
    if (!h) return;
    if (!h.ultReady) {
      this.toast(h.level < 4 ? `${def.ult.name}: unlocks at level 4` : h.alive ? `${def.ult.name}: used this life` : `${def.name} is down`);
      return;
    }
    this.send({ t: 'ult', player: 0, hero: kind });
    this.toast(h.ultArmed ? `${def.ult.name}: call cancelled` : this.sim.ultSuggested(h) ? `${def.ult.name}!` : `${def.ult.name}: fires at the next good moment`);
  }

  /** Buy an item for a hero (from the shop). Returns a message for the shop to show. */
  buy(kind: HeroKind, item: ItemId): string {
    const why = this.sim.cantBuy(0, kind, item);
    if (why === 'semangat') return `Needs ${this.sim.itemCost(0, item)} ${MANA.name}`;
    if (why === 'full') return `${HEROES[kind].name} has no free slot`;
    if (why === 'owned') return `${HEROES[kind].name} already has it`;
    if (why) return 'Not now';
    this.send({ t: 'buy', player: 0, hero: kind, item });
    return `${ITEMS[item].name} for ${HEROES[kind].name}`;
  }

  /** Tap a wave chip: the next class of your species will march in that lane. */
  private cycleWave(lane: LaneId): void {
    if (!this.sim.lanes.includes(lane)) { this.toast('No middle lane in 2-lane mode'); return; }
    const pl = this.sim.players[0];
    const classes = SPECIES[pl.species].classes;
    const next = classes[(classes.indexOf(pl.laneClass[lane]) + 1) % classes.length];
    this.send({ t: 'wave', player: 0, lane, card: next });
    this.toast(`${LANE_NAMES[lane]} lane waves: ${CLASSES[next].name} ×${CLASSES[next].wave}`);
  }

  private cancelDrag(): void {
    this.ui.dragHero = null;
    this.down = null;
    this.pan = null;
  }

  /** Order a hero to the spot under (sx, sy): a glowing target, or else Move there. */
  private orderHero(kind: HeroKind, sx: number, sy: number): boolean {
    const hero = this.sim.heroOf(0, kind);
    const t = nearestTarget(this.layout, orderTargets(this.sim, hero), sx, sy, 40);
    if (t) { this.send(orderCommand(kind, t)); return true; }
    if (!inField(this.layout, sx, sy)) return false;
    const [wx, wy] = toWorld(this.layout, sx, sy);
    this.send(moveCommand(kind, wx, wy));
    this.toast(`${HEROES[kind].name}: hold this spot`);
    return true;
  }
}

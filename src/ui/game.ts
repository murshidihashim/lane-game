// Runs a match in the browser: fixed-step simulation, the bot, input, drawing and menus.
import { Bot, type BotLevel } from '../game/bot';
import { LANE_NAMES, type LaneId } from '../game/map';
import { CALLS, CLASSES, HEROES, ITEMS, MANA, SPECIES, TICKS_PER_SECOND, ULT_AIMS, type CallId, type HeroKind, type ItemId, type SpeciesId } from '../game/rules';
import { type Command, DEFAULT_CALLS, DEFAULT_PICKS, Sim, randomCalls, randomPicks, randomSpecies } from '../game/sim';
import { type Layout, type View, applyView, choiceCard, clampView, computeLayout, homeView, homeZoom, inField, inRect, maxZoom, overviewView, ringCenter, ringSlotAt, toScreen, toWorld } from './layout';
import { COMMAND_ORDERS, type CommandAction, callAimAt, commandTargets, orderLabel, resolveCommand, ultAimAt, upgradeTexts } from './placement';
import { DRAG_LIFT, Renderer, type UiState } from './render';

export interface Settings {
  lanes: 2 | 3;
  speed: number;
  bot: BotLevel;
}

const STEP_MS = 1000 / TICKS_PER_SECOND;
const TAP_SLOP = 10;
const ZOOM_IN = 1.8; // double-tap zoom, relative to the usual full-width view (DEC-016, DEC-019)
const DOUBLE_TAP_MS = 320;
const HOLD_MS = 160; // holding your hero on the map this long opens its order ring; a quicker drag scrolls (DEC-021)
const FLICK_UP_MS = 500; // a press on your hero that moves away and lets go this fast is a flick: it dashes (PLAN-015)
const FLICK_PX = 30; // ...if the finger moved at least this far

export class Game {
  sim!: Sim;
  settings: Settings;
  /** Your three heroes for the next match (DEC-014). */
  picks: HeroKind[] = [...DEFAULT_PICKS];
  /** The bot's heroes from the draft (DEC-015); null = the bot picks at random. */
  botPicks: HeroKind[] | null = null;
  /** Your creep species for the next match (DEC-008). */
  species: SpeciesId = 'kampung';
  /** Your two commander calls for the next match (DEC-024). */
  calls: CallId[] = [...DEFAULT_CALLS];
  /** Every accepted command with its tick: seed + this log replays the match exactly. */
  log: { tick: number; cmd: Command }[] = [];
  private bot!: Bot;
  private autoBot: Bot | null = null;
  /** The screen layout with the whole map in view, and the camera on top of it (DEC-016). */
  private base!: Layout;
  private view: View = overviewView();
  private viewSet = false; // the first layout puts the camera on the usual view
  private layout!: Layout;
  /** Pointers on the canvas (two of them = a pinch), a field drag that may become a pan, the last tap. */
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d0: number; zoom0: number; wx: number; wy: number } | null = null;
  private pan: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  private lastTap: { x: number; y: number; at: number } | null = null;
  private ctx: CanvasRenderingContext2D;
  private renderer = new Renderer();
  private ui: UiState = { ring: null, command: null, aim: null, hover: null, toast: null, ultAim: null, callAim: null, choice: null };
  /**
   * What the finger that is down is doing: choosing on the order ring, aiming an order it slid out to,
   * pressing a ULT button or a call button (a drag onto the map aims it, PLAN-015), or flicking a hero.
   */
  private gesture: 'ring' | 'aim' | 'ult' | 'call' | null = null;
  private press: { hero?: HeroKind; call?: CallId } = {};
  private flick: { hero: HeroKind; x: number; y: number; at: number } | null = null;
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
      calls: [auto ? randomCalls(s ^ 0x13579bd) : this.calls, randomCalls(s)],
    });
    this.bot = new Bot(1, s, this.settings.bot);
    this.autoBot = this.opts.autoplay ? new Bot(0, s ^ 0x5bd1e995, 'normal') : null;
    this.log = [];
    this.renderer.reset();
    if (this.base) this.setView(homeView(this.base));
    this.ui = { ring: null, command: null, aim: null, hover: null, toast: null, ultAim: null, callAim: null, choice: null };
    this.gesture = null;
    this.flick = null;
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
    if (!this.viewSet) { this.viewSet = true; this.setView(homeView(this.base)); }
    else this.setView(this.view);
  }

  /** Move the camera (kept inside the map). */
  private setView(v: View): void {
    this.view = clampView(this.base, v);
    this.layout = applyView(this.base, this.view);
  }

  /** Double-tap: zoom in on a screen point, or back to the usual full-width view (keeping the height you were looking at). */
  private toggleZoom(sx: number, sy: number): void {
    const home = homeZoom(this.base);
    if (this.view.zoom > home * 1.05) { this.setView({ zoom: home, cx: this.view.cx, cy: this.view.cy }); return; }
    const [wx, wy] = toWorld(this.layout, sx, sy);
    this.setView({ zoom: home * ZOOM_IN, cx: wx, cy: wy });
  }

  /** If a hero is off the screen, scroll the map up or down to it (DEC-019). */
  private lookAtHero(kind: HeroKind, sideways = false): void {
    const h = this.sim.heroOf(0, kind);
    if (!h || !h.alive) return;
    const l = this.layout;
    const [sx, sy] = toScreen(l, h.x, h.y);
    const margin = l.field.h * 0.12;
    const offX = sx < l.field.x || sx > l.field.x + l.field.w;
    if (offX && sideways) this.setView({ zoom: this.view.zoom, cx: h.x, cy: h.y });
    else if (sy < l.field.y + margin || sy > l.field.y + l.field.h - margin) this.setView({ zoom: this.view.zoom, cx: this.view.cx, cy: h.y });
  }

  /** The corner button: see the whole map, and come back to the usual view. Where the whole map
   *  already fills the width, it zooms in and out instead. */
  private zoomButton(): void {
    const home = homeZoom(this.base);
    const f = this.layout.field;
    if (home <= 1.02) { this.toggleZoom(f.x + f.w / 2, f.y + f.h * 0.62); return; }
    if (this.view.zoom > 1.02) this.setView(overviewView());
    else this.setView({ zoom: home, cx: this.view.cx, cy: this.view.cy });
  }

  private frame(now: number): void {
    const dt = Math.min(250, now - this.last);
    this.last = now;
    // a hold on your hero on the map has lasted long enough: open its ring (no more scrolling)
    const ring = this.ui.ring;
    if (ring && ring.pending && performance.now() - ring.at >= HOLD_MS) { ring.pending = false; ring.at = performance.now(); this.pan = null; }
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
    this.renderer.addEvents(this.sim.events, now, this.sim);
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

  /** The hero whose panel (outside its buttons) is at a point. */
  private heroAt(x: number, y: number): HeroKind | null {
    const kinds = this.sim.players[0].picks;
    for (let i = 0; i < kinds.length; i++) {
      const p = this.layout.heroes[i];
      if (inRect(p.box, x, y) && !inRect(p.ult, x, y) && !inRect(p.power, x, y) && !inRect(p.badge, x, y) && !p.items.some((r) => inRect(r, x, y))) return kinds[i];
    }
    return null;
  }

  /** What a tap on the HUD buttons does (handled on release), or null. */
  private buttonAt(x: number, y: number):
    | { kind: 'gear' } | { kind: 'zoom' } | { kind: 'wave'; lane: LaneId } | { kind: 'ult'; hero: HeroKind } | { kind: 'shop'; hero: HeroKind | null }
    | { kind: 'menu-cancel' } | { kind: 'menu-bg' } | { kind: 'hold'; lane: LaneId } | { kind: 'power'; hero: HeroKind } | { kind: 'badge'; hero: HeroKind }
    | { kind: 'call'; call: CallId } | { kind: 'choose'; hero: HeroKind; option: 0 | 1 } | { kind: 'choice-bg' } | null {
    const l = this.layout;
    // The level-up choice card, while open (PLAN-015).
    if (this.ui.choice) {
      const card = choiceCard(l);
      if (inRect(card.box, x, y)) {
        const i = card.opts.findIndex((r) => inRect(r, x, y));
        return i >= 0 ? { kind: 'choose', hero: this.ui.choice, option: i as 0 | 1 } : { kind: 'choice-bg' };
      }
    }
    // While aiming an order or a call, its hint strip with Cancel takes the lane chips' place (DEC-021).
    if ((this.ui.command || this.ui.callAim) && inRect(l.menu.hint, x, y)) return inRect(l.menu.cancel, x, y) ? { kind: 'menu-cancel' } : { kind: 'menu-bg' };
    if (inRect(l.gear, x, y)) return { kind: 'gear' };
    if (inRect(l.zoomBtn, x, y)) return { kind: 'zoom' };
    const hd = l.holds.findIndex((r) => inRect(r, x, y));
    if (hd >= 0) return { kind: 'hold', lane: hd as LaneId };
    const w = l.waves.findIndex((r) => inRect(r, x, y));
    if (w >= 0) return { kind: 'wave', lane: w as LaneId };
    if (inRect(l.shop, x, y)) return { kind: 'shop', hero: this.ui.command?.hero ?? null };
    const c = l.calls.findIndex((r) => inRect(r, x, y));
    const calls = this.sim.players[0].calls;
    if (c >= 0 && calls[c]) return { kind: 'call', call: calls[c] };
    const kinds = this.sim.players[0].picks;
    for (let i = 0; i < kinds.length; i++) {
      const p = l.heroes[i];
      if (inRect(p.ult, x, y)) return { kind: 'ult', hero: kinds[i] };
      if (inRect(p.power, x, y)) return { kind: 'power', hero: kinds[i] };
      if (inRect(p.badge, x, y)) return { kind: 'badge', hero: kinds[i] };
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
    const ring = this.ui.ring;
    if (ring && ring.sticky) {
      // A press on an open ring chooses on it (tap an order, or slide out through one to aim);
      // a press anywhere else closes it and carries on as usual.
      if (Math.hypot(p.x - ring.cx, p.y - ring.cy) <= this.layout.menu.ringR + this.layout.menu.iconR + 10) {
        this.gesture = 'ring';
        ring.sel = this.ringSel(ring, p.x, p.y);
        return;
      }
      this.ui.ring = null;
    }
    const pressed = this.buttonAt(p.x, p.y);
    if (pressed) {
      // A ULT or call button can also be dragged onto the map to aim it (PLAN-015); a tap is handled on release.
      if (pressed.kind === 'ult' && ULT_AIMS[pressed.hero]) { this.gesture = 'ult'; this.press = { hero: pressed.hero }; }
      if (pressed.kind === 'call' && CALLS[pressed.call].aim !== 'none') { this.gesture = 'call'; this.press = { call: pressed.call }; }
      return;
    }
    if (this.ui.choice) this.ui.choice = null; // a press elsewhere closes the upgrade card
    // Press a hero's panel: its order ring opens just above it (DEC-021).
    const hero = this.heroAt(p.x, p.y);
    if (hero) { this.openRing(hero, p.x, p.y, false); return; }
    const inF = inField(this.layout, p.x, p.y);
    if (inF) this.pan = { x: p.x, y: p.y, cx: this.view.cx, cy: this.view.cy, moved: false };
    // Press your hero on the map: its ring opens round the finger after a short hold (or a tap).
    // an off-screen hero's tab at the map's edge is on top: a press there is for the tab, not a hero under it
    const onTab = this.renderer.offscreen.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 20);
    const onMap = inF && !onTab && !this.ui.command && !this.ui.callAim ? this.heroOnMapAt(p.x, p.y) : null;
    if (onMap) { this.openRing(onMap, p.x, p.y, true); this.flick = { hero: onMap, x: p.x, y: p.y, at: performance.now() }; return; }
    this.ui.hover = p;
  }

  /** Open a hero's order ring: round the finger on the map, or above the hero's panel. */
  private openRing(hero: HeroKind, x: number, y: number, onMap: boolean): void {
    const i = this.sim.players[0].picks.indexOf(hero);
    const panel = onMap ? null : this.layout.heroes[i]?.box ?? null;
    const [cx, cy] = ringCenter(this.layout, x, y, panel);
    this.ui.ring = { hero, cx, cy, sel: null, sticky: false, pending: onMap, at: performance.now() };
    this.ui.command = null;
    this.ui.aim = null;
    this.gesture = 'ring';
    if (!onMap) this.lookAtHero(hero);
  }

  /** The order whose disc is under a point on the open ring, if any. */
  private ringSel(ring: NonNullable<UiState['ring']>, x: number, y: number): CommandAction | null {
    const i = ringSlotAt(this.layout, ring.cx, ring.cy, x, y, COMMAND_ORDERS.length);
    return i === null ? null : COMMAND_ORDERS[i].id;
  }

  /** Take the order chosen on the ring: Retreat goes at once; the rest light up their targets. */
  private commitRing(fingerDown: boolean): void {
    const ring = this.ui.ring;
    if (!ring || !ring.sel) return;
    this.ui.ring = null;
    this.chooseOrder(ring.hero, ring.sel);
    this.gesture = fingerDown && this.ui.command ? 'aim' : null;
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
      const zoom = Math.max(1, Math.min(maxZoom(this.base), (this.pinch.zoom0 * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.d0));
      // keep the world point that started between the fingers under the fingers' midpoint
      const scale = this.base.baseScale * zoom;
      const mx = (a.x + b.x) / 2 - (this.base.field.x + this.base.field.w / 2);
      const my = (a.y + b.y) / 2 - (this.base.field.y + this.base.field.h / 2);
      this.setView({ zoom, cx: this.pinch.wx - mx / scale, cy: this.pinch.wy - my / scale });
      return;
    }
    const moved = (d: { x: number; y: number }) => this.down !== null && Math.hypot(d.x - this.down.x, d.y - this.down.y) > TAP_SLOP;
    // Dragging a ULT or call button out onto the map: aiming (PLAN-015).
    if (this.gesture === 'ult' && this.press.hero && moved(p)) { this.ui.ultAim = { hero: this.press.hero, x: p.x, y: p.y }; return; }
    if (this.gesture === 'call' && this.press.call && moved(p)) { this.ui.callAim = { call: this.press.call, x: p.x, y: p.y, drag: true }; return; }
    const ring = this.ui.ring;
    if (this.gesture === 'ring' && ring) {
      if (ring.pending) {
        // moved before the hold: a scroll of the map, or (let go quickly) a flick that dashes the hero (PLAN-015)
        if (!moved(p)) return;
        this.ui.ring = null;
        this.gesture = null;
      } else {
        const m = this.layout.menu;
        const d = Math.hypot(p.x - ring.cx, p.y - ring.cy);
        const sel = this.ringSel(ring, p.x, p.y);
        if (sel) ring.sel = sel;
        else if (ring.sel && d > m.ringR + m.iconR + 8 && moved(p)) {
          // slid out of the ring through an order: keep the finger down and let go on the target
          this.commitRing(true);
          if (this.ui.command) this.ui.aim = p; // aiming (Retreat is already sent)
          return;
        } else if (d < m.ringR - m.iconR) ring.sel = null;
        return;
      }
    }
    if (this.gesture === 'aim') { this.ui.aim = p; return; }
    // One finger dragged on the field: look around (the camera stays inside the map).
    if (this.pan && (this.pan.moved || moved(p))) {
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
    const gesture = this.gesture;
    this.gesture = null;
    const tap = !wasDown || Math.hypot(p.x - wasDown.x, p.y - wasDown.y) <= TAP_SLOP;
    const flick = this.flick;
    this.flick = null;
    // PLAN-015: let go after dragging ULT or a call onto the map: aim there
    if (gesture === 'ult' && this.ui.ultAim) {
      const hero = this.ui.ultAim.hero;
      this.ui.ultAim = null;
      const r = ultAimAt(this.layout, this.sim, hero, p.x, p.y - DRAG_LIFT);
      if (r.cmd && this.ultBlocked(hero)) return;
      if (r.cmd) { this.send(r.cmd); this.toast(`${HEROES[hero].ult.name}!`); } else this.toast(`${HEROES[hero].ult.name}: ${r.why}`);
      return;
    }
    if (gesture === 'call' && this.ui.callAim?.drag) {
      const call = this.ui.callAim.call;
      this.ui.callAim = null;
      this.aimCall(call, p.x, p.y - DRAG_LIFT);
      return;
    }
    if (flick && pan?.moved && performance.now() - flick.at <= FLICK_UP_MS && Math.hypot(p.x - flick.x, p.y - flick.y) >= FLICK_PX) {
      // a quick flick on your hero, not a scroll: put the map back and dash
      this.setView({ zoom: this.view.zoom, cx: pan.cx, cy: pan.cy });
      this.dash(flick.hero, flick.x, flick.y, p.x, p.y);
      return;
    }
    const ring = this.ui.ring;
    if (gesture === 'ring' && ring) {
      // Letting go on the order ring (DEC-021).
      if (ring.pending) { ring.pending = false; ring.sticky = true; ring.at = performance.now(); this.lastTap = null; return; } // a quick tap on your hero
      const m = this.layout.menu;
      const onIcon = this.ringSel(ring, p.x, p.y);
      if (onIcon) { ring.sel = onIcon; this.commitRing(false); return; }
      if (!ring.sticky && tap) { ring.sticky = true; ring.sel = null; return; } // a quick tap: the ring stays open for a tap
      if (!ring.sticky && ring.sel && Math.hypot(p.x - ring.cx, p.y - ring.cy) >= m.ringR - m.iconR) { this.commitRing(false); return; }
      this.ui.ring = null; // let go in the middle: nothing chosen
      return;
    }
    if (gesture === 'aim' && this.ui.command) {
      // Let go on the target after sliding out of the ring: the aim point is just above the finger.
      const cmd = this.ui.command;
      this.ui.aim = null;
      const ax = p.x;
      const ay = p.y - DRAG_LIFT;
      const order = inField(this.layout, ax, ay) ? resolveCommand(this.layout, this.sim, cmd.hero, cmd.action, ax, ay) : null;
      if (order) { this.send(order); this.ui.command = null; this.announce(cmd.hero); }
      else this.toast(COMMAND_ORDERS.find((o) => o.id === cmd.action)?.hint ?? 'Tap a highlighted target'); // still aiming: tap a target
      return;
    }
    const btn = wasDown ? this.buttonAt(wasDown.x, wasDown.y) : null;
    const same = btn && JSON.stringify(btn) === JSON.stringify(this.buttonAt(p.x, p.y));
    if (btn && same) {
      this.cancelDrag();
      if (btn.kind === 'gear') document.dispatchEvent(new CustomEvent('open-settings'));
      else if (btn.kind === 'zoom') this.zoomButton();
      else if (btn.kind === 'wave') this.cycleWave(btn.lane);
      else if (btn.kind === 'ult') this.callUlt(btn.hero);
      else if (btn.kind === 'shop') document.dispatchEvent(new CustomEvent('open-shop', { detail: btn.hero ?? this.sim.players[0].picks[0] }));
      else if (btn.kind === 'menu-cancel') { this.ui.command = null; this.ui.callAim = null; }
      else if (btn.kind === 'hold') this.toggleHold(btn.lane);
      else if (btn.kind === 'power') this.cuePower(btn.hero);
      else if (btn.kind === 'badge') this.openChoice(btn.hero);
      else if (btn.kind === 'call') this.useCall(btn.call);
      else if (btn.kind === 'choose') this.choose(btn.hero, btn.option);
      return;
    }
    if (btn?.kind === 'menu-bg' || btn?.kind === 'choice-bg') return; // a press on the hint strip or the card
    if (pan?.moved) { this.ui.hover = null; return; } // that was a look around, not a tap
    // a tap on an off-screen hero's tab at the map's edge: look there (PLAN-013)
    const tab = tap ? this.renderer.offscreen.find((t) => Math.hypot(t.x - p.x, t.y - p.y) < 20) : undefined;
    if (tab && !this.ui.command) { this.lookAtHero(tab.hero, true); this.lastTap = null; return; }
    const ca = this.ui.callAim;
    if (ca && inField(this.layout, p.x, p.y)) { this.aimCall(ca.call, p.x, p.y); return; } // aiming a call: the tap picks the spot
    const cmd = this.ui.command;
    if (cmd && inField(this.layout, p.x, p.y)) {
      // Aiming an order: the tap picks the target.
      const order = resolveCommand(this.layout, this.sim, cmd.hero, cmd.action, p.x, p.y);
      if (!order) { this.toast(COMMAND_ORDERS.find((o) => o.id === cmd.action)?.hint ?? 'Tap a highlighted target'); return; }
      this.send(order);
      this.ui.command = null;
      this.announce(cmd.hero);
      return;
    }
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

  /** An order chosen on the ring: Retreat goes at once; the rest wait for a target on the map. */
  private chooseOrder(hero: HeroKind, action: CommandAction): void {
    this.ui.command = null;
    if (action === 'retreat') {
      this.send({ t: 'order', player: 0, hero, order: 'retreat' });
      this.announce(hero);
      return;
    }
    if (action !== 'move' && commandTargets(this.sim, hero, action).length === 0) {
      this.toast(action === 'attack' ? 'No enemy in sight' : 'Nothing to aim at right now');
      return;
    }
    this.ui.command = { hero, action };
  }

  /** Say what the hero is doing now (after the order is applied on the next step). */
  private announce(kind: HeroKind): void {
    window.setTimeout(() => {
      const h = this.sim.heroOf(0, kind);
      if (h) this.toast(`${HEROES[kind].name}: ${orderLabel(h, this.sim)}`);
    }, 80);
  }

  // ---------- PLAN-015 (DEC-023, DEC-024) ----------

  /** Why an aimed ultimate can't go now (it shows a message), or false. */
  private ultBlocked(kind: HeroKind): boolean {
    const h = this.sim.heroOf(0, kind);
    const name = HEROES[kind].ult.name;
    if (!h || !h.alive) { this.toast(`${HEROES[kind].name} is down`); return true; }
    if (!h.ultReady) { this.toast(h.level < 4 ? `${name}: unlocks at level 4` : `${name}: used this life`); return true; }
    if (h.stun > 0 || h.silence > 0) { this.toast(`${name}: not while ${h.stun > 0 ? 'stunned' : 'silenced'}`); return true; }
    return false;
  }

  /** A flick on your hero: dash the way the finger went (screen direction, turned into a map point far enough away). */
  private dash(kind: HeroKind, x0: number, y0: number, x1: number, y1: number): void {
    const h = this.sim.heroOf(0, kind);
    if (!h || !h.alive) return;
    if (h.dashCd > 0) { this.toast(`Dash ready in ${Math.ceil(h.dashCd / TICKS_PER_SECOND)}s`); return; }
    if (h.stun > 0) { this.toast('Can\u2019t dash while stunned'); return; }
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const x = Math.round(h.x + ((x1 - x0) / d) * 1000);
    const y = Math.round(h.y + ((y1 - y0) / d) * 1000);
    this.send({ t: 'dash', player: 0, hero: kind, x, y });
  }

  /** The Power gem: fire it now, 20% stronger, if it is ready. */
  private cuePower(kind: HeroKind): void {
    const h = this.sim.heroOf(0, kind);
    const def = HEROES[kind];
    if (!h || !h.alive) { this.toast(`${def.name} is down`); return; }
    if (h.powerCd > 0) { this.toast(`${def.power.name}: ready in ${Math.ceil(h.powerCd / TICKS_PER_SECOND)}s`); return; }
    if (h.silence > 0 || h.stun > 0) { this.toast(`${def.power.name}: not while ${h.stun > 0 ? 'stunned' : 'silenced'}`); return; }
    this.send({ t: 'power', player: 0, hero: kind });
    this.toast(`${def.power.name} on cue! +20%`);
  }

  /** A chip's hold toggle: hold that lane's waves at home, or release them all together. */
  private toggleHold(lane: LaneId): void {
    if (!this.sim.lanes.includes(lane)) { this.toast('No middle lane in 2-lane mode'); return; }
    const pl = this.sim.players[0];
    const name = LANE_NAMES[lane];
    if (pl.hold[lane]) {
      this.send({ t: 'rally', player: 0, lane, hold: false });
      this.toast(pl.held[lane] > 0 ? `${name}: Rally! ${pl.held[lane]} waves march together` : `${name}: waves march again`);
    } else {
      this.send({ t: 'rally', player: 0, lane, hold: true });
      this.toast(`${name}: holding waves at home (up to 3)`);
    }
  }

  /** The level badge: open the upgrade card if a choice waits. */
  private openChoice(kind: HeroKind): void {
    const h = this.sim.heroOf(0, kind);
    if (!h) return;
    if (this.sim.pendingChoice(h)) { this.ui.choice = kind; this.ui.ring = null; return; }
    const ups = h.upg.map((u, i) => (u < 0 ? '' : u === 0 ? `Lv${i + 2} ${HEROES[kind].power.name}` : i === 0 ? 'Lv2 Quick' : 'Lv3 Strong')).filter(Boolean);
    this.toast(ups.length ? `${HEROES[kind].name}: ${ups.join(', ')}` : `${HEROES[kind].name}: upgrades at levels 2 and 3`);
  }

  private choose(kind: HeroKind, option: 0 | 1): void {
    const h = this.sim.heroOf(0, kind);
    const lv = h ? this.sim.pendingChoice(h) : 0;
    this.ui.choice = null;
    if (!h || !lv) return;
    this.send({ t: 'pick', player: 0, hero: kind, option });
    this.toast(upgradeTexts(kind, h, lv)[option]);
  }

  /** A commander call button: fire it now, or start aiming it (tap a spot, a lane or a tower). */
  private useCall(call: CallId): void {
    const def = CALLS[call];
    const why = this.sim.cantCall(0, call);
    const i = this.sim.players[0].calls.indexOf(call);
    if (why === 'cooldown') { this.toast(`${def.name}: ready in ${Math.ceil(this.sim.players[0].callCd[i] / TICKS_PER_SECOND)}s`); return; }
    if (why === 'semangat') { this.toast(`${def.name}: needs ${def.cost} ${MANA.name}`); return; }
    if (why) return;
    if (def.aim === 'none') { this.send({ t: 'call', player: 0, call }); this.toast(`${def.name}!`); return; }
    this.ui.command = null;
    this.ui.ring = null;
    this.ui.callAim = { call, x: 0, y: 0, drag: false };
  }

  private aimCall(call: CallId, sx: number, sy: number): void {
    const def = CALLS[call];
    const why = this.sim.cantCall(0, call);
    if (why) { this.ui.callAim = null; this.toast(why === 'semangat' ? `${def.name}: needs ${def.cost} ${MANA.name}` : `${def.name}: not ready`); return; }
    const r = callAimAt(this.layout, this.sim, call, sx, sy);
    if (!r.cmd) { this.toast(`${def.name}: ${r.why}`); return; } // still aiming (a tap) or dropped (a drag)
    this.send(r.cmd);
    this.ui.callAim = null;
    this.toast(`${def.name}!`);
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
    if (this.gesture === 'ring' && this.ui.ring && !this.ui.ring.sticky) this.ui.ring = null;
    this.gesture = null;
    this.ui.aim = null;
    this.ui.ultAim = null;
    if (this.ui.callAim?.drag) this.ui.callAim = null;
    this.flick = null;
    this.down = null;
    this.pan = null;
  }
}

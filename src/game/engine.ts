import type { Sfx } from "./audio";
import { CHARACTER_ATTACKS, swordHitsBoss, type CharacterId } from "./characters";

export const W = 960;
export const H = 540;
const GROUND = 456;
const WORLD = 2200;
const INK = "#1d1612";
export const BOSS_MAX = 520;

export type GameState = "menu" | "playing" | "paused" | "victory" | "defeat";
export interface InputState { left: boolean; right: boolean; jump: boolean; shoot: boolean; dash: boolean }
export interface GameStats { time: number; hitsTaken: number; bossPct: number; grade: string }

type EKind = "puff" | "lid" | "gear" | "cube" | "note";
interface EProj { x: number; y: number; vx: number; vy: number; r: number; kind: EKind; g: number; life: number; bounces: number; rot: number; dead?: boolean }
interface Bullet { x: number; y: number; vx: number; life: number; dead?: boolean }
interface Melee { x: number; y: number; face: number; life: number; hit: boolean }
type CharacterState = { hp: number; inv: number; dashCd: number; shootCd: number; anim: number; shootAnim: number };
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: "dot" | "ring" | "star" | "text" | "smoke"; text?: string }
type Attack = "steam" | "lid" | "gears" | "sugar" | "laser" | "notes";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function ell(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2);
}
function ink(c: CanvasRenderingContext2D, fill: string | null, w = 3) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round"; c.stroke();
}
function hose(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bend: number, w: number, color: string) {
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + bend, (y1 + y2) / 2, x2, y2);
  c.lineCap = "round"; c.lineWidth = w + 5; c.strokeStyle = INK; c.stroke();
  c.lineWidth = w; c.strokeStyle = color; c.stroke();
}
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}

export class Game {
  private c: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private scale = 1;
  state: GameState = "menu";
  private time = 0;
  private fightTime = 0;
  private hitsTaken = 0;
  private prev = { jump: false, dash: false };
  private camX = 0;
  private shake = 0;
  private grain: HTMLCanvasElement;
  private vignette: HTMLCanvasElement;
  private scenery = { clouds: [] as [number, number, number][], hills: [] as [number, number, number][], bldg: [] as [number, number, number, number][], props: [] as [number, number][], tufts: [] as [number, number][] };
  private p = this.newPlayer();
  activeCharacter: CharacterId = "anby";
  private characters: Record<CharacterId, CharacterState> = { anby: this.newPlayer(), nicole: this.newPlayer() };
  private melee: Melee[] = [];
  private b = this.newBoss();
  private bullets: Bullet[] = [];
  private eps: EProj[] = [];
  private parts: Part[] = [];
  private ghosts: { x: number; y: number; face: number; life: number; character: CharacterId }[] = [];
  private shadows: { x: number; t: number }[] = [];
  private banner: { text: string; t: number; max: number; sub?: string } | null = null;
  private endTimer = -1;
  private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private input: InputState, private sfx: Sfx, private onState: (s: GameState, stats?: GameStats) => void) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This game requires a 2D canvas.");
    this.c = context;
    this.grain = this.makeGrain();
    this.vignette = this.makeVignette();
    this.makeScenery();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  private newPlayer() {
    return { x: 320, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, hp: 5, inv: 0, dashT: 0, dashCd: 0, shootCd: 0, coyote: 0, buffer: 0, anim: 0, dead: false, shootAnim: 0 };
  }
  private newBoss() {
    return { x: 1000, y: GROUND, hp: BOSS_MAX, phase: 1, face: -1, state: "intro" as "intro" | "idle" | "wind" | "recover" | "hop" | "dying", t: 2.2, attack: null as Attack | null, lastAttack: null as Attack | null, flash: 0, inv: 0, hopY: 0, hopVy: 0, hopVx: 0, clock: 0, lidGone: 0, laser: null as null | { lane: number; t: number; fire: boolean; dir: number }, dyingT: 0, walk: 0 };
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = this.canvas.clientWidth || W;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round((cw * H / W) * dpr);
    this.scale = this.canvas.width / W;
  }

  private makeGrain() {
    const g = document.createElement("canvas");
    g.width = g.height = 200;
    const gc = g.getContext("2d");
    if (!gc) return g;
    const img = gc.createImageData(200, 200);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 135;
      img.data[i] = v; img.data[i + 1] = v * 0.92; img.data[i + 2] = v * 0.78; img.data[i + 3] = Math.random() * 60;
    }
    gc.putImageData(img, 0, 0);
    return g;
  }
  private makeVignette() {
    const v = document.createElement("canvas");
    v.width = W; v.height = H;
    const vc = v.getContext("2d");
    if (!vc) return v;
    const gr = vc.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
    gr.addColorStop(0, "rgba(60,35,15,0)");
    gr.addColorStop(1, "rgba(60,35,15,0.55)");
    vc.fillStyle = gr; vc.fillRect(0, 0, W, H);
    return v;
  }
  private makeScenery() {
    const s = this.scenery;
    for (let x = 0; x < WORLD * 0.12 + W; x += rnd(180, 300)) s.clouds.push([x, rnd(40, 160), rnd(30, 55)]);
    for (let x = -100; x < WORLD * 0.25 + W; x += rnd(160, 260)) s.hills.push([x, rnd(90, 160), rnd(140, 220)]);
    for (let x = -50; x < WORLD * 0.55 + W; x += rnd(70, 130)) s.bldg.push([x, rnd(60, 110), rnd(90, 210), Math.random() < 0.18 ? 1 : 0]);
    for (let x = 150; x < WORLD; x += rnd(320, 480)) s.props.push([x, Math.random() < 0.5 ? 0 : 1]);
    for (let x = 0; x < WORLD * 1.25 + W; x += rnd(90, 200)) s.tufts.push([x, rnd(0.7, 1.3)]);
  }

  run() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - this.last) / 1000, 1 / 30);
      this.last = t;
      this.time += dt;
      if (this.state === "playing") this.update(dt);
      else if (this.state === "menu") this.attract(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.sfx.stopMusic(); }

  start() {
    this.p = this.newPlayer();
    this.activeCharacter = "anby";
    this.characters = { anby: this.newPlayer(), nicole: this.newPlayer() };
    this.melee = [];
    this.prev = { jump: false, dash: false };
    this.b = this.newBoss();
    this.bullets = []; this.eps = []; this.parts = []; this.ghosts = []; this.shadows = [];
    this.fightTime = 0; this.hitsTaken = 0; this.endTimer = -1; this.camX = 0;
    this.banner = { text: "A KNOCKOUT AWAITS!", t: 0, max: 1.4 };
    this.sfx.ensure(); this.sfx.startMusic();
    this.setState("playing");
  }
  pause() { if (this.state === "playing") { this.setState("paused"); this.sfx.stopMusic(); } }
  resume() { if (this.state === "paused") { this.last = performance.now(); this.sfx.ensure(); this.sfx.startMusic(); this.setState("playing"); } }
  toMenu() { this.sfx.stopMusic(); this.p = this.newPlayer(); this.activeCharacter = "anby"; this.b = this.newBoss(); this.eps = []; this.bullets = []; this.melee = []; this.setState("menu"); }
  switchCharacter(character: CharacterId): boolean {
    if (this.state !== "playing" || this.p.dead || this.b.state === "dying" || character === this.activeCharacter) return false;
    const { hp, inv, dashCd, shootCd, anim, shootAnim } = this.p;
    this.characters[this.activeCharacter] = { hp, inv, dashCd, shootCd, anim, shootAnim };
    const next = this.characters[character];
    // Copy only local fields: initial character records may also contain spawn physics.
    this.p.hp = next.hp; this.p.inv = next.inv;
    this.p.dashCd = next.dashCd; this.p.shootCd = next.shootCd;
    this.p.anim = next.anim; this.p.shootAnim = next.shootAnim;
    this.activeCharacter = character;
    return true;
  }
  private setState(s: GameState, stats?: GameStats) { this.state = s; this.onState(s, stats); }

  private attract(dt: number) {
    this.p.anim += dt * 2; this.b.clock += dt;
    this.camX += (Math.sin(this.time * 0.15) * 300 + 300 - this.camX) * dt;
  }

  // ---------------- update ----------------
  private update(dt: number) {
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.max) this.banner = null; }
    this.fightTime += dt;
    this.updatePlayer(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    for (const pt of this.parts) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; if (pt.kind === "dot") pt.vy += 900 * dt; if (pt.kind === "smoke") { pt.vy -= 20 * dt; pt.size += 20 * dt; } }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    // camera
    const mid = (this.p.x + this.b.x) / 2;
    let target = mid - W / 2;
    target = clamp(target, this.p.x - W + 140, this.p.x - 140);
    target = clamp(target, 0, WORLD - W);
    this.camX += (target - this.camX) * Math.min(1, dt * 5);
    if (this.endTimer >= 0) {
      this.endTimer -= dt;
      if (this.endTimer < 0) this.finish();
    }
  }

  private finish() {
    const won = this.b.hp <= 0;
    const h = this.hitsTaken;
    const grade = !won ? "—" : h === 0 ? "A+" : h <= 1 ? "A" : h <= 3 ? "B" : "C";
    this.sfx.stopMusic();
    if (won) this.sfx.victory(); else this.sfx.defeat();
    this.setState(won ? "victory" : "defeat", { time: this.fightTime, hitsTaken: h, bossPct: Math.round((1 - Math.max(0, this.b.hp) / BOSS_MAX) * 100), grade });
  }

  private updatePlayer(dt: number) {
    const p = this.p, i = this.input;
    if (p.dead) { p.vy += 2200 * dt; p.y = Math.min(GROUND, p.y + p.vy * dt); return; }
    const jumpPressed = i.jump && !this.prev.jump;
    const dashPressed = i.dash && !this.prev.dash;
    this.prev.jump = i.jump; this.prev.dash = i.dash;
    p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.shootCd = Math.max(0, p.shootCd - dt);
    p.shootAnim = Math.max(0, p.shootAnim - dt);
    const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (dashPressed && p.dashCd <= 0) {
      if (dir) p.face = dir;
      p.dashT = 0.2; p.dashCd = 0.7; p.inv = Math.max(p.inv, 0.25);
      this.sfx.dash();
      for (let k = 0; k < 8; k++) this.parts.push({ x: p.x, y: p.y - 40, vx: -p.face * rnd(50, 200), vy: rnd(-80, 80), life: 0.4, max: 0.4, size: rnd(6, 12), color: "#efe4cc", kind: "smoke" });
    }
    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.face * 820; p.vy = 0;
      if (Math.random() < 0.6) this.ghosts.push({ x: p.x, y: p.y, face: p.face, life: 0.22, character: this.activeCharacter });
    } else {
      const tgt = dir * 340;
      const acc = p.onGround ? 4200 : 2800;
      if (p.vx < tgt) p.vx = Math.min(tgt, p.vx + acc * dt); else p.vx = Math.max(tgt, p.vx - acc * dt);
      if (dir && !i.shoot) p.face = dir; else if (dir && i.shoot && p.shootCd <= 0) p.face = dir;
      if (jumpPressed) p.buffer = 0.13; else p.buffer -= dt;
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = -800; p.coyote = 0; p.buffer = 0; p.onGround = false; this.sfx.jump();
        for (let k = 0; k < 5; k++) this.parts.push({ x: p.x + rnd(-10, 10), y: GROUND, vx: rnd(-90, 90), vy: rnd(-60, -10), life: 0.35, max: 0.35, size: rnd(5, 9), color: "#efe4cc", kind: "smoke" });
      }
      p.vy += 2250 * dt;
      if (!i.jump && p.vy < 0) p.vy += 2600 * dt;
    }
    p.x = clamp(p.x + p.vx * dt, 30, WORLD - 30);
    p.y += p.vy * dt;
    if (p.y >= GROUND) { if (!p.onGround && p.vy > 300) this.parts.push({ x: p.x, y: GROUND, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 14, color: INK, kind: "ring" }); p.y = GROUND; p.vy = 0; p.onGround = true; p.coyote = 0.1; }
    else { p.onGround = false; p.coyote -= dt; }
    p.anim += dt * (Math.abs(p.vx) > 20 && p.onGround ? 14 : 3);
    if (i.shoot && p.shootCd <= 0) {
      const attack = CHARACTER_ATTACKS[this.activeCharacter];
      p.shootCd = attack.cooldown; p.shootAnim = attack.duration;
      if (this.activeCharacter === "anby") {
        this.melee.push({ x: p.x, y: p.y, face: p.face, life: attack.duration, hit: false });
        this.sfx.slash();
      } else {
        this.bullets.push({ x: p.x + p.face * 52, y: p.y - 58, vx: p.face * CHARACTER_ATTACKS.nicole.speed, life: CHARACTER_ATTACKS.nicole.lifetime });
        this.sfx.shoot();
      }
    }
    // contact with boss
    const b = this.b;
    if (b.state !== "dying" && Math.hypot(p.x - b.x, (p.y - 45) - (b.y + b.hopY - 130)) < 110) this.hurtPlayer(Math.sign(p.x - b.x) || 1);
  }

  private hurtPlayer(fromDir: number) {
    const p = this.p;
    if (p.inv > 0 || p.dashT > 0 || p.dead || this.b.state === "dying") return;
    p.hp--; this.hitsTaken++; p.inv = 1.4; p.vx = fromDir * 420; p.vy = -420;
    this.shake = 7; this.sfx.hurt();
    this.burst(p.x, p.y - 50, "#c4473a", 14);
    this.parts.push({ x: p.x, y: p.y - 110, vx: 0, vy: -60, life: 0.8, max: 0.8, size: 26, color: "#c4473a", kind: "text", text: "OUCH!" });
    if (p.hp <= 0) {
      p.dead = true; this.endTimer = 1.6;
      this.banner = { text: "KNOCKED OUT!", t: 0, max: 2 };
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = rnd(120, 380);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, life: rnd(0.3, 0.6), max: 0.6, size: rnd(3, 6), color, kind: "dot" });
    }
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 30, color, kind: "star" });
  }

  private spoutTip() {
    const b = this.b;
    return { x: b.x + b.face * 172, y: b.y + b.hopY - 178 };
  }

  private updateBoss(dt: number) {
    const b = this.b, p = this.p;
    b.clock += dt * (b.state === "wind" ? 6 : 1) * b.phase;
    b.flash = Math.max(0, b.flash - dt); b.inv = Math.max(0, b.inv - dt); b.lidGone = Math.max(0, b.lidGone - dt);
    if (b.state === "dying") {
      b.dyingT += dt;
      if (Math.random() < 0.3) { this.burst(b.x + rnd(-100, 100), b.y - rnd(40, 220), "#e8b04a", 8); this.sfx.boom(); this.shake = Math.max(this.shake, 4); }
      return;
    }
    if (b.state !== "hop" && b.state !== "wind") b.face = Math.sign(p.x - b.x) || b.face;
    // drift to keep distance
    if (b.state === "idle" || b.state === "recover" || b.state === "intro") {
      const dx = p.x - b.x, ad = Math.abs(dx);
      let mv = 0;
      if (ad < 330) mv = -Math.sign(dx); else if (ad > 560) mv = Math.sign(dx);
      const spd = 70 + b.phase * 30;
      const nx = clamp(b.x + mv * spd * dt, 180, WORLD - 180);
      if (mv) b.walk += dt * 8;
      // cornered: hop over the player
      if (mv && nx === b.x && ad < 260 && b.state === "idle") {
        b.state = "hop"; b.hopVy = -950; b.hopVx = Math.sign(dx) * 520; this.sfx.whistle();
      } else b.x = nx;
    }
    if (b.state === "hop") {
      b.hopVy += 1700 * dt; b.hopY += b.hopVy * dt; b.x = clamp(b.x + b.hopVx * dt, 180, WORLD - 180);
      if (b.hopY >= 0) { b.hopY = 0; b.state = "recover"; b.t = 0.6; this.shake = 6; this.sfx.thud(); this.parts.push({ x: b.x, y: GROUND, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 60, color: INK, kind: "ring" }); }
      return;
    }
    // laser lifecycle
    if (b.laser) {
      b.laser.t -= dt;
      if (b.laser.fire) {
        const tip = this.spoutTip();
        const sx = tip.x + b.laser.dir * 60;
        const inX = b.laser.dir > 0 ? p.x > sx : p.x < sx;
        if (inX && Math.abs((p.y - 45) - b.laser.lane) < 40) this.hurtPlayer(b.laser.dir);
        if (Math.random() < 0.5) this.parts.push({ x: sx + b.laser.dir * rnd(0, 900), y: b.laser.lane + rnd(-14, 14), vx: 0, vy: -40, life: 0.4, max: 0.4, size: rnd(8, 16), color: "#f4ead2", kind: "smoke" });
        if (b.laser.t <= 0) b.laser = null;
      }
    }
    b.t -= dt;
    if (b.t > 0) return;
    if (b.state === "intro" || b.state === "recover") {
      b.state = "idle"; b.t = 0.35;
      if (this.banner == null && b.phase === 1 && this.fightTime < 3) this.banner = { text: "FIGHT!", t: 0, max: 0.9 };
    } else if (b.state === "idle") {
      const lists: Record<number, Attack[]> = { 1: ["steam", "lid", "steam"], 2: ["steam", "gears", "sugar", "lid"], 3: ["laser", "gears", "sugar", "notes", "laser"] };
      const opts = (lists[b.phase] ?? lists[1] ?? ["steam"]).filter((a) => a !== b.lastAttack);
      const a: Attack = opts[Math.floor(Math.random() * opts.length)] ?? "steam";
      b.attack = a; b.lastAttack = a; b.state = "wind";
      const winds: Record<Attack, number> = { steam: 0.75, lid: 0.7, gears: 0.85, sugar: 0.5, laser: 1.0, notes: 0.65 };
      b.t = winds[a];
      this.sfx.tele();
      if (a === "sugar") {
        const n = b.phase === 3 ? 6 : 5;
        const start = p.x - (n - 1) * 70 + rnd(-40, 40);
        for (let k = 0; k < n; k++) this.shadows.push({ x: clamp(start + k * 140 + (k % 2) * 20, 40, WORLD - 40), t: 0 });
      }
      if (a === "laser") b.laser = { lane: Math.random() < 0.5 ? GROUND - 24 : GROUND - 120, t: 0, fire: false, dir: b.face };
    } else if (b.state === "wind") {
      if (b.attack) this.execute(b.attack);
      b.state = "recover";
      b.t = [0, 1.25, 1.0, 0.8][b.phase] ?? 0.8;
    }
  }

  private execute(a: Attack) {
    const b = this.b, p = this.p, tip = this.spoutTip();
    if (a === "steam") {
      const n = b.phase === 1 ? 3 : 4;
      for (let k = 0; k < n; k++) {
        const T = 0.85 + k * 0.2, g = 900;
        const tx = p.x + (k - (n - 1) / 2) * 90, ty = GROUND - 30;
        this.eps.push({ x: tip.x, y: tip.y, vx: (tx - tip.x) / T, vy: (ty - tip.y - 0.5 * g * T * T) / T, r: 17, kind: "puff", g, life: 4, bounces: 0, rot: 0 });
      }
      this.sfx.whistle();
    } else if (a === "lid") {
      b.lidGone = 2.4;
      this.eps.push({ x: b.x, y: b.y - 215, vx: b.face * (380 + b.phase * 40), vy: -520, r: 24, kind: "lid", g: 1500, life: 5, bounces: 3, rot: 0 });
      this.sfx.thud();
    } else if (a === "gears") {
      const n = b.phase === 3 ? 3 : 2;
      for (let k = 0; k < n; k++) this.eps.push({ x: b.x - b.face * 20 - b.face * k * 230, y: GROUND - 28, vx: b.face * (360 + k * 20), vy: 0, r: 28, kind: "gear", g: 0, life: 7, bounces: 0, rot: 0 });
      this.sfx.thud();
    } else if (a === "sugar") {
      for (const s of this.shadows) this.eps.push({ x: s.x, y: -40 - Math.random() * 60, vx: 0, vy: 0, r: 18, kind: "cube", g: 1700, life: 3, bounces: 0, rot: rnd(0, 6) });
    } else if (a === "laser") {
      if (b.laser) { b.laser.fire = true; b.laser.t = 0.6; this.shake = 4; this.sfx.boom(); }
    } else if (a === "notes") {
      for (let k = -3; k <= 3; k++) {
        const ang = Math.atan2(p.y - 50 - tip.y, p.x - tip.x) + k * 0.16;
        this.eps.push({ x: tip.x, y: tip.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400, r: 11, kind: "note", g: 0, life: 4, bounces: 0, rot: 0 });
      }
      this.sfx.whistle();
    }
  }

  private updateProjectiles(dt: number) {
    const b = this.b, p = this.p;
    const bc = { x: b.x, y: b.y + b.hopY - 130 };
    for (const slash of this.melee) {
      slash.life -= dt;
      if (!slash.hit && b.state !== "dying" && b.state !== "intro" && b.inv <= 0 && swordHitsBoss(slash.x, slash.y, slash.face, bc.x, bc.y)) {
        slash.hit = true;
        b.hp -= CHARACTER_ATTACKS.anby.damage; b.flash = 0.1; this.sfx.hit();
        this.burst(slash.x + slash.face * 100, slash.y - 70, "#c9d84a", 6);
        this.checkPhase();
      }
    }
    this.melee = this.melee.filter((slash) => slash.life > 0);
    for (const bl of this.bullets) {
      bl.x += bl.vx * dt; bl.life -= dt;
      if (bl.life <= 0) bl.dead = true;
      if (b.state !== "dying" && Math.hypot(bl.x - bc.x, bl.y - bc.y) < 100) {
        bl.dead = true;
        if (b.inv <= 0 && b.state !== "intro") {
          b.hp -= CHARACTER_ATTACKS.nicole.damage; b.flash = 0.06; this.sfx.hit();
          if (Math.random() < 0.5) this.parts.push({ x: bl.x, y: bl.y, vx: rnd(-40, 40), vy: rnd(-200, -80), life: 0.25, max: 0.25, size: 5, color: "#f2c94c", kind: "dot" });
          this.checkPhase();
        } else this.parts.push({ x: bl.x, y: bl.y, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 10, color: "#efe4cc", kind: "ring" });
      }
    }
    this.bullets = this.bullets.filter((x) => !x.dead);
    for (const e of this.eps) {
      e.vy += e.g * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt; e.rot += dt * (e.kind === "gear" ? e.vx / 28 : 4);
      if (e.y + e.r >= GROUND && e.kind !== "gear") {
        if (e.kind === "lid" && e.bounces > 0) { e.y = GROUND - e.r; e.vy = -Math.abs(e.vy) * 0.72; e.bounces--; this.sfx.thud(); }
        else if (e.kind === "lid") { e.y = GROUND - e.r; e.vy = 0; e.g = 0; }
        else {
          e.dead = true;
          this.parts.push({ x: e.x, y: GROUND, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 26, color: INK, kind: "ring" });
          for (let k = 0; k < 4; k++) this.parts.push({ x: e.x, y: GROUND - 6, vx: rnd(-80, 80), vy: rnd(-60, -10), life: 0.4, max: 0.4, size: rnd(6, 10), color: "#f4ead2", kind: "smoke" });
          if (e.kind === "cube") this.shadows = this.shadows.filter((s) => Math.abs(s.x - e.x) > 1);
        }
      }
      if (e.life <= 0 || e.x < -100 || e.x > WORLD + 100) e.dead = true;
      if (!e.dead && Math.hypot(p.x - e.x, p.y - 45 - e.y) < e.r + 24) { this.hurtPlayer(Math.sign(e.vx) || 1); if (e.kind !== "gear") e.dead = true; }
    }
    this.eps = this.eps.filter((x) => !x.dead);
    for (const s of this.shadows) s.t += dt;
  }

  private checkPhase() {
    const b = this.b;
    const ratio = b.hp / BOSS_MAX;
    if (b.hp <= 0) {
      b.hp = 0; b.state = "dying"; b.laser = null; this.eps = []; this.shadows = [];
      this.banner = { text: "KNOCKOUT!", t: 0, max: 2.6 };
      this.shake = 14; this.sfx.boom(); this.endTimer = 2.8; this.p.inv = 9;
      return;
    }
    const want = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    if (want > b.phase) {
      b.phase = want; b.inv = 1.6; b.state = "recover"; b.t = 1.8; b.laser = null;
      this.eps = []; this.shadows = [];
      this.shake = 12; this.sfx.phase();
      this.banner = { text: want === 2 ? "PHASE II: FULL BOIL" : "PHASE III: OVERWOUND", t: 0, max: 1.8 };
      for (let k = 0; k < 24; k++) this.parts.push({ x: b.x + rnd(-90, 90), y: b.y - rnd(60, 220), vx: rnd(-160, 160), vy: rnd(-160, -40), life: 0.9, max: 0.9, size: rnd(12, 24), color: "#f4ead2", kind: "smoke" });
    }
  }

  // ---------------- render ----------------
  private render() {
    const c = this.c;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const sx = this.shake ? rnd(-this.shake, this.shake) : 0, sy = this.shake ? rnd(-this.shake, this.shake) : 0;
    c.save();
    c.translate(sx, sy);
    this.drawBackground();
    const cx = this.camX;
    c.save();
    c.translate(-cx, 0);
    this.drawProps();
    // shadows/telegraphs
    for (const s of this.shadows) {
      const k = Math.min(1, s.t / 0.9);
      ell(c, s.x, GROUND + 4, 10 + 16 * k, 5 + 3 * k); c.fillStyle = `rgba(29,22,18,${0.25 + 0.35 * k})`; c.fill();
    }
    this.drawLaser();
    this.drawBoss();
    for (const g of this.ghosts) { c.globalAlpha = g.life * 2; this.drawCharacter(g.character, g.x, g.y, g.face, true); }
    c.globalAlpha = 1;
    const p = this.p;
    if (!(p.inv > 0 && p.dashT <= 0 && Math.floor(this.time * 20) % 2 === 0 && !p.dead)) this.drawCharacter(this.activeCharacter, p.x, p.y, p.face, false);
    for (const slash of this.melee) this.drawMelee(slash);
    for (const bl of this.bullets) this.drawBullet(bl);
    for (const e of this.eps) this.drawEP(e);
    this.drawParts();
    c.restore();
    this.drawForeground();
    c.restore();
    // post: grain, vignette
    c.globalAlpha = 0.5;
    c.globalCompositeOperation = "multiply";
    const ox = Math.floor(Math.random() * 200), oy = Math.floor(Math.random() * 200);
    for (let x = -ox; x < W; x += 200) for (let y = -oy; y < H; y += 200) c.drawImage(this.grain, x, y);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.drawImage(this.vignette, 0, 0);
    if (Math.random() < 0.06) { c.strokeStyle = "rgba(40,25,10,0.25)"; c.lineWidth = 1; c.beginPath(); const lx = rnd(0, W); c.moveTo(lx, 0); c.lineTo(lx + rnd(-10, 10), H); c.stroke(); }
    if (this.state !== "menu") this.drawHud();
    if (this.banner) this.drawBanner();
  }

  private drawBackground() {
    const c = this.c, cx = this.camX, t = this.time;
    const sky = c.createLinearGradient(0, 0, 0, GROUND);
    const p3 = this.b.phase === 3 && this.state !== "menu";
    sky.addColorStop(0, p3 ? "#d99a6c" : "#e7c48c"); sky.addColorStop(1, "#f4e4bf");
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // sun with rays
    const sunX = W * 0.72 - cx * 0.04, sunY = 110;
    c.save(); c.translate(sunX, sunY); c.rotate(t * 0.1);
    c.fillStyle = "rgba(246,213,138,0.45)";
    for (let k = 0; k < 14; k++) { c.rotate(Math.PI * 2 / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(600, -40); c.lineTo(600, 40); c.fill(); }
    c.restore();
    ell(c, sunX, sunY, 52, 52); ink(c, "#f3cf72", 3);
    // sleepy sun face
    c.beginPath(); c.arc(sunX - 16, sunY - 4, 7, 0.1 * Math.PI, 0.9 * Math.PI); c.arc(sunX + 16, sunY - 4, 7, 0.1 * Math.PI, 0.9 * Math.PI); ink(c, null, 2.5);
    c.beginPath(); c.arc(sunX, sunY + 12, 12, 0.15 * Math.PI, 0.85 * Math.PI); ink(c, null, 2.5);
    for (const [x, y, s] of this.scenery.clouds) {
      const px = ((x - cx * 0.12) % (W + 300) + W + 300) % (W + 300) - 150;
      c.beginPath(); c.arc(px, y, s * 0.6, Math.PI * 0.5, Math.PI * 1.5); c.arc(px + s * 0.6, y - s * 0.45, s * 0.6, Math.PI, 0); c.arc(px + s * 1.3, y - s * 0.1, s * 0.55, Math.PI * 1.3, Math.PI * 0.5); c.closePath();
      ink(c, "#f7ecd3", 2.5);
    }
    for (const [x, h, w] of this.scenery.hills) {
      const px = x - cx * 0.25;
      if (px < -w - 50 || px > W + w) continue;
      c.beginPath(); c.moveTo(px - w, GROUND); c.quadraticCurveTo(px, GROUND - h * 2, px + w, GROUND); ink(c, "#b4a578", 2.5);
    }
    for (const [x, w, h, tower] of this.scenery.bldg) {
      const px = x - cx * 0.55;
      if (px < -150 || px > W + 50) continue;
      const top = GROUND - 20 - h;
      if (tower) {
        rrect(c, px, top - 60, w * 0.6, h + 80, 4); ink(c, "#7e6d58", 2.5);
        ell(c, px + w * 0.3, top - 25, w * 0.22, w * 0.22); ink(c, "#efe0bd", 2);
        c.beginPath(); c.moveTo(px + w * 0.3, top - 25); c.lineTo(px + w * 0.3 + Math.cos(t) * w * 0.16, top - 25 + Math.sin(t) * w * 0.16); ink(c, null, 2);
        c.beginPath(); c.moveTo(px - 6, top - 60); c.lineTo(px + w * 0.3, top - 100); c.lineTo(px + w * 0.6 + 6, top - 60); c.closePath(); ink(c, "#8f4a3a", 2.5);
      } else {
        rrect(c, px, top, w, h + 30, 3); ink(c, "#8d7c63", 2.5);
        c.fillStyle = "rgba(241,212,138,0.7)";
        for (let wy = top + 14; wy < GROUND - 40; wy += 30) for (let wx = px + 10; wx < px + w - 16; wx += 22) c.fillRect(wx, wy, 9, 13);
      }
    }
    // stage floor
    c.fillStyle = "#8c5a3c"; c.fillRect(0, GROUND, W, H - GROUND);
    c.strokeStyle = "rgba(29,22,18,0.55)"; c.lineWidth = 2;
    for (let x = -((cx) % 80); x < W; x += 80) { c.beginPath(); c.moveTo(x, GROUND); c.lineTo(x - 30, H); c.stroke(); }
    c.beginPath(); c.moveTo(0, GROUND + 30); c.lineTo(W, GROUND + 30); c.stroke();
    c.fillStyle = "#a8714c"; c.fillRect(0, GROUND, W, 8);
    c.beginPath(); c.moveTo(0, GROUND); c.lineTo(W, GROUND); ink(c, null, 3.5);
  }

  private drawProps() {
    const c = this.c;
    for (const [x, kind] of this.scenery.props) {
      if (x < this.camX - 100 || x > this.camX + W + 100) continue;
      if (kind === 0) {
        rrect(c, x - 4, GROUND - 150, 8, 150, 3); ink(c, "#3b3029", 2.5);
        ell(c, x, GROUND - 160, 16, 14); ink(c, "#f3d58a", 2.5);
        c.beginPath(); c.moveTo(x - 18, GROUND - 170); c.lineTo(x, GROUND - 186); c.lineTo(x + 18, GROUND - 170); c.closePath(); ink(c, "#3b3029", 2.5);
      } else {
        rrect(c, x - 30, GROUND - 46, 60, 46, 3); ink(c, "#b98a55", 2.5);
        c.beginPath(); c.moveTo(x - 30, GROUND - 46); c.lineTo(x + 30, GROUND); c.moveTo(x + 30, GROUND - 46); c.lineTo(x - 30, GROUND); ink(c, null, 2);
      }
    }
  }

  private drawForeground() {
    const c = this.c;
    for (const [x, s] of this.scenery.tufts) {
      const px = x - this.camX * 1.25;
      if (px < -60 || px > W + 60) continue;
      const by = H + 6;
      c.beginPath(); c.moveTo(px - 30 * s, by);
      c.quadraticCurveTo(px - 20 * s, by - 50 * s, px - 6 * s, by - 60 * s);
      c.quadraticCurveTo(px, by - 30 * s, px + 8 * s, by - 70 * s);
      c.quadraticCurveTo(px + 16 * s, by - 30 * s, px + 30 * s, by - 48 * s);
      c.quadraticCurveTo(px + 30 * s, by - 20 * s, px + 36 * s, by);
      ink(c, "#4f5a3a", 3);
    }
  }

  private drawCharacter(character: CharacterId, x: number, y: number, face: number, ghost: boolean) {
    if (character === "nicole") this.drawNicole(x, y, face, ghost);
    else this.drawAnby(x, y, face, ghost);
  }

  private drawMelee(slash: Melee) {
    const c = this.c;
    const progress = 1 - slash.life / CHARACTER_ATTACKS.anby.duration;
    c.save(); c.translate(slash.x, slash.y - 60); c.scale(slash.face, 1);
    c.globalAlpha = Math.max(0, 1 - progress);
    c.beginPath(); c.arc(26, 0, 84, -1.0 + progress * 0.6, 1.0 + progress * 0.6);
    c.lineWidth = 12; c.strokeStyle = "#c9d84a"; c.stroke();
    c.lineWidth = 4; c.strokeStyle = "#f4efe4"; c.stroke();
    c.restore();
  }

  private drawNicole(x: number, y: number, face: number, ghost: boolean) {
    const c = this.c, p = this.p;
    const moving = !ghost && Math.abs(p.vx) > 20 && p.onGround;
    const swing = moving ? Math.sin(p.anim) * 12 : 0;
    const firing = !ghost && p.shootAnim > 0;
    c.save(); c.translate(x, y); c.scale(face, 1);
    if (ghost) c.globalAlpha *= 0.6;
    else { ell(c, 0, 2, 28, 6); c.fillStyle = "rgba(29,22,18,0.3)"; c.fill(); }
    c.rotate(p.dashT > 0 && !ghost ? 0.22 : 0);
    // Long pink twin tails give Nicole a completely distinct silhouette.
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * 17, -97); c.rotate(side * (0.16 + Math.sin(p.anim) * 0.08));
      c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(-24, 26, -15, 61); c.quadraticCurveTo(8, 68, 9, 44); c.quadraticCurveTo(-2, 35, 8, 4); c.closePath(); ink(c, "#ed91b2", 2.5);
      c.restore();
    }
    hose(c, -7, -35, -10 - swing, -6, -7, 7, "#393039");
    hose(c, 7, -35, 10 + swing, -6, 7, 7, "#393039");
    ell(c, -7 - swing, -3, 10, 5); ink(c, "#353038", 2.5);
    ell(c, 14 + swing, -3, 10, 5); ink(c, "#353038", 2.5);
    c.translate(0, moving ? -Math.abs(Math.cos(p.anim)) * 3 : 0);
    hose(c, -10, -64, -22, -43, -5, 6, "#f3dcc4");
    rrect(c, -16, -49, 32, 16, 4); ink(c, "#353038", 2.5);
    rrect(c, -15, -73, 30, 26, 6); ink(c, "#f4efe4", 2.5);
    c.beginPath(); c.moveTo(-15, -73); c.lineTo(-5, -59); c.lineTo(-8, -47); c.lineTo(-17, -49); c.closePath(); ink(c, "#38323d", 2);
    c.beginPath(); c.moveTo(15, -73); c.lineTo(5, -59); c.lineTo(8, -47); c.lineTo(17, -49); c.closePath(); ink(c, "#38323d", 2);
    c.fillStyle = "#ed78a7"; c.fillRect(-16, -48, 32, 4);
    ell(c, 0, -49, 4, 3); ink(c, "#e8b04a", 1.5);
    // Briefcase doubles as an ether cannon; recoil and muzzle glow are visible.
    const handX = firing ? 28 - p.shootAnim * 20 : 24;
    const handY = firing ? -61 : -41;
    hose(c, 9, -64, handX, handY, 5, 6, "#f3dcc4");
    c.save(); c.translate(handX, handY);
    rrect(c, -3, -10, 17, 10, 3); ink(c, "#353038", 2);
    rrect(c, -8, -3, 38, 25, 4); ink(c, "#45404c", 3);
    c.fillStyle = "#e8b04a"; c.fillRect(-7, 7, 36, 3);
    ell(c, 29, 7, 5, 8); ink(c, "#ed78a7", 2);
    ell(c, 8, 9, 5, 5); ink(c, "#ed91b2", 1.5);
    if (firing) { ell(c, 40, 7, 10 + p.shootAnim * 30, 8); ink(c, "#f5c9dd", 2); }
    c.restore();
    ell(c, 2, -89, 18, 18); ink(c, "#f3dcc4", 2.5);
    c.beginPath(); c.moveTo(-19, -84); c.quadraticCurveTo(-26, -112, 2, -112); c.quadraticCurveTo(25, -110, 22, -91); c.lineTo(14, -100); c.lineTo(6, -89); c.lineTo(2, -98); c.lineTo(-5, -84); c.closePath(); ink(c, "#ed91b2", 2.5);
    for (const ex of [7, 15]) { ell(c, ex, -88, 3, 5); ink(c, "#70aa8d", 1); ell(c, ex + 1, -89, 1, 3); c.fillStyle = INK; c.fill(); }
    c.beginPath(); c.arc(13, -81, 5, 0.1, Math.PI * 0.8); ink(c, null, 1.5);
    c.beginPath(); c.moveTo(-14, -102); c.lineTo(-5, -105); c.lineWidth = 3; c.strokeStyle = "#e8b04a"; c.stroke();
    c.restore();
  }

  private drawAnby(x: number, y: number, face: number, ghost: boolean) {
    const c = this.c, p = this.p;
    const moving = ghost ? false : Math.abs(p.vx) > 20 && p.onGround;
    const sw = moving ? Math.sin(p.anim) : 0;
    const bob = moving ? Math.abs(Math.cos(p.anim)) * 3 : Math.sin(this.time * 3) * 1.2;
    c.save(); c.translate(x, y); c.scale(face, 1);
    if (!ghost) { ell(c, 0, 2, 26, 6); c.fillStyle = "rgba(29,22,18,0.3)"; c.fill(); }
    if (ghost) { c.globalAlpha *= 0.6; }
    const air = !p.onGround && !ghost;
    const dashing = p.dashT > 0 && !ghost;
    c.rotate(dashing ? 0.25 : 0);
    // legs
    const legC = "#2a2526";
    if (air) { hose(c, -6, -36, -14, -12, -10, 7, legC); hose(c, 6, -36, 14, -16, 8, 7, legC); }
    else { hose(c, -6, -36, -8 - sw * 14, -4, -6, 7, legC); hose(c, 6, -36, 8 + sw * 14, -4, 6, 7, legC); }
    const f1x = air ? -14 : -8 - sw * 14, f2x = air ? 14 : 8 + sw * 14, fy = air ? -12 : -2;
    ell(c, f1x + 3, fy, 9, 5); ink(c, "#1f1b1c", 2.5);
    ell(c, f2x + 3, fy - (air ? 4 : 0), 9, 5); ink(c, "#1f1b1c", 2.5);
    c.translate(0, -bob);
    // back arm
    hose(c, -8, -62, -18, -42 + sw * 4, -6, 6, "#26222a");
    // skirt / shorts
    c.beginPath(); c.moveTo(-13, -46); c.lineTo(13, -46); c.lineTo(17, -32); c.lineTo(-17, -32); c.closePath(); ink(c, "#24212a", 2.5);
    // jacket
    rrect(c, -14, -74, 28, 32, 8); ink(c, "#26222a", 2.5);
    c.fillStyle = "#f4efe4"; c.fillRect(-2, -72, 4, 28);
    c.beginPath(); c.moveTo(-10, -73); c.lineTo(0, -64); c.lineTo(10, -73); ink(c, "#f4efe4", 2);
    c.fillStyle = "#c9d84a"; c.fillRect(-14, -50, 28, 3); // accent belt
    // front arm + sword
    const shooting = p.shootAnim > 0 && !ghost;
    if (shooting) {
      hose(c, 6, -64, 30, -60, -4, 6, "#26222a");
      c.save(); c.translate(32, -60); c.rotate(-0.8 + (1 - p.shootAnim / CHARACTER_ATTACKS.anby.duration) * 1.5);
      rrect(c, -4, -4, 8, 8, 2); ink(c, "#3a3440", 2);
      c.beginPath(); c.moveTo(4, -4); c.lineTo(72, -3); c.lineTo(80, 0); c.lineTo(72, 4); c.lineTo(4, 4); c.closePath(); ink(c, "#dfe6ea", 2);
      c.beginPath(); c.moveTo(6, 0); c.lineTo(76, 0); c.strokeStyle = "#c9d84a"; c.lineWidth = 2; c.stroke();
      c.restore();
    } else {
      hose(c, 8, -62, 18, -42 - sw * 4, 6, 6, "#26222a");
      c.save(); c.translate(19, -42); c.rotate(1.1);
      c.beginPath(); c.moveTo(0, -3); c.lineTo(30, -2); c.lineTo(36, 0); c.lineTo(30, 3); c.lineTo(0, 3); c.closePath(); ink(c, "#dfe6ea", 2);
      c.restore();
    }
    // head
    ell(c, 2, -90, 18, 17); ink(c, "#f3dcc4", 2.5);
    // hair bob (silver)
    c.beginPath();
    c.moveTo(-18, -78); c.quadraticCurveTo(-24, -104, -2, -110); c.quadraticCurveTo(22, -110, 22, -94);
    c.lineTo(17, -96); c.lineTo(14, -88); c.lineTo(10, -97); c.lineTo(4, -90); c.lineTo(1, -99); c.lineTo(-6, -92);
    c.quadraticCurveTo(-8, -82, -6, -74); c.quadraticCurveTo(-14, -72, -18, -78); c.closePath();
    ink(c, "#d8d6d2", 2.5);
    c.beginPath(); c.moveTo(-14, -92); c.quadraticCurveTo(-10, -100, -2, -103); c.strokeStyle = "#f7f6f2"; c.lineWidth = 2; c.stroke();
    // headband
    c.beginPath(); c.moveTo(-16, -100); c.quadraticCurveTo(2, -112, 20, -100); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 4; c.strokeStyle = "#2f2c38"; c.stroke();
    hose(c, -17, -100, -30, -96 + Math.sin(this.time * 8) * 3, -2, 3, "#2f2c38");
    // pie-cut eyes
    for (const ex of [7, 15]) {
      ell(c, ex, -88, 3, 5.5); c.fillStyle = INK; c.fill();
      c.beginPath(); c.moveTo(ex, -89); c.arc(ex, -89, 4, -1.9, -1.2); c.closePath(); c.fillStyle = "#f4efe4"; c.fill();
    }
    ell(c, 12, -80, 3, 1.5); c.fillStyle = "rgba(216,110,90,0.5)"; c.fill();
    c.beginPath(); c.moveTo(14, -77); c.lineTo(18, -77); ink(c, null, 1.8);
    c.restore();
  }

  private drawBullet(bl: Bullet) {
    const c = this.c, d = Math.sign(bl.vx);
    c.save(); c.translate(bl.x, bl.y); c.scale(d, 1);
    c.beginPath(); c.moveTo(-24, -6); c.quadraticCurveTo(4, -10, 12, 0); c.quadraticCurveTo(4, 10, -24, 6); c.quadraticCurveTo(-6, 0, -24, -6);
    ink(c, "#ed78a7", 2);
    c.beginPath(); c.moveTo(-14, -2); c.lineTo(-6, 2); c.lineTo(0, -2); c.lineTo(6, 1); c.strokeStyle = "#fffbe8"; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }

  private drawEP(e: EProj) {
    const c = this.c;
    c.save(); c.translate(e.x, e.y);
    if (e.kind === "puff") {
      c.rotate(e.rot * 0.3);
      c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.arc(Math.cos(a) * 9, Math.sin(a) * 9, 9, 0, Math.PI * 2); }
      ink(c, "#f4ecd8", 2.5);
      ell(c, -4, -2, 2, 3); c.fillStyle = INK; c.fill(); ell(c, 4, -2, 2, 3); c.fill();
    } else if (e.kind === "lid") {
      c.rotate(e.rot);
      ell(c, 0, 0, 26, 8); ink(c, "#c4974e", 3);
      ell(c, 0, -10, 9, 7); ink(c, "#c4974e", 2.5);
    } else if (e.kind === "gear") {
      c.rotate(e.rot);
      c.beginPath();
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, rr = k % 2 ? e.r : e.r - 7; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); ink(c, "#b58a3e", 3);
      ell(c, 0, 0, 8, 8); ink(c, "#5c4a33", 2);
    } else if (e.kind === "cube") {
      c.rotate(e.rot);
      rrect(c, -15, -15, 30, 30, 4); ink(c, "#fbf6ea", 3);
      c.fillStyle = "rgba(29,22,18,0.25)"; c.fillRect(-8, -6, 3, 3); c.fillRect(4, 4, 3, 3); c.fillRect(2, -9, 3, 3);
    } else {
      ell(c, 0, 4, 7, 5, -0.3); ink(c, "#2b2a33", 2);
      c.beginPath(); c.moveTo(6, 2); c.lineTo(6, -14); c.lineTo(13, -10); ink(c, null, 2.5);
    }
    c.restore();
  }

  private drawLaser() {
    const b = this.b, l = b.laser;
    if (!l) return;
    const c = this.c, tip = this.spoutTip(), sx = tip.x + l.dir * 60, ex = sx + l.dir * 1400;
    if (!l.fire) {
      c.setLineDash([14, 10]); c.lineDashOffset = -this.time * 80;
      c.strokeStyle = `rgba(196,71,58,${0.5 + 0.4 * Math.sin(this.time * 25)})`; c.lineWidth = 4;
      c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo(sx, tip.y, sx, l.lane); c.lineTo(ex, l.lane); c.stroke();
      c.setLineDash([]);
      c.font = "bold 22px Rye, serif"; c.fillStyle = "#c4473a"; c.textAlign = "center";
      c.fillText(l.lane > GROUND - 60 ? "JUMP!" : "STAY LOW!", sx + l.dir * 120, l.lane - 22);
    } else {
      const w = 28 + Math.sin(this.time * 60) * 4;
      c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo(sx, tip.y, sx, l.lane);
      c.lineWidth = w + 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = w; c.strokeStyle = "#f6efd9"; c.stroke();
      rrect(c, Math.min(sx, ex), l.lane - w / 2, Math.abs(ex - sx), w, w / 2); ink(c, "#f6efd9", 3);
      c.fillStyle = "rgba(242,201,76,0.6)"; c.fillRect(Math.min(sx, ex), l.lane - 4, Math.abs(ex - sx), 8);
    }
  }

  private drawBoss() {
    const c = this.c, b = this.b, t = this.time;
    const fl = b.flash > 0;
    const wind = b.state === "wind";
    const jx = wind ? rnd(-2.5, 2.5) : 0;
    const dyingTilt = b.state === "dying" ? Math.min(1, b.dyingT) * 0.5 : 0;
    c.save();
    c.translate(b.x + jx, b.y + b.hopY + (b.state === "dying" ? Math.min(1, b.dyingT) * 30 : 0));
    // shadow
    ell(c, 0, -b.hopY + 4, 110, 14); c.fillStyle = "rgba(29,22,18,0.3)"; c.fill();
    c.scale(b.face, 1);
    c.rotate(-dyingTilt);
    const body = fl ? "#fff6e0" : b.phase === 3 ? "#9a6a5c" : b.phase === 2 ? "#7f8a72" : "#6f8f86";
    const brass = fl ? "#fff6e0" : "#c4974e";
    const step = Math.sin(b.walk);
    const breathe = Math.sin(t * 3) * 3 + (wind ? Math.sin(t * 40) * 3 : 0);
    // legs
    hose(c, -40, -62, -50 - step * 12, -10, -14, 12, "#2b2526");
    hose(c, 40, -62, 50 + step * 12, -10, 14, 12, "#2b2526");
    ell(c, -48 - step * 12, -8, 24, 11); ink(c, "#8f4a3a", 3);
    ell(c, 56 + step * 12, -8, 24, 11); ink(c, "#8f4a3a", 3);
    // back gear
    c.save(); c.translate(-92, -205); c.rotate(b.clock * 2);
    c.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? 30 : 23; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
    ink(c, brass, 3); ell(c, 0, 0, 8, 8); ink(c, "#5c4a33", 2);
    c.restore();
    // handle
    c.beginPath(); c.arc(-108, -135, 40, Math.PI * 0.45, Math.PI * 1.55); c.lineWidth = 20; c.strokeStyle = INK; c.stroke(); c.lineWidth = 13; c.strokeStyle = brass; c.stroke();
    // spout
    c.beginPath(); c.moveTo(70, -150); c.quadraticCurveTo(150, -140, 172, -186); c.lineTo(160, -192); c.quadraticCurveTo(140, -160, 75, -110); c.closePath(); ink(c, body, 3.5);
    ell(c, 167, -189, 10, 5, -0.6); ink(c, INK, 2);
    // body
    ell(c, 0, -135 - breathe * 0.3, 108, 82 + breathe * 0.5); ink(c, body, 4);
    ell(c, -38, -175, 30, 14, -0.4); c.fillStyle = "rgba(255,250,235,0.35)"; c.fill();
    c.beginPath(); c.ellipse(0, -135, 108, 82, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.lineWidth = 10; c.strokeStyle = brass; c.stroke();
    // phase 3 cracks
    if (b.phase === 3) { c.beginPath(); c.moveTo(60, -190); c.lineTo(48, -170); c.lineTo(60, -160); c.lineTo(45, -140); ink(c, null, 2.5); }
    // clock belly
    ell(c, 10, -118, 36, 36); ink(c, fl ? "#fff" : "#f1e4c3", 3);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.beginPath(); c.moveTo(10 + Math.cos(a) * 28, -118 + Math.sin(a) * 28); c.lineTo(10 + Math.cos(a) * 32, -118 + Math.sin(a) * 32); ink(c, null, 2); }
    c.beginPath(); c.moveTo(10, -118); c.lineTo(10 + Math.cos(b.clock) * 24, -118 + Math.sin(b.clock) * 24); ink(c, null, 3);
    c.beginPath(); c.moveTo(10, -118); c.lineTo(10 + Math.cos(b.clock / 12) * 15, -118 + Math.sin(b.clock / 12) * 15); ink(c, null, 4);
    // eyes
    const angry = b.phase > 1 || wind;
    for (const ex of [12, 58]) {
      ell(c, ex, -178, 15, 19); ink(c, "#fbf6ea", 3);
      ell(c, ex + 5, -175, 6, 9); c.fillStyle = INK; c.fill();
      c.beginPath(); c.moveTo(ex - 16, -205 + (angry ? (ex < 30 ? -4 : 6) : 0)); c.lineTo(ex + 16, -205 + (angry ? (ex < 30 ? 6 : -4) : 0)); ink(c, null, 5);
    }
    // mustache
    c.beginPath(); c.moveTo(35, -152); c.quadraticCurveTo(15, -140, 0, -152); c.quadraticCurveTo(18, -160, 35, -152); c.quadraticCurveTo(52, -160, 70, -152); c.quadraticCurveTo(55, -140, 35, -152); ink(c, "#3a2c22", 2.5);
    // lid
    if (b.lidGone <= 0) {
      const rattle = wind && b.attack === "lid" ? Math.sin(t * 60) * 4 : 0;
      ell(c, 0, -214 + rattle, 58, 15); ink(c, brass, 3);
      ell(c, 0, -234 + rattle, 13, 11); ink(c, brass, 3);
    } else {
      for (let k = 0; k < 2; k++) if (Math.random() < 0.2) this.parts.push({ x: b.x + rnd(-30, 30), y: b.y - 215, vx: rnd(-20, 20), vy: -80, life: 0.6, max: 0.6, size: 10, color: "#f4ead2", kind: "smoke" });
    }
    // steam from spout idle
    if (Math.random() < (b.phase * 0.05) && this.state === "playing") { const tp = this.spoutTip(); this.parts.push({ x: tp.x, y: tp.y, vx: b.face * 30, vy: -60, life: 0.7, max: 0.7, size: 8, color: "#f4ead2", kind: "smoke" }); }
    c.restore();
    // telegraph bubble
    if (wind) {
      const bx = b.x, by = b.y + b.hopY - 275;
      const pulse = 1 + Math.sin(t * 20) * 0.08;
      c.save(); c.translate(bx, by); c.scale(pulse, pulse);
      ell(c, 0, 0, 26, 26); ink(c, "#c4473a", 3);
      c.font = "bold 32px Rye, serif"; c.fillStyle = "#fbf6ea"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", 0, 2);
      c.restore();
    }
  }

  private drawParts() {
    const c = this.c;
    for (const q of this.parts) {
      const a = Math.max(0, q.life / q.max);
      c.globalAlpha = Math.min(1, a * 1.4);
      if (q.kind === "dot") { ell(c, q.x, q.y, q.size, q.size); c.fillStyle = q.color; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
      else if (q.kind === "smoke") { ell(c, q.x, q.y, q.size, q.size); ink(c, q.color, 2); }
      else if (q.kind === "ring") { ell(c, q.x, q.y, q.size * (1.8 - a), q.size * 0.35 * (1.8 - a)); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); }
      else if (q.kind === "star") {
        c.beginPath(); const r = q.size * (1.4 - a * 0.4);
        for (let k = 0; k < 16; k++) { const ang = k / 16 * Math.PI * 2, rr = k % 2 ? r : r * 0.45; c.lineTo(q.x + Math.cos(ang) * rr, q.y + Math.sin(ang) * rr); }
        c.closePath(); ink(c, "#f2d24c", 2.5);
      } else if (q.kind === "text") {
        c.font = `${q.size}px Rye, serif`; c.textAlign = "center"; c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(q.text ?? "", q.x, q.y); c.fillStyle = q.color; c.fillText(q.text ?? "", q.x, q.y);
      }
    }
    c.globalAlpha = 1;
  }

  private drawHud() {
    const c = this.c, p = this.p, b = this.b;
    // player cards
    c.font = "18px Rye, serif"; c.textAlign = "left"; c.textBaseline = "alphabetic";
    const label = this.activeCharacter === "anby" ? "ANBY · SWORD" : "NICOLE · ETHER";
    c.lineWidth = 4; c.strokeStyle = INK; c.strokeText(label, 20, 34); c.fillStyle = "#fbf6ea"; c.fillText(label, 20, 34);
    for (let k = 0; k < 5; k++) {
      rrect(c, 20 + k * 30, 44, 24, 30, 5); ink(c, k < p.hp ? "#c4473a" : "#e9dcc0", 3);
      if (k < p.hp) { c.fillStyle = "#fbf6ea"; c.font = "14px Rye, serif"; c.textAlign = "center"; c.fillText("♥", 32 + k * 30, 64); c.textAlign = "left"; }
    }
    // dash meter
    const dr = 1 - p.dashCd / 0.7;
    rrect(c, 20, 82, 144, 10, 5); ink(c, "#e9dcc0", 2.5);
    rrect(c, 20, 82, 144 * dr, 10, 5); c.fillStyle = dr >= 1 ? "#c9d84a" : "#9c9a7a"; c.fill();
    c.font = "11px Rye, serif"; c.fillStyle = INK; c.fillText("DASH", 170, 92);
    // boss bar
    const bw = 380, bx = W / 2 - bw / 2 + 60, by = 24;
    c.font = "15px Rye, serif"; c.textAlign = "center";
    c.lineWidth = 4; c.strokeStyle = INK; c.strokeText("MAESTRO KETTLEWIND", bx + bw / 2, by - 4); c.fillStyle = "#fbf6ea"; c.fillText("MAESTRO KETTLEWIND", bx + bw / 2, by - 4);
    rrect(c, bx, by + 2, bw, 18, 9); ink(c, "#e9dcc0", 3);
    const r = Math.max(0, b.hp) / BOSS_MAX;
    if (r > 0) { rrect(c, bx + 2, by + 4, (bw - 4) * r, 14, 7); c.fillStyle = b.inv > 0 ? "#f2d24c" : "#8f4a3a"; c.fill(); }
    for (const f of [0.33, 0.66]) { c.beginPath(); c.moveTo(bx + bw * f, by + 2); c.lineTo(bx + bw * f, by + 20); ink(c, null, 2.5); }
    c.font = "12px Rye, serif"; c.fillStyle = INK; c.fillText(`PHASE ${["", "I", "II", "III"][b.phase]}`, bx + bw / 2, by + 38);
  }

  private drawBanner() {
    const c = this.c, bn = this.banner;
    if (!bn) return;
    const k = bn.t / bn.max;
    const s = k < 0.15 ? k / 0.15 * 1.15 : k < 0.25 ? 1.15 - (k - 0.15) : 1;
    c.save(); c.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    c.translate(W / 2, H * 0.4); c.scale(s, s); c.rotate(-0.04);
    c.font = "56px Rye, serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 12; c.strokeStyle = INK; c.lineJoin = "round"; c.strokeText(bn.text, 0, 0);
    c.fillStyle = "#f2d24c"; c.fillText(bn.text, 0, 0);
    c.restore();
  }
}

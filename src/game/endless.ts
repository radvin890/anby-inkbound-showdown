/** Streamed terrain and small-enemy rules; character actions belong to the shared engine. */
export interface Platform { x: number; end: number; y: number; kind: "ground" | "platform" | "obstacle" }
export interface RunnerEnemy {
  id: number; x: number; y: number; left: number; right: number; hp: number;
  phase: "approach" | "wind" | "strike" | "recover"; t: number; face: number;
  flash: number; anim: number; hit: boolean; variant: number;
}
export const ENDLESS_GROUND = 456;
export const ENEMY_HEIGHT = 108;
export const ENEMY_HP = 14;
export const STREAM_AHEAD = 2100;
export const STREAM_BEHIND = 300;
export const CHUNK_WIDTH = 900;
export const MAX_GAP = 100;

// Seeded layouts are reproducible, but each run can have a different seed.
function random(seed: number, index: number) {
  let n = (seed ^ Math.imul(index + 1, 374761393)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function difficulty(distance: number, seconds: number) {
  const tier = Math.min(5, Math.floor(Math.max(distance / 250, seconds / 50)));
  return { tier, speed: 75 + tier * 15, windup: 0.8 - tier * 0.05, waveSize: Math.min(3, 1 + Math.floor(tier / 2)) };
}
export function makeChunk(index: number, seed: number): Platform[] {
  const x = index * CHUNK_WIDTH;
  if (index === 0) return [{ x, end: x + CHUNK_WIDTH, y: ENDLESS_GROUND, kind: "ground" }];
  const gap = 70 + Math.floor(random(seed, index) * (MAX_GAP - 70));
  const edge = x + 550;
  return [
    { x, end: edge, y: ENDLESS_GROUND, kind: "ground" },
    { x: edge + gap, end: x + CHUNK_WIDTH, y: ENDLESS_GROUND, kind: "ground" },
    { x: x + 185, end: x + 300, y: ENDLESS_GROUND - 36, kind: "obstacle" },
    { x: x + 370, end: x + 510, y: ENDLESS_GROUND - 95, kind: "platform" },
  ];
}
export class EndlessWorld {
  platforms: Platform[] = [];
  enemies: RunnerEnemy[] = [];
  generated = 0;
  defeated = 0;
  farthest = 320;
  private nextId = 0;
  constructor(readonly seed = Math.floor(Math.random() * 2147483647)) { this.stream(0, 320, 0); }
  get distance() { return Math.max(0, Math.floor((this.farthest - 320) / 10)); }
  get score() { return this.distance + this.defeated * 100; }
  stream(camera: number, playerX: number, seconds: number) {
    this.farthest = Math.max(this.farthest, playerX);
    while (this.generated * CHUNK_WIDTH < camera + STREAM_AHEAD) {
      const index = this.generated++;
      const terrain = makeChunk(index, this.seed);
      this.platforms.push(...terrain);
      const floor = terrain[0];
      if (!floor) continue;
      const count = difficulty(Math.max(this.distance, index * CHUNK_WIDTH / 10), seconds).waveSize;
      for (let j = 0; j < count; j++) {
        const x = index === 0 ? 770 : floor.x + 75 + j * 120;
        this.enemies.push({ id: this.nextId++, x, y: floor.y, left: floor.x + 25, right: floor.end - 25,
          hp: ENEMY_HP, phase: "approach", t: 0, face: -1, flash: 0, anim: 0, hit: false, variant: index % 2 });
      }
    }
    this.platforms = this.platforms.filter(p => p.end >= camera - STREAM_BEHIND);
    this.enemies = this.enemies.filter(e => e.hp > 0 && e.right >= camera - STREAM_BEHIND);
  }
  /** One-way tops preserve jump/dash speeds; raised blocks are traversable obstacles. */
  landing(x: number, previousY: number, nextY: number, vy: number): number | null {
    if (vy < 0) return null;
    const tops = this.platforms.filter(p => x + 12 >= p.x && x - 12 <= p.end && previousY <= p.y + 1 && nextY >= p.y);
    return tops.length ? Math.min(...tops.map(p => p.y)) : null;
  }
  safeGround(x: number): { x: number; y: number } {
    const floors = this.platforms.filter(p => p.kind === "ground" && p.end - p.x > 100);
    let best = floors[0];
    for (const p of floors) if (Math.abs(Math.max(p.x + 35, Math.min(p.end - 35, x)) - x) < Math.abs(Math.max(best?.x ?? 0, Math.min(best?.end ?? 0, x)) - x)) best = p;
    return best ? { x: Math.max(best.x + 35, Math.min(best.end - 35, x)), y: best.y } : { x, y: ENDLESS_GROUND };
  }
  target(x: number) { return this.enemies.filter(e => e.hp > 0).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]; }
  damage(enemy: RunnerEnemy, amount: number) {
    if (enemy.hp <= 0) return false;
    enemy.hp = Math.max(0, enemy.hp - amount); enemy.flash = 0.15;
    if (enemy.hp === 0) this.defeated++;
    return true;
  }
  update(dt: number, player: { x: number; y: number }, seconds: number, hurt: (direction: number) => void, telegraph: () => void) {
    const d = difficulty(this.distance, seconds);
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt); e.anim += dt * 9;
      if (Math.abs(e.x - player.x) > 1000) continue;
      const dx = player.x - e.x;
      if (e.phase === "approach") {
        e.face = Math.sign(dx) || e.face;
        if (Math.abs(dx) < 125 && Math.abs(player.y - e.y) < 120) { e.phase = "wind"; e.t = d.windup; telegraph(); }
        else e.x = Math.max(e.left, Math.min(e.right, e.x + e.face * d.speed * dt));
      } else {
        e.t -= dt;
        if (e.phase === "strike") {
          e.x = Math.max(e.left, Math.min(e.right, e.x + e.face * 190 * dt));
          if (!e.hit && Math.abs(player.x - e.x) < 45 && Math.abs((player.y - 50) - (e.y - 50)) < 65) { e.hit = true; hurt(e.face); }
        }
        if (e.t <= 0) {
          if (e.phase === "wind") { e.phase = "strike"; e.t = 0.32; e.hit = false; }
          else if (e.phase === "strike") { e.phase = "recover"; e.t = 1.05; }
          else e.phase = "approach";
        }
      }
    }
  }
}
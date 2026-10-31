import { describe, expect, it, vi } from "vitest";
import { EndlessWorld, makeChunk, difficulty, ENEMY_HEIGHT, MAX_GAP, CHUNK_WIDTH, STREAM_AHEAD } from "./endless";
import { Game, BOSS_MAX } from "./engine";
import { ASSIST_DAMAGE, ANBY_TAG_MESSAGE, KNOCKOUT_SECONDS } from "./characters";

function fixture() {
  const game = Object.create(Game.prototype) as Game;
  const p = { x: 650, y: 456, vx: 0, vy: 0, face: 1, onGround: true, hp: 5, inv: 0, dashT: 0, dashCd: 0, shootCd: 0, coyote: 0.1, buffer: 0, anim: 0, dead: false, shootAnim: 0 };
  const world = new EndlessWorld(42);
  const b = { x: 1000, y: 456, hp: BOSS_MAX, hopY: 0, state: "intro", clock: 0, t: 2.2 };
  const onState = vi.fn();
  Object.assign(game, { p, b, mode: "endless", endless: world, state: "playing", activeCharacter: "anby", characters: { anby: { ...p }, nicole: { ...p } },
    input: { left: false, right: false, jump: false, shoot: false, dash: false }, prev: { jump: false, dash: false }, camX: 0, fightTime: 0,
    parts: [], ghosts: [], bullets: [], melee: [], eps: [], shadows: [], shake: 0, hitsTaken: 0, banner: null, speech: null, assist: null, assistWindow: null, knockout: null, endTimer: -1,
    onState, sfx: { slash: vi.fn(), shoot: vi.fn(), hit: vi.fn(), hurt: vi.fn(), dash: vi.fn(), tele: vi.fn(), jump: vi.fn(), stopMusic: vi.fn(), startMusic: vi.fn(), defeat: vi.fn() } });
  const engine = game as unknown as { updatePlayer(dt: number): void; update(dt: number): void; updateProjectiles(dt: number): void; hurtPlayer(dir: number): void; updateAssist(dt: number): void; updateKnockout(dt: number): void; assistWindow: { remaining: number } | null; speech: { text: string } | null; bullets: unknown[]; melee: unknown[] };
  return { game, engine, p, b, world, onState };
}

describe("Endless streamed path", () => {
  it("generates beyond a fixed endpoint and bounds retained entities", () => {
    const world = new EndlessWorld(1);
    for (let camera = 0; camera < 200000; camera += 400) {
      world.stream(camera, camera + 320, camera / 340);
      expect(world.generated * CHUNK_WIDTH).toBeGreaterThanOrEqual(camera + STREAM_AHEAD);
      expect(world.platforms.length).toBeLessThanOrEqual(20);
      expect(world.enemies.length).toBeLessThanOrEqual(18);
    }
    expect(world.distance).toBeGreaterThan(19000);
  });
  it("keeps gaps and raised surfaces reachable with the existing jump", () => {
    for (let i = 1; i < 100; i++) {
      const floors = makeChunk(i, 42).filter(p => p.kind === "ground");
      expect((floors[1]?.x ?? 0) - (floors[0]?.end ?? 0)).toBeLessThanOrEqual(MAX_GAP);
    }
    expect(MAX_GAP).toBe(100);
    expect(ENEMY_HEIGHT).toBe(108);
    const w = new EndlessWorld(1);
    expect(w.landing(1100, 410, 425, 100)).toBe(420);
    expect(w.landing(1490, 450, 480, 100)).toBeNull();
    expect(w.landing(1100, 425, 410, -100)).toBeNull();
  });
  it("escalates waves but caps speed and keeps a readable windup", () => {
    expect(difficulty(0, 0)).toEqual({ tier: 0, speed: 75, windup: 0.8, waveSize: 1 });
    expect(difficulty(100000, 100000)).toEqual({ tier: 5, speed: 150, windup: 0.55, waveSize: 3 });
  });
  it("counts distance and defeated enemies only once, without rewarding backtracking", () => {
    const w = new EndlessWorld(1); w.stream(0, 1320, 0); w.stream(0, 400, 0);
    const e = w.enemies[0]; if (!e) throw new Error("missing enemy");
    w.damage(e, 14); w.damage(e, 14);
    expect(w.distance).toBe(100); expect(w.defeated).toBe(1); expect(w.score).toBe(200);
  });
  it("telegraphs before a strike and each strike damages at most once", () => {
    const w = new EndlessWorld(1), hurt = vi.fn(), tele = vi.fn();
    w.update(0.01, { x: 770, y: 456 }, 0, hurt, tele);
    expect(hurt).not.toHaveBeenCalled(); expect(tele).toHaveBeenCalledOnce();
    w.update(0.81, { x: 770, y: 456 }, 0, hurt, tele);
    w.update(0.01, { x: 770, y: 456 }, 0, hurt, tele);
    w.update(0.01, { x: 770, y: 456 }, 0, hurt, tele);
    expect(hurt).toHaveBeenCalledOnce();
  });
});

describe("Shared Endless character behavior", () => {
  it("Anby keeps melee only, damages a small enemy once and leaves the boss intact", () => {
    const { game, engine, p, b, world } = fixture();
    Object.assign(game, { input: { shoot: true } }); p.x = 670;
    engine.updatePlayer(0); expect(engine.bullets).toHaveLength(0); expect(engine.melee).toHaveLength(1);
    engine.updateProjectiles(0); engine.updateProjectiles(0);
    expect(world.defeated).toBe(1); expect(b.hp).toBe(BOSS_MAX);
  });
  it("Nicole retains ranged damage and switch preserves world and physics", () => {
    const { game, engine, p, world } = fixture();
    expect(game.switchCharacter("nicole")).toBe(true);
    expect(p.x).toBe(650); Object.assign(game, { input: { shoot: true } });
    engine.updatePlayer(0); engine.updateProjectiles(0.07);
    expect(world.enemies[0]?.hp).toBe(8); expect(world.defeated).toBe(0);
    expect(game.switchCharacter("anby")).toBe(true); expect(p.x).toBe(650);
  });
  it.each(["anby", "nicole"] as const)("%s hurt triggers the opposite assist without changing active character", character => {
    const { game, engine, p, b, world } = fixture();
    if (character === "nicole") game.switchCharacter("nicole");
    engine.hurtPlayer(-1); const mate = character === "anby" ? "nicole" : "anby";
    expect(game.tryAssist(mate)).toBe(true); expect(game.tryAssist(mate)).toBe(false);
    engine.updateAssist(0.33); expect(world.enemies[0]?.hp).toBe(Math.max(0, 14 - ASSIST_DAMAGE[mate]));
    expect(game.activeCharacter).toBe(character); expect(p.hp).toBe(4); expect(b.hp).toBe(BOSS_MAX);
  });
  it("locks the world for knockout, tags the survivor and only ends when both are KO", () => {
    const { game, engine, p, b, world, onState } = fixture(); game.switchCharacter("nicole"); p.hp = 1;
    engine.hurtPlayer(1); const snapshot = JSON.stringify(world);
    expect(game.switchCharacter("anby")).toBe(false);
    engine.update(1); expect(JSON.stringify(world)).toBe(snapshot); expect(b.t).toBe(2.2);
    engine.updateKnockout(KNOCKOUT_SECONDS);
    expect(game.activeCharacter).toBe("anby"); expect(p.hp).toBe(5); expect(engine.speech?.text).toBe(ANBY_TAG_MESSAGE);
    expect(game.state).toBe("playing"); p.hp = 1; p.inv = 0; engine.hurtPlayer(1); engine.updateKnockout(KNOCKOUT_SECONDS);
    expect(game.state).toBe("defeat"); expect(onState).toHaveBeenLastCalledWith("defeat", expect.objectContaining({ mode: "endless", distance: 0, score: 0, enemiesDefeated: 0 }));
  });
  it("camera progresses beyond the boss arena and never moves backward", () => {
    const { game, engine, p, b } = fixture(); p.x = 5000;
    engine.update(0); expect(game).toMatchObject({ camX: 4700 }); expect(b).toMatchObject({ hp: BOSS_MAX, t: 2.2 });
    p.x = 4750; engine.update(0); expect(game).toMatchObject({ camX: 4700 });
  });
  it("expired Endless assist closes and the teammate key switches normally", () => {
    const { game, engine } = fixture(); engine.hurtPlayer(-1);
    engine.update(0.51); expect(engine.assistWindow).toBeNull();
    expect(game.switchCharacter("nicole")).toBe(true); expect(game.activeCharacter).toBe("nicole");
  });
  it("Endless assists cannot trigger while paused", () => {
    const { game, engine } = fixture(); engine.hurtPlayer(-1);
    Object.assign(game, { state: "paused" }); expect(game.tryAssist("nicole")).toBe(false);
  });
  it("Anby knockout tags Nicole without ending the run", () => {
    const { game, engine, p } = fixture(); p.hp = 1; engine.hurtPlayer(-1);
    engine.updateKnockout(KNOCKOUT_SECONDS);
    expect(game.activeCharacter).toBe("nicole"); expect(p.hp).toBe(5); expect(game.state).toBe("playing");
  });
});
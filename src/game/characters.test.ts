import { describe, expect, it, vi } from "vitest";
import { Game, BOSS_MAX } from "./engine";
import { ASSIST_DAMAGE, CHARACTER_ATTACKS, characterForKey, swordHitsBoss } from "./characters";

// Exercise the actual engine without allocating a canvas or an animation loop.
function fixture() {
  const game = Object.create(Game.prototype) as Game;
  const p = { x: 800, y: 456, vx: 0, vy: 0, face: 1, onGround: true, hp: 4, inv: 0, dashT: 0, dashCd: 0.4, shootCd: 0, coyote: 0.1, buffer: 0, anim: 3, dead: false, shootAnim: 0 };
  const b = { x: 1000, y: 456, hopY: 0, hp: BOSS_MAX, inv: 0, state: "wind", t: 0.6, clock: 12, phase: 1 };
  const internal = {
    p, b, state: "playing", activeCharacter: "anby", camX: 400, fightTime: 14,
    characters: { anby: { ...p }, nicole: { ...p, hp: 3, dashCd: 0.2, shootCd: 0.12, anim: 6 } },
    input: { left: false, right: false, jump: false, shoot: true, dash: false },
    prev: { jump: false, dash: false }, bullets: [] as unknown[], melee: [] as unknown[], parts: [], eps: [], shadows: [],
    sfx: { slash: vi.fn(), shoot: vi.fn(), hit: vi.fn() },
    onState: vi.fn(),
  };
  Object.assign(game, internal);
  return { game, internal, p, b };
}

describe("Character selection", () => {
  it("maps 1 to Anby and 2 to Nicole", () => {
    expect(characterForKey("Digit1", null)).toBe("anby");
    expect(characterForKey("Digit2", null)).toBe("nicole");
  });
  it("does not switch while typing", () => {
    expect(characterForKey("Digit2", document.createElement("input"))).toBeNull();
    expect(characterForKey("Digit1", document.createElement("textarea"))).toBeNull();
    const parent = document.createElement("div"); parent.setAttribute("contenteditable", "true");
    const child = parent.appendChild(document.createElement("span"));
    expect(characterForKey("Digit2", child)).toBeNull();
  });
  it.each(["menu", "paused", "victory", "defeat"])("does not switch during %s", (state) => {
    const { game } = fixture(); Object.assign(game, { state });
    expect(game.switchCharacter("nicole")).toBe(false);
    expect(game.activeCharacter).toBe("anby");
  });
  it("preserves world, movement, boss timers, attacks and both characters' state", () => {
    const { game, internal, p, b } = fixture();
    const encounter = { ...b };
    p.vx = 820; p.vy = -420; p.dashT = 0.15;
    const world = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, dashT: p.dashT };
    const anby = { hp: p.hp, inv: p.inv, dashCd: p.dashCd, shootCd: p.shootCd, anim: p.anim, shootAnim: p.shootAnim };
    expect(game.switchCharacter("nicole")).toBe(true);
    expect(p.hp).toBe(3); expect(p.shootCd).toBe(0.12);
    expect(p).toMatchObject(world);
    p.hp = 2; p.shootCd = 0.19; p.shootAnim = 0.1;
    expect(game.switchCharacter("anby")).toBe(true); expect(p).toMatchObject(anby);
    expect(game.switchCharacter("nicole")).toBe(true);
    expect(p).toMatchObject({ hp: 2, shootCd: 0.19, shootAnim: 0.1 });
    expect(b).toEqual(encounter);
    expect(game).toMatchObject({ camX: 400, fightTime: 14 });
    expect((game as unknown as { bullets: unknown[] }).bullets).toBe(internal.bullets);
  });
});

describe("Character combat", () => {
  it("Anby's J creates melee only, never a projectile", () => {
    const { game, internal } = fixture();
    (game as unknown as { updatePlayer(dt: number): void }).updatePlayer(0);
    expect(internal.bullets).toHaveLength(0);
    expect(internal.melee).toHaveLength(1);
    expect(internal.sfx.slash).toHaveBeenCalledOnce();
  });
  it("Anby's sword cannot hit outside close range or behind her", () => {
    expect(swordHitsBoss(800, 456, 1, 1000, 326)).toBe(true);
    expect(swordHitsBoss(700, 456, 1, 1000, 326)).toBe(false);
    expect(swordHitsBoss(800, 456, -1, 1000, 326)).toBe(false);
    expect(swordHitsBoss(800, 456, 1, 1000, 100)).toBe(false);
  });
  it("a sword swing damages the boss once", () => {
    const { game, internal, b } = fixture();
    const engine = game as unknown as { updatePlayer(dt: number): void; updateProjectiles(dt: number): void };
    engine.updatePlayer(0); engine.updateProjectiles(0); engine.updateProjectiles(0);
    expect(b.hp).toBe(BOSS_MAX - CHARACTER_ATTACKS.anby.damage);
    expect(internal.sfx.hit).toHaveBeenCalledOnce();
  });
  it("Nicole's J fires a ranged briefcase projectile", () => {
    const { game, internal, p } = fixture(); game.switchCharacter("nicole"); p.shootCd = 0;
    (game as unknown as { updatePlayer(dt: number): void }).updatePlayer(0);
    expect(internal.melee).toHaveLength(0);
    expect(internal.bullets).toEqual([{ x: 852, y: 398, vx: 980, life: 0.75 }]);
    expect(internal.sfx.shoot).toHaveBeenCalledOnce();
  });
});
describe("Quick Assist", () => {
  type Eng = { hurtPlayer(d: number): void; update(dt: number): void; assistWindow: unknown; assist: unknown; checkPhase(): void; banner: unknown };
  function hurtFixture() {
    const f = fixture(); const eng = f.game as unknown as Eng;
    Object.assign(f.internal.sfx, { hurt: vi.fn(), dash: vi.fn() });
    Object.assign(f.game, { assistWindow: null, assist: null, knockout: null, speech: null, hitsTaken: 0, shake: 0, ghosts: [], endTimer: -1, banner: null });
    f.p.inv = 0; f.p.dashT = 0; f.internal.input.shoot = false;
    eng.checkPhase = vi.fn();
    eng.hurtPlayer(1);
    return { ...f, eng };
  }
  it("opens a 0.5s window for the teammate when hurt", () => {
    const { eng } = hurtFixture();
    expect(eng.assistWindow).toEqual({ teammate: "nicole", remaining: 0.5 });
  });
  it("teammate key triggers one assist, damages the boss, and does not switch", () => {
    const { game, eng, b } = hurtFixture();
    expect(game.switchCharacter("nicole")).toBe(true);
    expect(game.activeCharacter).toBe("anby");
    expect(eng.assistWindow).toBeNull();
    expect(game.tryAssist("nicole")).toBe(false);
    for (let i = 0; i < 30; i++) (game as unknown as { updateAssist(dt: number): void }).updateAssist(0.05);
    expect(b.hp).toBe(BOSS_MAX - ASSIST_DAMAGE.nicole);
    expect(eng.assist).toBeNull();
  });
  it("expired window is not assistable and the key switches normally", () => {
    const { game, eng } = hurtFixture();
    (eng.assistWindow as { remaining: number }).remaining = 0;
    expect(game.tryAssist("nicole")).toBe(false);
  });
  it("no assist while paused or when boss is dying", () => {
    const a = hurtFixture(); Object.assign(a.game, { state: "paused" });
    expect(a.game.tryAssist("nicole")).toBe(false);
    const d = hurtFixture(); d.b.state = "dying";
    expect(d.game.tryAssist("nicole")).toBe(false);
  });
  it("works symmetrically for Nicole hurt -> Anby assist", () => {
    const f = fixture(); f.game.switchCharacter("nicole");
    const eng = f.game as unknown as Eng;
    Object.assign(f.internal.sfx, { hurt: vi.fn(), dash: vi.fn() });
    Object.assign(f.game, { assistWindow: null, assist: null, knockout: null, hitsTaken: 0, banner: null });
    f.p.inv = 0; f.p.dashT = 0;
    eng.hurtPlayer(1);
    expect(eng.assistWindow).toEqual({ teammate: "anby", remaining: 0.5 });
    expect(f.game.tryAssist("anby")).toBe(true);
    expect(f.game.activeCharacter).toBe("nicole");
  });
});

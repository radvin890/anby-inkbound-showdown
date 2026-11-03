// Twiggy — secret final boss (not playable). Encounter data + original procedural ink art.
const INK = "#1d1612";

export type TwiggyPhase = 1 | 2 | 3;
export interface TwiggyPhaseDef { phase: TwiggyPhase; name: string; startsAtHpRatio: number; attacks: string[]; tint: string }

export const TWIGGY_MAX_HP = 720;
export const TWIGGY_PHASES: TwiggyPhaseDef[] = [
  { phase: 1, name: "Mirror Image", startsAtHpRatio: 1, attacks: ["baton-dash", "silver-shot"], tint: "#c9c3dc" },
  { phase: 2, name: "Silver Squad Protocol", startsAtHpRatio: 2 / 3, attacks: ["star-volley", "afterimage-dash", "baton-dash"], tint: "#b9b0d6" },
  { phase: 3, name: "One Face, Two Identities", startsAtHpRatio: 1 / 3, attacks: ["eclipse-barrage", "afterimage-dash", "star-volley"], tint: "#a597cf" },
];

export function twiggyPhaseFor(hp: number, max = TWIGGY_MAX_HP): TwiggyPhase {
  const r = Math.max(0, hp) / max;
  return r <= 1 / 3 ? 3 : r <= 2 / 3 ? 2 : 1;
}

function ell(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); }
function ink(c: CanvasRenderingContext2D, fill: string | null, w = 3) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round"; c.stroke();
}
function limb(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, bend: number, w: number, color: string) {
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + bend, (y1 + y2) / 2, x2, y2);
  c.lineCap = "round"; c.lineWidth = w + 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = w; c.strokeStyle = color; c.stroke();
}
function star(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

/** Draws Twiggy standing on ground y. Same scale as Anby (~110 px tall). */
export function drawTwiggy(c: CanvasRenderingContext2D, x: number, y: number, face: number, time: number, phase: TwiggyPhase = 1) {
  const bob = Math.sin(time * 2.6) * 1.4;
  c.save(); c.translate(x, y); c.scale(face, 1);
  ell(c, 0, 2, 26, 6); c.fillStyle = "rgba(29,22,18,0.3)"; c.fill();
  if (phase >= 2) { // silver aura in later phases
    c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(time * 5); ell(c, 0, -58, 46 + phase * 4, 70); c.fillStyle = "#cfc6ee"; c.fill(); c.restore();
  }
  // pale trousers + dark boots
  limb(c, -6, -38, -9, -6, -4, 9, "#e6e0d2"); limb(c, 7, -38, 10, -6, 4, 9, "#e6e0d2");
  for (const fx of [-10, 11]) { ell(c, fx + 3, -3, 10, 5); ink(c, "#24202a", 2.5); }
  c.translate(0, bob);
  // uniform coat: black with white panels and tails
  c.beginPath(); c.moveTo(-17, -78); c.lineTo(17, -78); c.lineTo(20, -36); c.lineTo(8, -30); c.lineTo(0, -38); c.lineTo(-8, -30); c.lineTo(-20, -36); c.closePath(); ink(c, "#1f1c24", 3);
  c.beginPath(); c.moveTo(-4, -78); c.lineTo(4, -78); c.lineTo(6, -40); c.lineTo(-6, -40); c.closePath(); ink(c, "#f2efe8", 2);
  c.fillStyle = "#f2efe8"; c.fillRect(-17, -50, 34, 4); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-17, -50, 34, 4);
  // silver insignia (star badge) + epaulette
  star(c, -10, -66, 5); ink(c, "#c8ccd4", 1.5);
  ell(c, 15, -76, 7, 3); ink(c, "#c8ccd4", 2);
  // arms with dark gloves; front hand holds a silver baton
  limb(c, -15, -74, -20, -48, -6, 7, "#1f1c24"); ell(c, -20, -46, 5, 5); ink(c, "#141218", 2);
  limb(c, 15, -74, 26, -54, 6, 7, "#1f1c24"); ell(c, 27, -52, 5, 5); ink(c, "#141218", 2);
  c.save(); c.translate(27, -52); c.rotate(-0.6);
  c.beginPath(); c.roundRect(-2.5, -30, 5, 34, 2); ink(c, "#d4d8de", 2);
  star(c, 0, -32, 4); ink(c, "#c8ccd4", 1.5); c.restore();
  // collar + head
  c.beginPath(); c.moveTo(-9, -80); c.lineTo(0, -74); c.lineTo(9, -80); ink(c, "#f2efe8", 2);
  ell(c, 0, -94, 16, 15); ink(c, "#f5e0cc", 3);
  // short silver-lavender hair with side braid
  c.beginPath(); c.moveTo(-17, -90); c.quadraticCurveTo(-18, -114, 2, -112); c.quadraticCurveTo(19, -110, 17, -88);
  c.quadraticCurveTo(10, -102, -2, -100); c.quadraticCurveTo(-10, -98, -17, -90); ink(c, "#d7d0e6", 3);
  c.beginPath(); c.moveTo(-17, -90); c.lineTo(-19, -80); c.lineTo(-12, -88); ink(c, "#d7d0e6", 2.5);
  for (let i = 0; i < 3; i++) { ell(c, -17 - i * 0.5, -78 + i * 6, 3.4, 3.6); ink(c, "#c9c0dc", 1.8); }
  // visible amber eye (front) + black star eyepatch (back eye)
  ell(c, 7, -94, 2.6, 3.4); ink(c, "#e0a032", 1.5); ell(c, 7.4, -94, 1, 1.4); c.fillStyle = INK; c.fill();
  c.beginPath(); c.moveTo(-16, -100); c.lineTo(16, -104); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  star(c, -4, -95, 6.5); ink(c, "#141218", 1.5);
  c.beginPath(); c.moveTo(3, -86); c.quadraticCurveTo(7, -84, 10, -87); c.lineWidth = 1.8; c.stroke();
  c.restore();
}

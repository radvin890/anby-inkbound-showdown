export type CharacterId = "anby" | "nicole";

export const CHARACTER_ATTACKS = {
  anby: { cooldown: 0.32, duration: 0.18, damage: 14, reach: 112 },
  nicole: { cooldown: 0.22, duration: 0.16, damage: 6, speed: 980, lifetime: 0.75 },
} as const;

export function characterForKey(code: string, target: EventTarget | null): CharacterId | null {
  if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"))) return null;
  if (code === "Digit1" || code === "Numpad1") return "anby";
  if (code === "Digit2" || code === "Numpad2") return "nicole";
  return null;
}

export function swordHitsBoss(x: number, y: number, face: number, bossX: number, bossY: number): boolean {
  const forward = (bossX - x) * face;
  // Match the visible teapot body, not its decorative spout or handle.
  return forward >= 0 && forward <= CHARACTER_ATTACKS.anby.reach + 95 && y - 20 >= bossY - 78 && y - 100 <= bossY + 78;
}
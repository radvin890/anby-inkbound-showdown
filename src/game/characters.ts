export type CharacterId = "anby" | "nicole";
export const KNOCKOUT_SECONDS = 2.5;
export const TAG_BUBBLE_SECONDS = 3.5;
export const ANBY_TAG_MESSAGE = "I told you to be careful";

export const CHARACTER_ATTACKS = {
  anby: { cooldown: 0.32, duration: 0.18, damage: 14, reach: 112 },
  nicole: { cooldown: 0.22, duration: 0.16, damage: 6, speed: 980, lifetime: 0.75 },
} as const;

/** Quick Assist: window opened when the controlled character is hit. */
export const ASSIST_WINDOW_SECONDS = 0.5;
/** Time scale applied ONLY to the injured character while the window is open. */
export const ASSIST_HURT_TIMESCALE = 0.25;
export const ASSIST_DURATION = 0.75;
export const ASSIST_STRIKE_AT = 0.32;
export const ASSIST_DAMAGE: Record<CharacterId, number> = { anby: 20, nicole: 16 };

export function teammateOf(character: CharacterId): CharacterId {
  return character === "anby" ? "nicole" : "anby";
}

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
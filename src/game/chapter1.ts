// Story Mode Chapter 1: Ghosts of Silver Squad.
import type { DialogueLine } from "./prologue";

export const CHAPTER1_OBJECTIVE = { distance: 150, enemies: 3 } as const;

export interface Clue { id: string; distance: number; title: string; text: string }
/** Recoverable reports placed along the facility corridor (metres). */
export const CHAPTER1_CLUES: Clue[] = [
  { id: "log", distance: 30, title: "DUTY LOG", text: "Night shift moved to Wing C. Do not ask why." },
  { id: "memo", distance: 75, title: "TORN MEMO", text: "Subject transfer approved. Records sealed." },
  { id: "report", distance: 120, title: "PROJECT REPORT", text: "Project ███: results exceed estimates. Halt pending review." },
];

/** Converts a corridor distance (metres) to the world x used by the streamed path. */
export const clueX = (distance: number) => 320 + distance * 10;

export function cluesCollectedBy(x: number, collected: ReadonlySet<string>): Clue[] {
  return CHAPTER1_CLUES.filter((c) => !collected.has(c.id) && x >= clueX(c.distance));
}

export function chapter1Met(distance: number, defeated: number) {
  return distance >= CHAPTER1_OBJECTIVE.distance && defeated >= CHAPTER1_OBJECTIVE.enemies;
}

export const CHAPTER1_INTRO: DialogueLine[] = [
  { scene: "site", speaker: "", text: "The market district. The smoke has cleared, but the scorch marks remain." },
  { scene: "site", speaker: "Nicole", text: "These blast traces are wrong. No ordinary weapon burns like this." },
  { scene: "site", speaker: "Anby", text: "...I know this energy signature. It's Silver Squad." },
  { scene: "site", speaker: "Nicole", text: "Silver Squad? Weren't they shut down years ago?" },
  { scene: "site", speaker: "Anby", text: "Officially. There's an old facility outside the district. We start there." },
  { scene: "facility", speaker: "", text: "An abandoned Silver Squad facility. The lights still flicker." },
  { scene: "facility", speaker: "Nicole", text: "Creepy. And I'm pretty sure those old sentries still work." },
  { scene: "facility", speaker: "Anby", text: "Stay close. Look for anything they left behind." },
];

export const CHAPTER1_OUTRO: DialogueLine[] = [
  { scene: "facility", speaker: "Nicole", text: "Sealed records, a project with no name... someone wanted this buried." },
  { scene: "monitor", speaker: "", text: "An old monitor flickers to life." },
  { scene: "monitor", speaker: "Unknown Voice", text: "You're getting closer than I expected." },
  { scene: "monitor", speaker: "Anby", text: "Who are you?" },
  { scene: "monitor", speaker: "Unknown Voice", text: "Someone you should have remembered." },
  { scene: "static", speaker: "", text: "The screen cuts out." },
];

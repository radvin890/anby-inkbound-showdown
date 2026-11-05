// Story Mode Prologue: cutscene panels around one short playable investigation run.
export type PrologueScene = "peace" | "incident" | "witness" | "squad" | "end" | "site" | "facility" | "monitor" | "static";
export interface DialogueLine { speaker: string; text: string; scene: PrologueScene }

export const PROLOGUE_OBJECTIVE = { distance: 90, enemies: 2 } as const;

export function objectiveProgress(distance: number, defeated: number) {
  return { distance: Math.min(distance, PROLOGUE_OBJECTIVE.distance), enemies: Math.min(defeated, PROLOGUE_OBJECTIVE.enemies) };
}
export function objectiveMet(distance: number, defeated: number) {
  return distance >= PROLOGUE_OBJECTIVE.distance && defeated >= PROLOGUE_OBJECTIVE.enemies;
}

export const PROLOGUE_INTRO: DialogueLine[] = [
  { scene: "peace", speaker: "", text: "New Eridu. Peace, at last." },
  { scene: "peace", speaker: "Nicole", text: "No contracts, no chases. Just a quiet afternoon. I could get used to this." },
  { scene: "peace", speaker: "Anby", text: "Quiet suits you. You've stopped counting debts out loud." },
  { scene: "peace", speaker: "Nicole", text: "Hey! I only do that when I'm stressed... which is always. Except today." },
  { scene: "incident", speaker: "", text: "A blast rolls through the streets. Smoke rises over the rooftops." },
  { scene: "incident", speaker: "Anby", text: "That came from the market district." },
  { scene: "incident", speaker: "Nicole", text: "So much for my day off. Come on!" },
  { scene: "witness", speaker: "Shopkeeper", text: "You! Don't come any closer! You did this!" },
  { scene: "witness", speaker: "Anby", text: "...Me?" },
  { scene: "witness", speaker: "Witness", text: "Silver hair, a sword, that exact face. It was you. I saw it with my own eyes." },
  { scene: "witness", speaker: "Nicole", text: "Anby was with me all afternoon. Whoever you saw, it wasn't her." },
  { scene: "witness", speaker: "Anby", text: "Then someone is wearing my face. Let's follow the smoke." },
];

export const PROLOGUE_OUTRO: DialogueLine[] = [
  { scene: "witness", speaker: "Nicole", text: "The trail just... stops. Like they knew we'd come." },
  { scene: "witness", speaker: "Anby", text: "They wanted to be seen. And they wanted people to see me." },
  { scene: "squad", speaker: "", text: "Elsewhere. An old Silver Squad post, long abandoned." },
  { scene: "squad", speaker: "???", text: "Still chasing smoke, Anby? Good. Keep looking." },
  { scene: "squad", speaker: "???", text: "You'll find me soon enough." },
];

export type PrologueStep = "intro" | "play" | "outro" | "end";
export function nextStep(step: PrologueStep): PrologueStep {
  return step === "intro" ? "play" : step === "play" ? "outro" : "end";
}

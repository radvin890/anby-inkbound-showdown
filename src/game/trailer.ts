// Story trailer timeline: fixed beats in order, auto-advancing (~44 s total).
export type TrailerSceneId = "peace" | "incidents" | "witnesses" | "black" | "squad" | "reveal" | "end";
export interface TrailerScene { id: TrailerSceneId; duration: number; caption: string }

export const TRAILER_SCENES: TrailerScene[] = [
  { id: "peace", duration: 7, caption: "NEW ERIDU. PEACE, AT LAST." },
  { id: "incidents", duration: 7, caption: "Strange incidents and destruction spread through the city." },
  { id: "witnesses", duration: 7, caption: "Witnesses insist the culprit looks exactly like Anby." },
  { id: "black", duration: 1.5, caption: "" },
  { id: "squad", duration: 7, caption: "SILVER SQUAD" },
  { id: "reveal", duration: 7, caption: "TWIGGY. ONE FACE. TWO IDENTITIES." },
  { id: "end", duration: 7, caption: "ANBY: INKBOUND SHOWDOWN. THE FINAL SHOWDOWN IS COMING." },
];

export const TRAILER_LENGTH = TRAILER_SCENES.reduce((s, x) => s + x.duration, 0);

export function sceneAt(t: number) {
  let start = 0;
  for (let index = 0; index < TRAILER_SCENES.length; index++) {
    const scene = TRAILER_SCENES[index]!;
    if (t < start + scene.duration || index === TRAILER_SCENES.length - 1) return { index, scene, local: Math.min(t - start, scene.duration) };
    start += scene.duration;
  }
  throw new Error("unreachable");
}

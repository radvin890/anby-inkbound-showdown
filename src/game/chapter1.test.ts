import { describe, expect, it } from "vitest";
import { CHAPTER1_CLUES, CHAPTER1_INTRO, CHAPTER1_OUTRO, chapter1Met, clueX, cluesCollectedBy } from "./chapter1";

describe("chapter 1", () => {
  it("needs 150 m and three sentries", () => {
    expect(chapter1Met(149, 3)).toBe(false);
    expect(chapter1Met(150, 2)).toBe(false);
    expect(chapter1Met(150, 3)).toBe(true);
  });
  it("collects each report once when passed", () => {
    expect(cluesCollectedBy(clueX(30) - 1, new Set())).toHaveLength(0);
    expect(cluesCollectedBy(clueX(30), new Set()).map((c) => c.id)).toEqual(["log"]);
    expect(cluesCollectedBy(clueX(200), new Set(["log"]))).toHaveLength(CHAPTER1_CLUES.length - 1);
  });
  it("story beats: Nicole spots traces, Anby names Silver Squad", () => {
    expect(CHAPTER1_INTRO.some((l) => l.speaker === "Nicole" && /traces/i.test(l.text))).toBe(true);
    expect(CHAPTER1_INTRO.some((l) => l.speaker === "Anby" && /Silver Squad/.test(l.text))).toBe(true);
  });
  it("ends with the exact monitor lines and a cut-out, never naming Twiggy", () => {
    const texts = CHAPTER1_OUTRO.map((l) => l.text);
    expect(texts).toContain("You're getting closer than I expected.");
    expect(texts).toContain("Someone you should have remembered.");
    expect(CHAPTER1_OUTRO.at(-1)?.scene).toBe("static");
    [...CHAPTER1_INTRO, ...CHAPTER1_OUTRO, ...CHAPTER1_CLUES.map((c) => ({ text: c.text, speaker: c.title }))].forEach((l) => expect(l.text + l.speaker).not.toMatch(/twiggy/i));
  });
});

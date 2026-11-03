import { describe, expect, it } from "vitest";
import { PROLOGUE_INTRO, PROLOGUE_OUTRO, nextStep, objectiveMet } from "./prologue";
describe("prologue", () => {
  it("requires both distance and two enemies", () => {
    expect(objectiveMet(90, 1)).toBe(false);
    expect(objectiveMet(89, 2)).toBe(false);
    expect(objectiveMet(90, 2)).toBe(true);
  });
  it("witnesses say the culprit looks like Anby", () => {
    expect(PROLOGUE_INTRO.some((l) => l.scene === "witness" && /face|you did/i.test(l.text))).toBe(true);
  });
  it("teases Twiggy without naming her", () => {
    [...PROLOGUE_INTRO, ...PROLOGUE_OUTRO].forEach((l) => { expect(l.text + l.speaker).not.toMatch(/twiggy/i); });
    expect(PROLOGUE_OUTRO.at(-1)?.scene).toBe("squad");
  });
  it("steps intro -> play -> outro -> end", () => {
    expect(nextStep("intro")).toBe("play"); expect(nextStep("play")).toBe("outro"); expect(nextStep("outro")).toBe("end");
  });
});

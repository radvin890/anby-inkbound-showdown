import { describe, expect, it } from "vitest";
import { TRAILER_LENGTH, TRAILER_SCENES, sceneAt } from "./trailer";

describe("story trailer", () => {
  it("runs between 35 and 50 seconds", () => {
    expect(TRAILER_LENGTH).toBeGreaterThanOrEqual(35);
    expect(TRAILER_LENGTH).toBeLessThanOrEqual(50);
  });
  it("plays the beats in the requested order, hiding Twiggy until the reveal", () => {
    expect(TRAILER_SCENES.map((s) => s.id)).toEqual(["peace", "incidents", "witnesses", "black", "squad", "reveal", "end"]);
    const reveal = TRAILER_SCENES.findIndex((s) => s.id === "reveal");
    TRAILER_SCENES.slice(0, reveal).forEach((s) => expect(s.caption).not.toMatch(/twiggy/i));
  });
  it("advances automatically by time", () => {
    expect(sceneAt(0).scene.id).toBe("peace");
    expect(sceneAt(7.1).scene.id).toBe("incidents");
    expect(sceneAt(TRAILER_LENGTH + 5).scene.id).toBe("end");
  });
});

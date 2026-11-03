import { describe, expect, it } from "vitest";
import { TWIGGY_MAX_HP, TWIGGY_PHASES, twiggyPhaseFor } from "./twiggy";
import { characterForKey } from "./characters";

describe("Twiggy boss foundation", () => {
  it("has three phases switching at two-thirds and one-third HP", () => {
    expect(TWIGGY_PHASES.map((p) => p.phase)).toEqual([1, 2, 3]);
    expect(twiggyPhaseFor(TWIGGY_MAX_HP)).toBe(1);
    expect(twiggyPhaseFor(TWIGGY_MAX_HP * 0.66)).toBe(2);
    expect(twiggyPhaseFor(TWIGGY_MAX_HP * 0.33)).toBe(3);
    expect(twiggyPhaseFor(0)).toBe(3);
  });
  it("is not selectable as a playable character", () => {
    expect(characterForKey("Digit3", null)).toBeNull();
  });
});

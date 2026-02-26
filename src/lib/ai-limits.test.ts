import { describe, expect, it } from "vitest";
import { AI_TEXT_LIMITS } from "./ai-limits";

describe("AI limits", () => {
  it("provides higher limits for pro", () => {
    expect(AI_TEXT_LIMITS.pro).toBeGreaterThan(AI_TEXT_LIMITS.hobby);
  });
});

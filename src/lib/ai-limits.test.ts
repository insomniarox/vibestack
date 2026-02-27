import { describe, expect, it } from "vitest";
import { PLAN_CONFIG } from "./plan-limits";

describe("AI limits", () => {
  it("provides higher limits for pro", () => {
    expect(PLAN_CONFIG.pro.aiTextLimit).toBeGreaterThan(PLAN_CONFIG.hobby.aiTextLimit);
  });
});

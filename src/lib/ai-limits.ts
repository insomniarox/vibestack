import type { UserPlan } from "@/lib/user-plans";

export const AI_TEXT_LIMITS: Record<UserPlan, number> = {
  hobby: 2000,
  pro: 8000,
};

export function getAiTextLimit(plan: UserPlan) {
  return AI_TEXT_LIMITS[plan];
}

import type { UserPlan } from "@/lib/user-plans";

export const PLAN_LIMITS: Record<UserPlan, { subscribers: number }> = {
  hobby: { subscribers: 500 },
  pro: { subscribers: 10000 },
};

export const AI_TEXT_LIMITS: Record<UserPlan, number> = {
  hobby: 2000,
  pro: 8000,
};

export const AI_DAILY_CALL_LIMITS: Record<UserPlan, number> = {
  hobby: 15,
  pro: 100,
};

export function getAiTextLimit(plan: UserPlan) {
  return AI_TEXT_LIMITS[plan];
}

export function getAiDailyCallLimit(plan: UserPlan) {
  return AI_DAILY_CALL_LIMITS[plan];
}

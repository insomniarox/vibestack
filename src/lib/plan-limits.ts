import type { UserPlan } from "@/lib/user-plans";

export const PLAN_CONFIG: Record<UserPlan, { subscribers: number; aiTextLimit: number; aiDailyCallLimit: number }> = {
  hobby: { subscribers: 500, aiTextLimit: 2000, aiDailyCallLimit: 15 },
  pro: { subscribers: 10000, aiTextLimit: 8000, aiDailyCallLimit: 100 },
};

export const PLAN_LIMITS: Record<UserPlan, { subscribers: number }> = {
  hobby: { subscribers: PLAN_CONFIG.hobby.subscribers },
  pro: { subscribers: PLAN_CONFIG.pro.subscribers },
};

export function getAiTextLimit(plan: UserPlan) {
  return PLAN_CONFIG[plan].aiTextLimit;
}

export function getAiDailyCallLimit(plan: UserPlan) {
  return PLAN_CONFIG[plan].aiDailyCallLimit;
}

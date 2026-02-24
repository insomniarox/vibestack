import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserPlan = "hobby" | "pro";

export function normalizePlan(plan?: string | null): UserPlan {
  return plan === "pro" ? "pro" : "hobby";
}

export function buildHandle(userId: string, username?: string | null, firstName?: string | null) {
  return username || firstName || `user_${userId.slice(-5)}`;
}

export async function upsertUserRecord(params: { id: string; email: string; handle: string }) {
  await db.insert(users).values(params).onConflictDoNothing();
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const result = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId));
  return normalizePlan(result[0]?.plan);
}

export async function setUserPlan(userId: string, plan: UserPlan, planSubscriptionId: string | null) {
  await db.update(users).set({ plan, planSubscriptionId }).where(eq(users.id, userId));
}
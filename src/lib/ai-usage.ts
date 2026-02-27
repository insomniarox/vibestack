import { db } from "@/db";
import { aiDailyUsage } from "@/db/schema";
import { getAiDailyCallLimit } from "@/lib/plan-limits";
import type { UserPlan } from "@/lib/user-plans";
import { sql, and, eq } from "drizzle-orm";

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getNextUtcMidnightIso() {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return reset.toISOString();
}

export async function getAiUsage(userId: string, plan: UserPlan) {
  const usageDate = getUtcDateKey();
  const limit = getAiDailyCallLimit(plan);
  const result = await db
    .select({ calls: aiDailyUsage.calls })
    .from(aiDailyUsage)
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.usageDate, usageDate)));

  const calls = result[0]?.calls ?? 0;
  return { calls, limit, resetAt: getNextUtcMidnightIso() };
}

export async function consumeAiCall(userId: string, plan: UserPlan) {
  const usageDate = getUtcDateKey();
  const limit = getAiDailyCallLimit(plan);

  const result = await db.execute(sql`
    insert into ${aiDailyUsage} (user_id, usage_date, calls, updated_at)
    values (${userId}, ${usageDate}, 1, now())
    on conflict (user_id, usage_date) do update
      set calls = ${aiDailyUsage.calls} + 1,
          updated_at = now()
      where ${aiDailyUsage.calls} < ${limit}
    returning calls
  `);

  const calls = Number(result.rows?.[0]?.calls ?? 0);
  const allowed = calls > 0 && calls <= limit;

  if (!allowed) {
    return { allowed: false, calls: limit, limit, resetAt: getNextUtcMidnightIso() };
  }

  return { allowed: true, calls, limit, resetAt: getNextUtcMidnightIso() };
}

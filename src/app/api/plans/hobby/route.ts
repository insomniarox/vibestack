import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { buildHandle, setUserPlan, upsertUserRecord } from "@/lib/user-plans";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function handle(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || "http://localhost:3000";
  const user = await currentUser();

  if (!user) {
    const redirectUrl = `${appUrl}/api/plans/hobby`;
    const signInUrl = `${appUrl}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
    return NextResponse.redirect(signInUrl, 303);
  }

  const email = user.emailAddresses[0]?.emailAddress || "no-email";
  const handle = buildHandle(user.id, user.username, user.firstName);

  await upsertUserRecord({
    id: user.id,
    email: email,
    handle: handle,
  });

  // Cancel the existing Stripe Pro subscription before downgrading
  const existingUser = await db.select({ planSubscriptionId: users.planSubscriptionId }).from(users).where(eq(users.id, user.id));
  const planSubId = existingUser[0]?.planSubscriptionId;
  if (planSubId) {
    try {
      await stripe.subscriptions.cancel(planSubId);
    } catch (err) {
      console.error("Failed to cancel Stripe subscription on hobby downgrade:", err);
    }
  }

  await setUserPlan(user.id, "hobby", null);

  return NextResponse.redirect(`${appUrl}/dashboard`, 303);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}

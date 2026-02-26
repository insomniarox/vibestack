import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { buildHandle, upsertUserRecord } from "@/lib/user-plans";

const PRO_SUBSCRIPTION_PRICE_CENTS = parseInt(process.env.PRO_SUBSCRIPTION_PRICE_CENTS || "1200", 10);

async function handle(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || "http://localhost:3000";
  const user = await currentUser();

  if (!user) {
    const redirectUrl = `${appUrl}/api/plans/pro`;
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

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'VibeStack Pro',
            description: 'Full vibe engine access and premium features.',
          },
          unit_amount: PRO_SUBSCRIPTION_PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?plan=pro`,
    cancel_url: `${appUrl}/?canceled=true`,
    metadata: {
      planType: 'pro',
      userId: user.id,
    },
  });

  if (session.url) {
    return NextResponse.redirect(session.url, 303);
  }

  return new NextResponse("Failed to create session", { status: 500 });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}

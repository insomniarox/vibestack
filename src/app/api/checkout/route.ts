import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { subscribers, users } from '@/db/schema';
import { and, count, eq, ne } from 'drizzle-orm';
import { PLAN_LIMITS } from '@/lib/user-plans';

const AUTHOR_SUBSCRIPTION_PRICE_CENTS = parseInt(process.env.AUTHOR_SUBSCRIPTION_PRICE_CENTS || "500", 10);

function isValidOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const allowedHost = new URL(appUrl).host;

  if (origin) {
    try { return new URL(origin).host === allowedHost; } catch { return false; }
  }
  if (referer) {
    try { return new URL(referer).host === allowedHost; } catch { return false; }
  }
  return false;
}

async function isHobbyLimitReached(authorId: string) {
  const author = await db.select({ plan: users.plan }).from(users).where(eq(users.id, authorId));
  const plan = author[0]?.plan || 'hobby';
  if (plan !== 'hobby') return false;

  const [{ value }] = await db
    .select({ value: count() })
    .from(subscribers)
    .where(and(eq(subscribers.authorId, authorId), ne(subscribers.status, 'unsubscribed')));

  return Number(value) >= PLAN_LIMITS.hobby.subscribers;
}

function getAppUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000';
}

async function createSubscriptionSession(authorId: string, req: Request) {
  if (await isHobbyLimitReached(authorId)) {
    return new NextResponse("Author has reached the hobby subscriber limit", { status: 403 });
  }

  const user = await currentUser();
  const customerEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress;
  const normalizedEmail = customerEmail?.trim().toLowerCase();
  const appUrl = getAppUrl(req);
  const author = await db.select({ handle: users.handle }).from(users).where(eq(users.id, authorId));
  const authorHandle = author[0]?.handle;
  const successRedirect = authorHandle ? `${appUrl}/${authorHandle}` : `${appUrl}/`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: normalizedEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Author Subscription',
            description: 'Follow this author and get their emails.',
          },
          unit_amount: AUTHOR_SUBSCRIPTION_PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: `${successRedirect}?success=true`,
    cancel_url: `${appUrl}/?canceled=true`,
    metadata: {
      planType: 'author',
      authorId: authorId,
      authorHandle: authorHandle ?? null,
      subscriberUserId: user?.id ?? null,
    },
  });

  if (session.url) {
    return NextResponse.redirect(session.url, 303);
  }

  return new NextResponse("Failed to create session", { status: 500 });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const authorId = url.searchParams.get('authorId');

    if (!authorId) {
      return new NextResponse("Author ID required", { status: 400 });
    }

    const user = await currentUser();
    if (!user) {
      const appUrl = getAppUrl(req);
      const redirectUrl = `${appUrl}/api/checkout?authorId=${encodeURIComponent(authorId)}`;
      const signInUrl = `${appUrl}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
      return NextResponse.redirect(signInUrl, 303);
    }

    return createSubscriptionSession(authorId, req);
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isValidOrigin(req)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const formData = await req.formData();
    const authorId = formData.get('authorId') as string;

    if (!authorId || typeof authorId !== 'string') {
      return new NextResponse("Author ID required", { status: 400 });
    }

    const user = await currentUser();
    if (!user) {
      const appUrl = getAppUrl(req);
      const redirectUrl = `${appUrl}/api/checkout?authorId=${encodeURIComponent(authorId)}`;
      const signInUrl = `${appUrl}/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;
      return NextResponse.redirect(signInUrl, 303);
    }

    return createSubscriptionSession(authorId, req);
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

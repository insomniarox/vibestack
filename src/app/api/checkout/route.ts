import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { currentUser } from '@clerk/nextjs/server';

const SUBSCRIPTION_PRICE_CENTS = parseInt(process.env.SUBSCRIPTION_PRICE_CENTS || "1200", 10);

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
    const customerEmail = user?.emailAddresses[0]?.emailAddress;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'VibeStack Premium Subscription',
              description: 'Unlock all premium transmissions from this author.',
            },
            unit_amount: SUBSCRIPTION_PRICE_CENTS,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/?success=true`,
      cancel_url: `${appUrl}/?canceled=true`,
      metadata: {
        authorId: authorId,
      },
    });

    if (session.url) {
      return NextResponse.redirect(session.url, 303);
    }

    return new NextResponse("Failed to create session", { status: 500 });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

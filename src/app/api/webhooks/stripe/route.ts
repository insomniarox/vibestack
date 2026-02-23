import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('Stripe-Signature');

  if (!sig) {
    return new NextResponse('Missing Stripe-Signature header', { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    const authorId = session.metadata?.authorId;
    const email = session.customer_details?.email;
    const subscriptionId = session.subscription;

    if (authorId && email) {
      await db.insert(subscribers).values({
        authorId: authorId,
        email: email,
        status: 'active',
        stripeSubscriptionId: subscriptionId,
      });
      console.log(`✅ Successfully subscribed ${email} to author ${authorId}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const subscriptionId = subscription.id;

    if (subscriptionId) {
      await db
        .update(subscribers)
        .set({ status: 'unsubscribed' })
        .where(eq(subscribers.stripeSubscriptionId, subscriptionId));
      console.log(`🚫 Cancelled subscription ${subscriptionId}`);
    }
  }

  return new NextResponse('OK', { status: 200 });
}

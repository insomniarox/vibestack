import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { subscribers, users } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { setUserPlan } from '@/lib/user-plans';
import type Stripe from 'stripe';

async function upsertAuthorSubscription(
  authorId: string,
  normalizedEmail: string,
  subscriptionId: string,
  subscriberUserId: string | null
) {
  const matchClauses = [sql`lower(${subscribers.email}) = ${normalizedEmail}`];
  if (subscriberUserId) {
    matchClauses.push(eq(subscribers.subscriberUserId, subscriberUserId));
  }

  const existing = await db.select().from(subscribers).where(
    and(eq(subscribers.authorId, authorId), or(...matchClauses))
  );

  if (existing.length > 0) {
    await db.update(subscribers).set({
      status: 'active',
      stripeSubscriptionId: subscriptionId,
      email: normalizedEmail,
      subscriberUserId: subscriberUserId ?? existing[0]?.subscriberUserId ?? null,
    }).where(eq(subscribers.id, existing[0].id));
  } else {
    await db.insert(subscribers).values({
      authorId: authorId,
      subscriberUserId: subscriberUserId ?? null,
      email: normalizedEmail,
      status: 'active',
      stripeSubscriptionId: subscriptionId,
    });
  }
}

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('Stripe-Signature');

  if (!sig) {
    return new NextResponse('Missing Stripe-Signature header', { status: 400 });
  }

  let event: Stripe.Event;

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

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const planType = session.metadata?.planType || 'author';
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

      if (planType === 'pro') {
        const userId = session.metadata?.userId;
        if (userId && subscriptionId) {
          await setUserPlan(userId, 'pro', subscriptionId);
        }
      } else {
        const authorId = session.metadata?.authorId;
        const email = session.customer_email || session.customer_details?.email;
        const normalizedEmail = email?.trim().toLowerCase();
        const subscriberUserId = session.metadata?.subscriberUserId || null;

        if (authorId && normalizedEmail && subscriptionId) {
          await upsertAuthorSubscription(authorId, normalizedEmail, subscriptionId, subscriberUserId);
          console.log(`Webhook: subscribed ${normalizedEmail} to author ${authorId}`);
        } else {
          console.error(`Webhook: missing data for author subscription - authorId=${authorId}, email=${normalizedEmail}, subscriptionId=${subscriptionId}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      if (subscriptionId) {
        await db
          .update(subscribers)
          .set({ status: 'unsubscribed' })
          .where(eq(subscribers.stripeSubscriptionId, subscriptionId));
        await db
          .update(users)
          .set({ plan: 'hobby', planSubscriptionId: null })
          .where(eq(users.planSubscriptionId, subscriptionId));
        console.log(`Webhook: cancelled subscription ${subscriptionId}`);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoiceAny = invoice as any;
      const subscriptionId = typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id ?? null;

      if (subscriptionId) {
        // Mark subscriber as past_due so the system can handle graceful degradation
        await db
          .update(subscribers)
          .set({ status: 'past_due' })
          .where(eq(subscribers.stripeSubscriptionId, subscriptionId));
        console.log(`Webhook: payment failed for subscription ${subscriptionId}`);
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Return 200 to prevent Stripe from retrying indefinitely,
    // but log the error for investigation
    return new NextResponse('Webhook handler error (logged)', { status: 200 });
  }

  return new NextResponse('OK', { status: 200 });
}

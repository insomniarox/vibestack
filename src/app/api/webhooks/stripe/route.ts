import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('Stripe-Signature');

  let event;

  try {
    // Note: You must add STRIPE_WEBHOOK_SECRET to your .env.local
    event = stripe.webhooks.constructEvent(
      payload, 
      sig!, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the checkout session completing
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    
    const authorId = session.metadata?.authorId;
    const email = session.customer_details?.email;
    const subscriptionId = session.subscription;

    if (authorId && email) {
      // Add the user to the subscribers table as an 'active' premium member
      await db.insert(subscribers).values({
        authorId: authorId,
        email: email,
        status: 'active',
        stripeSubscriptionId: subscriptionId,
      });
      console.log(`✅ Successfully subscribed ${email} to author ${authorId}`);
    }
  }

  // Handle subscription cancellations
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    // We would look up the subscriber by stripeSubscriptionId and mark them unsubscribed
    // Skipped for brevity, but this is where cancellation logic goes
  }

  return new NextResponse('OK', { status: 200 });
}

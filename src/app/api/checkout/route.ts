import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const authorId = formData.get('authorId') as string;

    if (!authorId) {
      return new NextResponse("Author ID required", { status: 400 });
    }

    // Attempt to pre-fill email if user is authenticated
    const user = await currentUser();
    const customerEmail = user?.emailAddresses[0]?.emailAddress;

    // Create a Stripe Checkout Session
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
            unit_amount: 1200, // $12.00
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      // Use the referring URL to bounce them right back
      success_url: `${req.headers.get('origin') || 'http://localhost:3000'}/?success=true`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3000'}/?canceled=true`,
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

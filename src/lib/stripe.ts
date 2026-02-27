import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing. Please set the environment variable.');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      appInfo: {
        name: 'VibeStack',
        version: '0.1.0',
      },
    });
  }
  return _stripe;
}

// Proxy object that lazily initializes Stripe on first access
// This prevents module-level crashes when STRIPE_SECRET_KEY is not set
// (e.g., during builds or on routes that don't need Stripe)
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
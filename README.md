# VibeStack
**The first newsletter platform that understands your mood**

AI-augmented newsletter platform with vibe-aware theming, paid posts, and subscriber delivery.

## Features
- Vibe-driven post styling (themes + optional color schemes)
- Paid content with paywall and author subscriptions
- Clerk authentication (proxy mode middleware)
- Stripe checkout for plans and author subscriptions
- Resend email delivery on publish
- App Router + server actions/APIs via Next.js

## Tech Stack
- Next.js 16 (App Router)
- React 19
- Clerk (auth)
- Drizzle ORM + Postgres (Neon)
- Stripe (billing)
- Resend (email)
- Tailwind CSS

## Quickstart
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Environment Variables
Create `.env.local` with:

```bash
# Core
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
PRO_SUBSCRIPTION_PRICE_CENTS=1200
AUTHOR_SUBSCRIPTION_PRICE_CENTS=500

# Resend
RESEND_API_KEY=...

# AI
GOOGLE_AI_MODEL=gemini-2.5-flash

# Optional
PUBLISH_RATE_LIMIT_HOURS=24
```

## Database
Schema lives in `src/db/schema.ts` (Drizzle).

Run migrations with Drizzle Kit, for example:
```bash
npx drizzle-kit push
```

## Auth and Proxy Mode
Clerk runs in Next.js proxy mode using `src/proxy.ts`. Do not add `src/middleware.ts`.

Sign-in pages should live under:
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

## Payments
- Pro plan checkout: `src/app/api/plans/pro/route.ts`
- Author subscriptions: `src/app/api/checkout/route.ts`
- Stripe webhooks: `src/app/api/webhooks/stripe/route.ts`

## Email Delivery
Publishing sends subscriber emails from `src/app/api/posts/route.ts` using Resend.

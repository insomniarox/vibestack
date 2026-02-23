# AGENTS.md

This file provides guidance to agents (i.e., ADAL) when working with code in this repository.

## Overview

**VibeStack** is a Next.js 16 newsletter platform with AI-powered writing, Stripe subscriptions, and email delivery via Resend. Users write posts with a "vibe" (mood/tone), and AI rewrites content and generates color schemes to match. Posts are emailed to subscribers on publish.

**Stack**: Next.js 16 (App Router) · React 19 · Clerk Auth · Neon Postgres (Drizzle ORM) · Stripe Billing · Vercel Blob (uploads) · Resend (email) · Google Gemini AI · Tailwind CSS v4 · TypeScript

## Essential Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx drizzle-kit push # Push schema changes to Neon DB
npx drizzle-kit generate  # Generate migration files
```

### Gotchas
- **Environment**: All secrets live in `.env.local` (Clerk, Neon DB, Stripe, Resend, Google AI). The app will crash at import time if `STRIPE_SECRET_KEY` is missing (`src/lib/stripe.ts` throws).
- **DB placeholder**: `src/db/index.ts` uses a `postgresql://placeholder` fallback so `next build` doesn't crash when `DATABASE_URL` isn't set. This means build won't catch DB connection issues.
- **Drizzle config** reads `.env.local` explicitly via `dotenv` — standard Next.js env loading doesn't apply to `drizzle-kit` commands.
- **Rate limiting**: `PUBLISH_RATE_LIMIT_HOURS` env var controls publish rate limit (defaults to 24h). Set to `0` in dev to disable.
- **Pricing**: `SUBSCRIPTION_PRICE_CENTS` env var controls Stripe subscription price (defaults to 1200 = $12/month).
- **No test framework** is configured. No tests exist.
- **Node version**: Uses Node v24 (see `.nvm` path). Ensure compatibility.

## Architecture & Data Flow

### Authentication Flow
```
Request → Clerk Middleware (src/middleware.ts) → Route
```
- Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`
- Everything else requires auth (`auth.protect()`)
- API routes use `currentUser()` from `@clerk/nextjs/server` for user identity
- User records in DB are created lazily on first POST to `/api/posts` (upsert with `onConflictDoNothing`)

### Post Publishing Flow
```
VibeEditor (client) → POST /api/posts → Zod validate → sanitize HTML → insert DB → fetch subscribers → Resend batch email
```
1. `VibeEditor` component (`src/components/VibeEditor.tsx`) is the main editor (Novel/TipTap-based)
2. On publish, POST to `/api/posts` with `{title, content, vibe, status, isPaid, colorScheme}`
3. Server validates with Zod (`src/lib/validations.ts`), sanitizes HTML, generates slug, inserts post
4. If `status === 'published'`: queries subscribers, builds styled HTML emails with post's color scheme, sends via Resend batch API
5. Rate limit: one published post per `PUBLISH_RATE_LIMIT_HOURS`

Email sending logic is extracted into `sendPublishEmails()` helper in `/api/posts/route.ts` — shared by both POST and PUT handlers.

### AI Features
| Endpoint | Purpose | Method |
|---|---|---|
| `/api/ai/rewrite` | Rewrites text to match a vibe/tone | Streaming (streamText) |
| `/api/ai/summarize` | Summarizes content into TL;DR | Streaming (streamText) |
| `/api/ai/colors` | Generates 3-color scheme for a vibe | Structured output (generateObject + Zod) |

All AI routes use Google Gemini via `@ai-sdk/google`. Model configured by `GOOGLE_AI_MODEL` env var (default: `gemini-2.5-flash`). All routes validate input with Zod schemas from `src/lib/validations.ts`.

### Stripe Subscription Flow
```
User clicks Subscribe → POST /api/checkout → Stripe Checkout Session → redirect to Stripe
                                                                         ↓
Stripe webhook (checkout.session.completed) → POST /api/webhooks/stripe → insert subscriber as 'active'
```
- Checkout creates a subscription at `SUBSCRIPTION_PRICE_CENTS` (default: $12/month) tied to an `authorId` via metadata
- Webhook verifies signature with `STRIPE_WEBHOOK_SECRET`
- `customer.subscription.deleted` handler marks subscriber as unsubscribed via `stripeSubscriptionId` lookup

### File Upload
```
Client → POST /api/upload?filename=X → Vercel Blob (public access) → returns blob URL
```
Requires `BLOB_READ_WRITE_TOKEN` env var.

### Unsubscribe
```
Email link → GET /api/unsubscribe?token=<uuid> → validates UUID → sets status='unsubscribed' → HTML confirmation
```
Uses cryptographically random UUID tokens per subscriber (not sequential IDs). Tokens are auto-generated on subscriber creation via `defaultRandom()`.

## Input Validation

All API routes use Zod schemas defined in `src/lib/validations.ts`:
- `createPostSchema` — POST `/api/posts`
- `updatePostSchema` — PUT `/api/posts`
- `aiRewriteSchema` — POST `/api/ai/rewrite`
- `aiSummarizeSchema` — POST `/api/ai/summarize`
- `aiColorsSchema` — POST `/api/ai/colors`

## Database Schema (src/db/schema.ts)

4 tables via Drizzle ORM on Neon Postgres:
- **users**: `id` (Clerk userId PK), `handle` (unique), `email` (unique), `bio`
- **posts**: `id` (serial), `authorId` → users, `title`, `slug` (unique), `content` (HTML), `vibeTheme`, `colorScheme` (JSON string), `status`, `isPaid`, `publishedAt`
- **subscribers**: `id` (serial), `authorId` → users, `email`, `status`, `stripeSubscriptionId`, `unsubscribeToken` (UUID, auto-generated)
- **analytics**: `id` (serial), `postId` → posts, `subscriberId` → subscribers, `event`

**Note**: `analytics` table exists in schema but has no API routes writing to it yet.

## Key Entry Points

| Path | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout, ClerkProvider wrapper, fonts |
| `src/app/page.tsx` | Landing page |
| `src/app/dashboard/layout.tsx` | Dashboard sidebar + layout |
| `src/app/dashboard/page.tsx` | Dashboard home (server component, paginated, direct DB queries) |
| `src/app/dashboard/write/page.tsx` | Post editor page |
| `src/app/feed/page.tsx` | Public feed (paginated, 60s revalidation) |
| `src/app/[handle]/page.tsx` | Author profile page |
| `src/app/[handle]/[slug]/page.tsx` | Individual post page (paywall logic) |
| `src/middleware.ts` | Clerk auth middleware |
| `src/components/VibeEditor.tsx` | Main rich text editor (largest component, ~18KB) |
| `src/lib/validations.ts` | Zod schemas for all API input validation |
| `src/lib/stripe.ts` | Stripe client initialization |

## Error Handling

- `src/app/dashboard/error.tsx` — Error boundary for dashboard
- `src/app/dashboard/loading.tsx` — Loading skeleton for dashboard
- `src/app/feed/error.tsx` — Error boundary for feed
- `src/app/feed/loading.tsx` — Loading skeleton for feed

## Remaining Production Readiness Issues

1. **No tests**: Zero test coverage. No test framework configured. (Deferred — will validate on Vercel deployment.)

## Fixed Issues (reference)

- ✅ **String/number type mismatches**: PUT and DELETE in `/api/posts/route.ts` now parse IDs to `number` with `Number()` / `parseInt()` and validate with `isNaN()` before DB queries.
- ✅ **Duplicated email logic**: Extracted into shared `sendPublishEmails()` helper + `parseColorScheme()` + `checkPublishRateLimit()` in `/api/posts/route.ts`.
- ✅ **Stripe cancellation**: `customer.subscription.deleted` webhook handler now marks subscriber as unsubscribed via `stripeSubscriptionId` lookup.
- ✅ **Unsubscribe validation**: Route now uses UUID tokens instead of sequential IDs. Validates UUID format and checks subscriber exists.
- ✅ **Stripe API version**: Updated from deprecated `2023-10-16` to `2026-01-28.clover`.
- ✅ **PUT rate limit**: Now uses `PUBLISH_RATE_LIMIT_HOURS` env var (was hardcoded to 24h).
- ✅ **TypeScript implicit any**: Fixed `prev` and `word` callback parameters in `VibeEditor.tsx`.
- ✅ **Webhook error typing**: Changed `catch (err: any)` to `catch (err: unknown)` with proper type narrowing.
- ✅ **Input validation**: All API routes now validate input with Zod schemas.
- ✅ **Pagination**: Dashboard and feed now paginate at 20 posts per page.
- ✅ **Error boundaries**: Added `error.tsx` for dashboard and feed.
- ✅ **Loading states**: Added `loading.tsx` skeletons for dashboard and feed.
- ✅ **Configurable pricing**: Subscription price via `SUBSCRIPTION_PRICE_CENTS` env var.
- ✅ **Analytics schema**: Fixed `postId`/`subscriberId` to use `integer()` instead of `serial()` for FK columns.
- ✅ **BLOB_READ_WRITE_TOKEN**: Added placeholder to `.env.local`.

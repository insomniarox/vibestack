# VibeStack — Comprehensive Technical Codebase Documentation

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Subscription System](#5-subscription-system)
6. [Content System](#6-content-system)
7. [AI Features](#7-ai-features)
8. [Email System](#8-email-system)
9. [Image Upload](#9-image-upload)
10. [Frontend Components](#10-frontend-components)
11. [API Routes](#11-api-routes)
12. [Plan Limits](#12-plan-limits)
13. [Security Measures](#13-security-measures)
14. [Key Files Reference](#14-key-files-reference)

---

## 1. Architecture Overview

### Framework
Next.js 16 App Router with React 19. The project uses **Clerk proxy mode** instead of standard middleware — the file `src/proxy.ts` (not `src/middleware.ts`) exports the Clerk middleware and route matcher config.

### Route Hierarchy

```
src/app/
├── layout.tsx                          # Root layout: ClerkProvider, fonts, dark theme
├── globals.css                         # Tailwind v4 theme + glassmorphism + smoke rings
├── page.tsx                            # Landing page (marketing, pricing)
├── feed/
│   ├── page.tsx                        # Public feed (paginated published posts)
│   ├── error.tsx                       # Error boundary (client)
│   └── loading.tsx                     # Skeleton loader (server)
├── dashboard/
│   ├── layout.tsx                      # Sidebar, user plan, subscriptions list
│   ├── page.tsx                        # Dashboard home: stats + post list
│   ├── write/
│   │   └── page.tsx                    # VibeEditor wrapper (new or edit post)
│   ├── audience/
│   │   └── page.tsx                    # Subscriber management
│   ├── error.tsx                       # Error boundary (client)
│   └── loading.tsx                     # Skeleton loader (server)
├── [handle]/
│   ├── page.tsx                        # Public author profile + subscribe button
│   └── [slug]/
│       └── page.tsx                    # Individual post view + paywall
├── sign-in/[[...sign-in]]/page.tsx     # Clerk SignIn component
├── sign-up/[[...sign-up]]/page.tsx     # Clerk SignUp component
└── api/
    ├── posts/route.ts                  # POST/PUT/DELETE posts
    ├── checkout/route.ts               # Author subscription checkout (GET/POST)
    ├── upload/route.ts                 # Image upload to Vercel Blob
    ├── unsubscribe/route.ts            # One-click email unsubscribe (GET)
    ├── webhooks/stripe/route.ts        # Stripe webhook handler
    ├── plans/
    │   ├── hobby/route.ts              # Downgrade to hobby (GET/POST)
    │   └── pro/route.ts                # Pro plan checkout (GET/POST)
    └── ai/
        ├── rewrite/route.ts            # AI rewrite endpoint
        ├── summarize/route.ts          # AI summarize endpoint
        ├── colors/route.ts             # AI color scheme generation
        └── usage/route.ts              # AI daily usage query
```

### Data Flow
1. **Authentication**: Clerk handles user identity. The proxy (`src/proxy.ts`) runs before every request, protecting non-public routes via `auth.protect()`.
2. **User Records**: On first API call (post creation, checkout, plan change), `upsertUserRecord()` creates/updates the local `users` table from Clerk data.
3. **Content Pipeline**: Markdown is written in the client-side `VibeEditor`, saved via `POST /api/posts`, stored as raw Markdown in Postgres, and rendered to HTML via `markdown-it` + `sanitize-html` at display time.
4. **Payments**: Stripe Checkout sessions are created server-side. The Stripe webhook is the **primary source of truth** for subscription creation/updates. A secondary sync on the author profile page acts as a fast-path fallback (so the UI reflects the subscription immediately without waiting for the webhook). Both writers use atomic `INSERT ... ON CONFLICT DO UPDATE` on the `UNIQUE(author_id, email)` constraint, making them fully idempotent and race-condition-safe.
5. **Emails**: On publish, the post API fire-and-forgets email delivery via Resend to all non-unsubscribed subscribers.

---

## 2. Tech Stack

| Technology | Version | Role | File(s) |
|---|---|---|---|
| **Next.js** | 16.1.6 | App Router framework, SSR, API routes | `package.json`, `next.config.ts` |
| **React** | 19.2.3 | UI rendering | `package.json` |
| **TypeScript** | ^5 | Type safety | `tsconfig.json` |
| **Tailwind CSS** | v4 | Styling via `@tailwindcss/postcss` plugin | `postcss.config.mjs`, `globals.css` |
| **Clerk** | ^6.38.1 | Authentication (proxy mode) | `src/proxy.ts`, `src/app/layout.tsx` |
| **Clerk Themes** | ^2.4.55 | Dark theme for UserButton | `src/app/dashboard/layout.tsx` |
| **Drizzle ORM** | ^0.45.1 | Database ORM (PostgreSQL) | `src/db/schema.ts`, `src/db/index.ts` |
| **Drizzle Kit** | ^0.31.9 | Migration tooling | `drizzle.config.ts` |
| **Neon Serverless** | ^1.0.2 | PostgreSQL driver (HTTP mode) | `src/db/index.ts` |
| **Stripe** | ^20.3.1 | Payments, subscriptions | `src/lib/stripe.ts` |
| **Resend** | ^6.9.2 | Transactional email delivery | `src/app/api/posts/route.ts` |
| **Vercel AI SDK** | ^6.0.97 | Streaming AI responses | `src/app/api/ai/rewrite/route.ts` |
| **Google AI SDK** | ^3.0.30 | Gemini model provider | `src/app/api/ai/rewrite/route.ts` |
| **Vercel Blob** | ^2.3.0 | Image storage | `src/app/api/upload/route.ts` |
| **Zod** | ^4.3.6 | Schema validation | `src/lib/validations.ts` |
| **markdown-it** | ^14.1.0 | Markdown to HTML rendering | `src/lib/markdown.ts` |
| **sanitize-html** | ^2.17.1 | HTML sanitization (XSS prevention) | `src/lib/markdown.ts` |
| **Framer Motion** | ^12.34.3 | Animations (smoke rings) | `src/components/SmokeRings.tsx` |
| **Lucide React** | ^0.575.0 | Icon library | Throughout components |
| **Vitest** | ^3.2.4 | Unit testing | `vitest.config.ts` |
| **Google Fonts** | — | Geist, Geist Mono, Instrument Serif, Newsreader | `src/app/layout.tsx` |

---

## 3. Database Schema

**Database**: PostgreSQL on Neon (serverless HTTP driver)  
**Schema file**: `src/db/schema.ts`  
**Connection**: `src/db/index.ts`

### Table: `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `text` | **PRIMARY KEY** | Clerk user ID (e.g., `user_2x...`) |
| `handle` | `varchar(255)` | **UNIQUE, NOT NULL** | Public username/handle |
| `email` | `varchar(255)` | **UNIQUE, NOT NULL** | Primary email |
| `bio` | `text` | nullable | Author bio |
| `plan` | `varchar(50)` | **NOT NULL**, default `'hobby'` | `'hobby'` or `'pro'` |
| `plan_subscription_id` | `varchar(255)` | nullable | Stripe subscription ID for Pro plan |
| `created_at` | `timestamp` | **NOT NULL**, default `now()` | Registration timestamp |

### Table: `posts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | **PRIMARY KEY** | Auto-increment integer |
| `author_id` | `text` | **NOT NULL**, FK -> `users.id` | Author reference |
| `title` | `text` | **NOT NULL** | Post title |
| `slug` | `varchar(255)` | **NOT NULL** | URL slug |
| `content` | `text` | nullable | Raw Markdown content |
| `vibe_theme` | `varchar(50)` | default `'default'` | Theme name (neutral, aggressive, melancholic, luxury) |
| `color_scheme` | `text` | nullable | JSON string `{background, text, primary}` |
| `status` | `varchar(50)` | default `'draft'` | `'draft'` or `'published'` |
| `is_paid` | `boolean` | default `false` | Paywall flag |
| `published_at` | `timestamp` | nullable | Publication timestamp |
| `created_at` | `timestamp` | **NOT NULL**, default `now()` | Creation timestamp |

**Indexes on `posts`**:
- `posts_author_id_idx` — B-tree on `author_id`
- `posts_author_slug_uniq` — **UNIQUE** on `(author_id, slug)` (per-author slug uniqueness)

### Table: `subscribers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | **PRIMARY KEY** | Auto-increment |
| `author_id` | `text` | **NOT NULL**, FK -> `users.id` | Which author is subscribed to |
| `subscriber_user_id` | `text` | nullable | Clerk ID of the subscribing user |
| `email` | `varchar(255)` | **NOT NULL** | Subscriber email |
| `status` | `varchar(50)` | default `'pending'` | `'pending'`, `'active'`, `'past_due'`, `'unsubscribed'` |
| `stripe_subscription_id` | `varchar(255)` | nullable | Stripe subscription ID |
| `unsubscribe_token` | `uuid` | **NOT NULL**, default `gen_random_uuid()` | One-click unsubscribe token |
| `created_at` | `timestamp` | **NOT NULL**, default `now()` | Subscription timestamp |

**Indexes on `subscribers`**:
- `subscribers_author_user_idx` — B-tree on `(author_id, subscriber_user_id)`
- `subscribers_author_email_uniq` — **UNIQUE** on `(author_id, email)` — **critical constraint**: this is the `ON CONFLICT` target used by both the webhook and page sync to perform atomic upserts. It guarantees a reader can only have one subscription row per author, eliminating duplicate subscription bugs.
- `subscribers_email_idx` — B-tree on `email`
- `subscribers_stripe_sub_idx` — B-tree on `stripe_subscription_id`
- `subscribers_author_status_idx` — B-tree on `(author_id, status)`

### Table: `ai_daily_usage`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | **PRIMARY KEY** | Auto-increment |
| `user_id` | `text` | **NOT NULL**, FK -> `users.id` | Which user |
| `usage_date` | `date` | **NOT NULL** | UTC date key (`YYYY-MM-DD`) |
| `calls` | `integer` | **NOT NULL**, default `0` | Number of AI calls made that day |
| `updated_at` | `timestamp` | **NOT NULL**, default `now()` | Last update timestamp |

**Indexes on `ai_daily_usage`**:
- `ai_daily_usage_user_date_idx` — **UNIQUE** B-tree on `(user_id, usage_date)`

### Migration History

| # | File | Description |
|---|---|---|
| 0000 | `0000_fluffy_butterfly.sql` | Initial schema: `users`, `posts`, `subscribers` with FKs |
| 0001 | `0001_add_ai_daily_usage.sql` | Add `ai_daily_usage` table + unique index |
| 0002 | `0002_add_subscriber_user_id.sql` | Add `subscriber_user_id` column + composite index |
| 0003 | `0003_fat_leo.sql` | Add 4 performance indexes + unique constraint on `(author_id, email)` |
| 0004 | `0004_unusual_vampiro.sql` | Change slug uniqueness from global to per-author `(author_id, slug)` |

### Entity Relationships

```
users (1) --< posts (many)           via posts.author_id -> users.id
users (1) --< subscribers (many)     via subscribers.author_id -> users.id
users (1) --< ai_daily_usage (many)  via ai_daily_usage.user_id -> users.id
```

---

## 4. Authentication & Authorization

### Clerk Configuration
- **Provider**: `ClerkProvider` wraps entire app in `src/app/layout.tsx`
- **Mode**: Proxy mode — the middleware is exported from `src/proxy.ts` (NOT `src/middleware.ts`)
- **Theme**: Dark theme from `@clerk/themes` applied to `UserButton` in dashboard sidebar

### Proxy/Middleware (`src/proxy.ts`)

**Public routes**:
- `/` — Landing page
- `/sign-in(.*)`, `/sign-up(.*)` — Auth pages
- `/feed` — Public feed
- `/api/checkout` — Checkout (redirects unauthenticated users to sign-in)
- `/api/plans(.*)` — Plan endpoints (handles own auth redirects)
- `/api/unsubscribe` — One-click unsubscribe
- `/api/webhooks/stripe(.*)` — Stripe webhooks (no user auth needed)

**Public content routes**:
- Any path with 1-2 segments that doesn't start with a reserved segment (`dashboard`, `api`, `sign-in`, `sign-up`, `feed`)
- This enables `/:handle` and `/:handle/:slug` to be publicly accessible

**Protected routes**: Everything else calls `auth.protect()`, which returns 401 for unauthenticated requests.

### API Route Auth Pattern
Every protected API route uses `currentUser()` from `@clerk/nextjs/server` and checks for `null`:
- `POST/PUT/DELETE /api/posts` — All require auth
- `POST /api/upload` — Upload requires auth
- `POST /api/ai/*` — All AI routes require auth
- `GET /api/ai/usage` — Usage query requires auth

### Unauthenticated-but-redirecting routes
- `GET /api/checkout` — Redirects to sign-in with redirect_url back to checkout
- `POST /api/checkout` — Same redirect pattern
- `GET/POST /api/plans/pro` — Redirects to sign-in
- `GET/POST /api/plans/hobby` — Redirects to sign-in

---

## 5. Subscription System

There are **two distinct subscription types**:

### 5A. Author Subscription (Reader -> Author, $5/mo)

**Purpose**: A reader pays $5/mo to subscribe to an author's content, unlocking paid posts and receiving email notifications.

#### Checkout Creation (`src/app/api/checkout/route.ts`)

1. **Entry points**: HTML forms on author profile and post pages POST to `/api/checkout` with `authorId` in form data.
2. **CSRF check**: `isValidOrigin()` validates that `Origin` or `Referer` header matches `NEXT_PUBLIC_APP_URL`.
3. **Hobby limit check**: `isHobbyLimitReached()` checks if the target author is on hobby plan and already at 500 non-unsubscribed subscribers. Returns 403 if so.
4. **Session creation**: Creates a Stripe Checkout session with:
   - Mode: `subscription`
   - Payment method: `card`
   - Line item: Dynamic price at `AUTHOR_SUBSCRIPTION_PRICE_CENTS` (default 500 = $5) per month
   - Metadata: `planType: 'author'`, `authorId`, optionally `authorHandle`, `subscriberUserId`
   - Success URL: `/{authorHandle}?success=true&session_id={CHECKOUT_SESSION_ID}`
   - Cancel URL: `/?canceled=true`
5. **Redirect**: Returns 303 redirect to Stripe Checkout URL.

#### Subscription Write Strategy

Both the webhook and the page sync write to the `subscribers` table using the same atomic pattern:

```sql
INSERT INTO subscribers (author_id, email, subscriber_user_id, status, stripe_subscription_id)
VALUES (...)
ON CONFLICT (author_id, email) DO UPDATE SET
  status = 'active',
  stripe_subscription_id = ...,
  subscriber_user_id = COALESCE(new_value, existing_value)
```

This relies on the `UNIQUE(author_id, email)` constraint. Both writers are idempotent — if they both fire for the same checkout (which is common), the second simply updates the existing row. No duplicates can be created regardless of timing.

#### Post-Checkout Page Sync (`src/app/[handle]/page.tsx`)

When the user returns to the author profile with `session_id` in the URL:
1. Retrieves the Stripe session via `stripe.checkout.sessions.retrieve()`
2. Validates `payment_status === 'paid'` and `sessionAuthorId === author.id`
3. Performs atomic `INSERT ... ON CONFLICT DO UPDATE` on `subscribers`
4. This is the **fast path** — ensures the subscription appears in the UI immediately without waiting for the webhook

#### Webhook Confirmation (`src/app/api/webhooks/stripe/route.ts`)

On `checkout.session.completed` with `planType !== 'pro'`:
1. Extracts `authorId`, `email`, `subscriberUserId` from session metadata
2. Calls `upsertAuthorSubscription()` which performs atomic `INSERT ... ON CONFLICT DO UPDATE`
3. This is the **reliable path** — guaranteed delivery by Stripe's retry mechanism

#### Unsubscribe Flow

Two paths:

**Path 1 — One-click link** (`src/app/api/unsubscribe/route.ts`):
1. GET request with `?token={uuid}` parameter
2. Validates UUID format with regex
3. Looks up subscriber by `unsubscribe_token`
4. Cancels the Stripe subscription via `stripe.subscriptions.cancel()`
5. Updates subscriber status to `'unsubscribed'`
6. Returns an HTML confirmation page

**Path 2 — Dashboard sidebar** (`src/app/dashboard/layout.tsx`):
Links to `/api/unsubscribe?token={unsubscribeToken}` for each subscribed author.

#### Cancellation Webhook (`src/app/api/webhooks/stripe/route.ts`)

On `customer.subscription.deleted`:
1. Updates all subscribers with matching `stripeSubscriptionId` to `'unsubscribed'`
2. Also updates `users` table — if this was a Pro plan subscription, downgrades to `'hobby'`

#### Payment Failure Webhook

On `invoice.payment_failed`:
1. Marks subscriber status as `'past_due'`

### 5B. Platform Plan Subscription (Author -> VibeStack Pro, $12/mo)

**Purpose**: An author upgrades from Hobby ($0) to Pro ($12/mo) to unlock higher limits and the Vibe Engine.

#### Pro Checkout (`src/app/api/plans/pro/route.ts`)

1. **Entry points**: Forms on landing page and audience page
2. Ensures user record exists via `upsertUserRecord()`
3. Creates Stripe Checkout session with:
   - Price: `PRO_SUBSCRIPTION_PRICE_CENTS` (default 1200 = $12)
   - Metadata: `planType: 'pro'`, `userId`
   - Success URL: `/dashboard?plan=pro`
4. Redirects to Stripe Checkout

#### Webhook Activation

On `checkout.session.completed` with `planType === 'pro'`:
1. Calls `setUserPlan(userId, 'pro', subscriptionId)` which updates `users.plan` and `users.plan_subscription_id`

#### Hobby Downgrade (`src/app/api/plans/hobby/route.ts`)

1. Cancels existing Stripe subscription if `planSubscriptionId` exists
2. Calls `setUserPlan(user.id, 'hobby', null)` to downgrade
3. Redirects to `/dashboard`

---

## 6. Content System

### Post Creation (`src/app/api/posts/route.ts`, POST handler)

1. **Auth**: Requires `currentUser()`
2. **Validation**: Uses `createPostSchema` from Zod:
   - `title`: string, 1-500 chars, required
   - `content`: string, 1-500,000 chars, required
   - `vibe`: string, max 50, optional, default `"neutral"`
   - `status`: `"draft"` | `"published"`, optional, default `"draft"`
   - `isPaid`: boolean, optional, default `false`
   - `colorScheme`: nullable string, optional
3. **User upsert**: Creates/updates user record from Clerk data
4. **Plan enforcement**: Non-pro users get `vibe='neutral'` and `colorScheme=null`
5. **Rate limiting**: If publishing, checks `PUBLISH_RATE_LIMIT_HOURS` (default 24h). Queries for any published post within the time window. Returns 429 if exists.
6. **Slug generation**:
   - Base slug: `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
   - Appended with 6-char random string: `${baseSlug}-${random36}`
   - Retries up to 5 times on unique constraint violation (`error.code === '23505'`)
7. **Email notification**: If status is `'published'`, fires `sendPublishEmails()` as fire-and-forget

### Post Editing (PUT handler)

1. **Auth + ownership check**: Verifies `existingPost.authorId === user.id`
2. **Validation**: Uses `updatePostSchema` — all fields optional except `id`
3. **Draft->Published transition**: Only applies rate limit when transitioning from draft to published
4. **Preserves existing values**: Merges partial update with existing post data
5. **Email notification**: Only on draft->published transition

### Post Deletion (DELETE handler)

1. **Auth + ownership check**: Same as PUT
2. **Parameter**: `?id=<postId>` in query string
3. Hard deletes the post row

### Paywall Logic (`src/app/[handle]/[slug]/page.tsx`)

1. Post is fetched from DB matching `handle + slug + status='published'`
2. **Author can always read**: `user.id === author.id` -> `isSubscribed = true`
3. **Subscriber check**: Matches by `subscriber_user_id` OR `lower(email)` with `status='active'`
4. `showPaywall = post.isPaid && !isSubscribed`
5. If paywalled: shows only first 2 paragraphs / 350 words via `getMarkdownTeaser()`
6. If not paywalled: renders full HTML via `renderMarkdownToHtml()`

### Vibe Theming

Four vibe themes available (Pro only): `neutral`, `aggressive`, `melancholic`, `luxury`

On the post view page, a colored blur background is applied:
- `luxury` -> amber-500
- `aggressive` -> red-500
- `melancholic` -> blue-500
- default -> horizon (indigo)

### Color Schemes

Pro users can generate AI-powered color schemes stored as JSON string:
```json
{"background": "#050505", "text": "#e5e5e5", "primary": "#D4FF00"}
```
These colors are applied to:
- Email templates sent to subscribers
- Email preview modal in the editor
- Default fallback if no color scheme: `{background: '#050505', text: '#e5e5e5', primary: '#D4FF00'}`

---

## 7. AI Features

### Architecture

All AI features use:
- **Provider**: Google Gemini via `@ai-sdk/google` (model configurable via `GOOGLE_AI_MODEL`, default `gemini-2.5-flash`)
- **SDK**: Vercel AI SDK (`ai` package) for streaming (`streamText`) and structured output (`generateObject`)
- **Rate limiting**: Per-user daily call limits tracked in `ai_daily_usage` table

### 7A. Rewrite (`src/app/api/ai/rewrite/route.ts`)

- **Method**: POST
- **Auth**: Required
- **Input**: `{text: string, vibe?: string}` validated by `aiRewriteSchema`
- **Text limit**: Plan-dependent (hobby: 2000 chars, pro: 8000 chars)
- **Rate limit**: `consumeAiCall()` — atomic upsert with conditional increment
- **Prompt**: "Elite copywriter" persona, rewrites to match vibe tone
- **Response**: Streaming text via `result.toTextStreamResponse()` with usage headers
- **Headers**: `X-AI-Usage-Calls`, `X-AI-Usage-Limit`, `X-AI-Usage-Reset`

### 7B. Summarize (`src/app/api/ai/summarize/route.ts`)

- Same architecture as Rewrite
- **Prompt**: "Punchy, highly engaging TL;DR" in 1-2 sentences
- **Input**: `{text: string}` validated by `aiSummarizeSchema`

### 7C. Color Generation (`src/app/api/ai/colors/route.ts`)

- **Method**: POST
- **Auth**: Required + **Pro plan only**
- **Input** validated by `aiColorsSchema`:
  - `vibe`: required string (1-50)
  - `title`: optional string (max 500)
  - `content`: optional string
  - `variationSeed`: optional non-negative integer
  - `tone`: optional `"neutral"` | `"warm"` | `"cool"`
  - `contrast`: optional `"low"` | `"medium"` | `"high"`
  - `saturation`: optional `"muted"` | `"balanced"` | `"vivid"`
- **Markdown stripping**: Removes code blocks, images, links, headers, lists, emphasis
- **Context**: First 500 chars of cleaned content sent as context
- **AI call**: Uses `generateObject()` with Zod schema for structured JSON output
- **Temperature**: 0.9 with topP 0.95 for creative variation
- **Response**: JSON `{background: string, text: string, primary: string}`

### 7D. Usage Query (`src/app/api/ai/usage/route.ts`)

- **Method**: GET
- **Auth**: Required
- **Response**: `{calls: number, limit: number, resetAt: string}` (ISO timestamp of next UTC midnight)

### Usage Tracking (`src/lib/ai-usage.ts`)

**`consumeAiCall()`**:
- Atomic SQL: `INSERT ... ON CONFLICT DO UPDATE SET calls = calls + 1 WHERE calls < limit RETURNING calls`
- If the WHERE clause fails (already at limit), no row is returned -> `allowed: false`
- Uses UTC date key (`YYYY-MM-DD`) for daily bucketing
- Reset time: next UTC midnight

**`getAiUsage()`**:
- Simple SELECT for current day's usage
- Returns 0 calls if no row exists

### Client-Side Usage Display (`src/components/VibeEditor.tsx`)

- On mount: fetches `/api/ai/usage`
- After each AI call: reads usage from response headers via `applyUsageFromHeaders()`
- Displays progress bar with percentage
- Disables AI buttons when at limit
- On 429 response: shows toast with reset time

---

## 8. Email System

### Integration
- **Provider**: Resend (`resend` npm package)
- **API Key**: `RESEND_API_KEY` environment variable
- **Instance**: Created at module level in `src/app/api/posts/route.ts`

### Publish Email Flow (`src/app/api/posts/route.ts`, `sendPublishEmails()`)

1. **Trigger**: Called when a post transitions to `'published'` status
2. **Fire-and-forget**: Wrapped in `.catch()` so email failures don't block the publish response
3. **Recipient query**: Selects all subscribers where `authorId` matches and `status !== 'unsubscribed'`
4. **Guard**: Skips if no subscribers or no `RESEND_API_KEY`
5. **Template**:
   - From: `VibeStack <onboarding@resend.dev>`
   - Subject: `{title} - A new post from {handle}`
   - HTML: Inline-styled div with color scheme, rendered Markdown content, unsubscribe link
6. **Batching**: Resend batch API supports max 100 emails per call. Emails are chunked into batches of 100.

### Unsubscribe Token
- Generated automatically on subscriber creation as `gen_random_uuid()` in the DB
- Column: `subscribers.unsubscribe_token` (UUID, NOT NULL, random default)
- Used in email footers and dashboard sidebar links

---

## 9. Image Upload

### Endpoint: `src/app/api/upload/route.ts`

- **Method**: POST
- **Auth**: Required
- **Storage**: Vercel Blob (`@vercel/blob`)
- **Configuration**: `BLOB_READ_WRITE_TOKEN` env var, remote patterns in `next.config.ts`

### Validation

| Check | Constraint | HTTP Status |
|---|---|---|
| Missing filename | Required query param | 400 |
| Missing Content-Length | Required header | 411 |
| File too large | Max 5MB (`5 * 1024 * 1024`) | 413 |
| Bad MIME type | Only `image/png`, `image/jpeg`, `image/webp`, `image/gif` | 415 |
| Bad extension | Only `png`, `jpg`, `jpeg`, `webp`, `gif` | 415 |

### File Path Construction
1. Filename sanitized: `filename.replace(/[^a-zA-Z0-9._-]/g, "_")`
2. Extension extracted and validated against allowlist
3. Final path: `uploads/{userId}/{timestamp}-{randomUUID}.{extension}`

### Upload
- Access: `public`
- Content-Type: from request
- Cache: 1 year (`cacheControlMaxAge: 60 * 60 * 24 * 365`)

### Client-Side Integration (`src/components/VibeEditor.tsx`)
1. File input accepts `image/*`
2. Client-side validation: same MIME type set + 5MB limit
3. Uploads via `fetch('/api/upload?filename=...')` with file as body
4. On success: appends Markdown image syntax `![filename](url)` to content

---

## 10. Frontend Components

### Server Components

| Component | File | Description |
|---|---|---|
| `RootLayout` | `src/app/layout.tsx` | Wraps app in `ClerkProvider`, loads 4 Google fonts, sets dark theme class |
| `Home` | `src/app/page.tsx` | Marketing landing page with hero, features section, pricing cards |
| `FeedPage` | `src/app/feed/page.tsx` | Paginated public feed. Joins posts + users, renders Markdown preview. Revalidates every 60s |
| `DashboardLayout` | `src/app/dashboard/layout.tsx` | Sidebar with navigation, plan badge, subscriptions list, UserButton, sign-out |
| `Dashboard` | `src/app/dashboard/page.tsx` | Bento grid with stats, latest post, paginated post list |
| `WritePage` | `src/app/dashboard/write/page.tsx` | Loads existing post if `?id=` param present, passes to VibeEditor with plan info |
| `AudiencePage` | `src/app/dashboard/audience/page.tsx` | Stats grid, plan upgrade button, serializes subscribers for client table |
| `AuthorProfile` | `src/app/[handle]/page.tsx` | Public author page with subscribe button. Handles post-checkout session sync |
| `PostPage` | `src/app/[handle]/[slug]/page.tsx` | Individual post with paywall logic. Renders full or teaser HTML |
| `SignInPage` | `src/app/sign-in/[[...sign-in]]/page.tsx` | Wraps Clerk `<SignIn>` with redirect support |
| `SignUpPage` | `src/app/sign-up/[[...sign-up]]/page.tsx` | Wraps Clerk `<SignUp>` with redirect support |

### Client Components (`"use client"`)

| Component | File | Description |
|---|---|---|
| `VibeEditor` | `src/components/VibeEditor.tsx` | Full post editor. Title, Markdown textarea, image upload, save/publish/preview. Right sidebar: monetization toggle, Vibe Engine (Pro), AI Copilot, usage meter, word count. Email preview modal |
| `Toast` / `ToastProvider` / `useToast` | `src/components/Toast.tsx` | Context-based toast notification system. Types: success/error/warning/info. Auto-dismiss after 4s |
| `AudienceTable` | `src/components/AudienceTable.tsx` | Search + filter subscriber list. CSV export button (client-side Blob generation). Status badges |
| `SmokeRings` | `src/components/SmokeRings.tsx` | Animated hero decoration. Three Framer Motion rings with morphing border-radius. Respects `prefers-reduced-motion` |
| `MobileSidebar` | `src/components/MobileSidebar.tsx` | Mobile nav drawer. Uses `createPortal` for overlay. Escape key closes, body scroll locked |
| `HomeSignOutButton` | `src/components/HomeSignOutButton.tsx` | Clerk `<SignOutButton>` styled for landing page |
| `DashboardSignOutButton` | `src/components/DashboardSignOutButton.tsx` | Clerk `<SignOutButton>` styled for sidebar |
| `DeletePostButton` | `src/components/DeletePostButton.tsx` | Post delete with confirmation dialog |

---

## 11. API Routes

### `POST /api/posts` — Create Post
- **Auth**: Required
- **Body**: JSON `{title, content, vibe?, status?, isPaid?, colorScheme?}`
- **Validation**: `createPostSchema` (Zod)
- **Rate limit**: 1 publish per `PUBLISH_RATE_LIMIT_HOURS` (default 24h)
- **Response**: 200 JSON of created post, or 400/401/429/500

### `PUT /api/posts` — Update Post
- **Auth**: Required + ownership
- **Body**: JSON `{id, title?, content?, vibe?, status?, isPaid?, colorScheme?}`
- **Validation**: `updatePostSchema` (Zod)
- **Rate limit**: Only on draft->published transition
- **Response**: 200 JSON of updated post, or 400/401/404/429/500

### `DELETE /api/posts?id=<int>` — Delete Post
- **Auth**: Required + ownership
- **Parameters**: `id` query param (integer)
- **Response**: 200 "Deleted successfully", or 400/401/404/500

### `GET /api/checkout?authorId=<string>` — Author Subscribe (GET)
- **Auth**: Redirects to sign-in if unauthenticated
- **Parameters**: `authorId` query param
- **Response**: 303 redirect to Stripe Checkout, or 400/403/500

### `POST /api/checkout` — Author Subscribe (POST)
- **Auth**: Redirects to sign-in if unauthenticated
- **Body**: Form data with `authorId`
- **CSRF**: Origin/Referer validation
- **Response**: 303 redirect to Stripe Checkout, or 400/403/500

### `POST /api/webhooks/stripe` — Stripe Webhook
- **Auth**: Stripe signature verification (`STRIPE_WEBHOOK_SECRET`)
- **Events handled**:
  - `checkout.session.completed` — Activate subscription (author or pro)
  - `customer.subscription.deleted` — Mark unsubscribed + downgrade pro
  - `invoice.payment_failed` — Mark `past_due`
- **Response**: Always 200 (even on handler errors, to prevent Stripe retries)

### `GET /api/unsubscribe?token=<uuid>` — Unsubscribe
- **Auth**: None (public, token-based)
- **Parameters**: `token` query param (UUID format validated)
- **Actions**: Cancel Stripe subscription + mark `unsubscribed`
- **Response**: HTML confirmation page

### `POST /api/plans/pro` and `GET /api/plans/pro` — Pro Upgrade
- **Auth**: Redirects to sign-in if unauthenticated
- **Response**: 303 redirect to Stripe Checkout for Pro ($12/mo)

### `POST /api/plans/hobby` and `GET /api/plans/hobby` — Hobby Downgrade
- **Auth**: Redirects to sign-in if unauthenticated
- **Actions**: Cancel Stripe Pro subscription + set plan to `hobby`
- **Response**: 303 redirect to `/dashboard`

### `POST /api/upload?filename=<string>` — Image Upload
- **Auth**: Required
- **Body**: Raw file stream
- **Parameters**: `filename` query param
- **Validation**: MIME type, extension, 5MB limit, Content-Length header
- **Response**: 200 JSON `{url, ...blob metadata}`, or 400/401/411/413/415/500

### `POST /api/ai/rewrite` — AI Rewrite
- **Auth**: Required
- **Body**: JSON `{text, vibe?}`
- **Validation**: `aiRewriteSchema` + plan-based text limit
- **Rate limit**: Daily AI call limit
- **Response**: Streaming text with usage headers, or 400/401/429/500

### `POST /api/ai/summarize` — AI Summarize
- **Auth**: Required
- **Body**: JSON `{text}`
- **Validation**: `aiSummarizeSchema` + plan-based text limit
- **Rate limit**: Daily AI call limit
- **Response**: Streaming text with usage headers, or 400/401/429/500

### `POST /api/ai/colors` — AI Color Scheme
- **Auth**: Required + **Pro plan only**
- **Body**: JSON `{vibe, title?, content?, variationSeed?, tone?, contrast?, saturation?}`
- **Validation**: `aiColorsSchema`
- **Rate limit**: Daily AI call limit
- **Response**: JSON `{background, text, primary}`, or 400/401/403/429/500

### `GET /api/ai/usage` — AI Usage
- **Auth**: Required
- **Response**: JSON `{calls, limit, resetAt}`

---

## 12. Plan Limits

### Configuration (`src/lib/plan-limits.ts`)

```typescript
PLAN_CONFIG = {
  hobby: { subscribers: 500,   aiTextLimit: 2000, aiDailyCallLimit: 15  },
  pro:   { subscribers: 10000, aiTextLimit: 8000, aiDailyCallLimit: 100 },
};
```

### Feature Matrix

| Feature | Hobby (Free) | Pro ($12/mo) |
|---|---|---|
| Max subscribers | 500 | 10,000 |
| AI text input limit | 2,000 chars | 8,000 chars |
| AI daily call limit | 15 calls/day | 100 calls/day |
| Vibe themes | Forced `neutral` | All 4 themes |
| Color scheme generation | Blocked (403) | Available |
| Color scheme on posts | Stripped to `null` | Stored/applied |
| Post creation | Unlimited | Unlimited |
| Publish rate limit | 1 per 24h (configurable) | Same |
| Image uploads | Available | Available |
| Paid posts (paywall) | Available | Available |

### Enforcement Points

- **Subscriber limit**: `src/app/api/checkout/route.ts` — `isHobbyLimitReached()` blocks new subscriptions
- **AI text limit**: `src/app/api/ai/rewrite/route.ts`, `src/app/api/ai/summarize/route.ts`
- **AI daily limit**: `src/lib/ai-usage.ts` — atomic DB check in `consumeAiCall()`
- **Colors Pro-only**: `src/app/api/ai/colors/route.ts`
- **Vibe/color stripping**: `src/app/api/posts/route.ts`
- **Client-side gating**: `src/components/VibeEditor.tsx`

---

## 13. Security Measures

### Authentication
- **Clerk proxy middleware** (`src/proxy.ts`): All non-public routes require authentication
- **API auth**: Every mutating API checks `currentUser()` and returns 401 if null
- **Ownership verification**: Post PUT/DELETE verify `existingPost.authorId === user.id`

### CSRF Protection
- **Origin/Referer validation**: `src/app/api/checkout/route.ts` — `isValidOrigin()` compares request origin/referer against `NEXT_PUBLIC_APP_URL`
- Applied to the checkout POST handler

### Input Validation
- **Zod schemas** (`src/lib/validations.ts`):
  - Content limited to 500KB (`MAX_CONTENT_LENGTH = 500_000`)
  - Title limited to 500 chars
  - Vibe limited to 50 chars
  - AI text input limited by plan (2000/8000 chars)
  - `aiColorsSchema` validates enum fields for tone/contrast/saturation
  - Post ID coerced to positive integer
- **UUID validation**: Unsubscribe token validated via regex
- **Upload validation**: MIME type, file extension, Content-Length, 5MB limit

### XSS Prevention
- **HTML sanitization**: `sanitize-html` applied to all Markdown output (`src/lib/markdown.ts`):
  - Allowed tags: standard + img, h1-h3, pre, code, blockquote, hr
  - Allowed attributes: limited set (img: src/alt/title/width/height, a: href/name/target/rel)
  - Allowed schemes: only `http` and `https`
  - Links forced to `rel="noopener noreferrer" target="_blank"`
  - HTML input disabled in markdown-it: `html: false`

### Stripe Webhook Verification
- Signature verification: `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- Returns 400 on signature failure

### File Upload Security
- Filename sanitization: removes all non-alphanumeric characters except `._-`
- Namespaced by user ID: `uploads/{userId}/...` prevents path traversal
- Content-Type validation against MIME allowlist
- Extension validation against separate allowlist

### Rate Limiting
- **Publish rate limit**: Configurable via `PUBLISH_RATE_LIMIT_HOURS` env var (default 24h)
- **AI daily call limit**: Enforced atomically in DB via upsert with conditional WHERE clause

### Environment Variables
- `.env.local` excluded from Git (`.gitignore`)
- `.env.example` committed with placeholder values
- Build-phase guard in `src/db/index.ts`: doesn't crash during `next build` if DATABASE_URL is missing
- Stripe SDK uses lazy initialization via Proxy object: prevents module-level crash if STRIPE_SECRET_KEY is unset

---

## 14. Key Files Reference

| File Path | Purpose |
|---|---|
| **Config** | |
| `package.json` | Dependencies, scripts (dev/build/start/lint/typecheck/test) |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `next.config.ts` | Next.js config — Vercel Blob image remote patterns |
| `drizzle.config.ts` | Drizzle Kit config — schema path, output dir, DB credentials |
| `vitest.config.ts` | Vitest config — node environment, path aliases |
| `eslint.config.mjs` | ESLint flat config with next/core-web-vitals + typescript |
| `postcss.config.mjs` | PostCSS config with Tailwind v4 plugin |
| `.env.example` | All required environment variables with placeholder values |
| `.gitignore` | Standard Next.js ignores + env files + build artifacts |
| **Database** | |
| `src/db/schema.ts` | Drizzle ORM schema: users, posts, subscribers, ai_daily_usage |
| `src/db/index.ts` | DB connection: Neon serverless HTTP + Drizzle |
| `drizzle/0000_fluffy_butterfly.sql` | Migration: initial tables |
| `drizzle/0001_add_ai_daily_usage.sql` | Migration: ai_daily_usage table |
| `drizzle/0002_add_subscriber_user_id.sql` | Migration: subscriber_user_id column + index |
| `drizzle/0003_fat_leo.sql` | Migration: performance indexes + unique constraint |
| `drizzle/0004_unusual_vampiro.sql` | Migration: per-author slug uniqueness |
| **Middleware** | |
| `src/proxy.ts` | Clerk proxy middleware — public/protected route definitions |
| **Library** | |
| `src/lib/stripe.ts` | Lazy Stripe SDK initialization via Proxy |
| `src/lib/user-plans.ts` | User plan helpers: upsertUserRecord, getUserPlan, setUserPlan |
| `src/lib/plan-limits.ts` | Plan config: subscriber limits, AI text/call limits |
| `src/lib/ai-usage.ts` | AI usage tracking: getAiUsage, consumeAiCall (atomic upsert) |
| `src/lib/validations.ts` | Zod schemas: createPost, updatePost, aiRewrite, aiSummarize, aiColors |
| `src/lib/markdown.ts` | Markdown rendering + sanitization |
| `src/lib/markdown.test.ts` | Tests for markdown utilities |
| `src/lib/ai-limits.test.ts` | Test: pro limits > hobby limits |
| **Pages** | |
| `src/app/layout.tsx` | Root layout: ClerkProvider, fonts, dark HTML |
| `src/app/globals.css` | Tailwind theme, glassmorphism, typography, smoke animation |
| `src/app/page.tsx` | Landing page: hero, features, pricing, footer |
| `src/app/feed/page.tsx` | Public feed: paginated published posts with author info |
| `src/app/dashboard/layout.tsx` | Dashboard shell: sidebar, nav, plan badge, subscription list |
| `src/app/dashboard/page.tsx` | Dashboard home: bento stats, post list with pagination |
| `src/app/dashboard/write/page.tsx` | Write page: loads post, renders VibeEditor |
| `src/app/dashboard/audience/page.tsx` | Audience page: stats grid, AudienceTable |
| `src/app/[handle]/page.tsx` | Author profile: subscribe, post-checkout sync, post list |
| `src/app/[handle]/[slug]/page.tsx` | Post view: paywall, teaser, full content, vibe background |
| **Components** | |
| `src/components/VibeEditor.tsx` | Full post editor (client): AI tools, color gen, preview, upload |
| `src/components/Toast.tsx` | Toast notification system (client): context + auto-dismiss |
| `src/components/AudienceTable.tsx` | Subscriber table (client): search, CSV export |
| `src/components/SmokeRings.tsx` | Animated hero decoration (client): Framer Motion |
| `src/components/MobileSidebar.tsx` | Mobile nav drawer (client): portal, escape key, scroll lock |
| `src/components/HomeSignOutButton.tsx` | Landing sign-out button (client) |
| `src/components/DashboardSignOutButton.tsx` | Sidebar sign-out button (client) |
| `src/components/DeletePostButton.tsx` | Post delete with confirmation (client) |
| **API Routes** | |
| `src/app/api/posts/route.ts` | CRUD for posts + publish email delivery |
| `src/app/api/checkout/route.ts` | Author subscription Stripe Checkout (GET/POST) |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/unsubscribe/route.ts` | Token-based unsubscribe (cancels Stripe + marks DB) |
| `src/app/api/plans/hobby/route.ts` | Downgrade to hobby (cancels Stripe Pro sub) |
| `src/app/api/plans/pro/route.ts` | Pro upgrade Stripe Checkout |
| `src/app/api/upload/route.ts` | Image upload to Vercel Blob |
| `src/app/api/ai/rewrite/route.ts` | AI rewrite (streaming, Gemini) |
| `src/app/api/ai/summarize/route.ts` | AI summarize (streaming, Gemini) |
| `src/app/api/ai/colors/route.ts` | AI color scheme generation (Pro only) |
| `src/app/api/ai/usage/route.ts` | Query current AI usage stats |

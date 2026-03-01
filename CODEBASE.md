# VibeStack - Comprehensive Technical Codebase Documentation

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Authentication and Authorization](#4-authentication-and-authorization)
5. [Subscription System](#5-subscription-system)
6. [Content System](#6-content-system)
7. [AI Features](#7-ai-features)
8. [Email System](#8-email-system)
9. [Image Upload System](#9-image-upload-system)
10. [Frontend Architecture](#10-frontend-architecture)
11. [API Route Reference](#11-api-route-reference)
12. [Plan Limits and Enforcement](#12-plan-limits-and-enforcement)
13. [Security Model](#13-security-model)
14. [Configuration and Environment Variables](#14-configuration-and-environment-variables)
15. [Comprehensive File Reference](#15-comprehensive-file-reference)
16. [Intentionally Excluded Areas](#16-intentionally-excluded-areas)
17. [Maintenance Checklist](#17-maintenance-checklist)

---

## 1. Architecture Overview

### Framework and Runtime Model
VibeStack is built with Next.js 16 App Router and React 19, using TypeScript in strict mode. The app mixes:
- server components for data-heavy pages,
- client components for interaction-heavy surfaces,
- route handlers for HTTP APIs.

Authentication is handled by Clerk in proxy mode via `src/proxy.ts`. This file, not `src/middleware.ts`, controls public vs protected route behavior.

### Route Hierarchy

```text
src/app/
|- layout.tsx                          Root shell (ClerkProvider + fonts)
|- globals.css                         Tailwind v4 theme + global styles
|- page.tsx                            Landing page
|- feed/
|  |- page.tsx                         Public feed (published posts)
|  |- loading.tsx                      Feed loading skeleton
|  `- error.tsx                        Feed error boundary
|- dashboard/
|  |- layout.tsx                       Auth shell and sidebar
|  |- page.tsx                         Dashboard home
|  |- write/page.tsx                   Create/edit post screen
|  |- audience/page.tsx                Subscriber audience screen
|  |- loading.tsx                      Dashboard loading skeleton
|  `- error.tsx                        Dashboard error boundary
|- [handle]/
|  |- page.tsx                         Public author profile
|  `- [slug]/page.tsx                  Public post page
|- sign-in/[[...sign-in]]/page.tsx    Clerk sign-in wrapper
|- sign-up/[[...sign-up]]/page.tsx    Clerk sign-up wrapper
`- api/
   |- posts/route.ts                   Create/update/delete posts
   |- checkout/route.ts                Reader -> author checkout
   |- upload/route.ts                  Image upload
   |- unsubscribe/route.ts             Confirm + execute unsubscribe
   |- webhooks/stripe/route.ts         Stripe webhook handler
   |- plans/
   |  |- pro/route.ts                  Author Pro checkout
   |  `- hobby/route.ts                Downgrade to hobby
   `- ai/
      |- rewrite/route.ts              AI rewrite stream
      |- summarize/route.ts            AI summarize stream
      |- colors/route.ts               AI palette generation
      `- usage/route.ts                AI usage query
```

### End-to-End Data Flow
1. **Auth and routing**: Clerk proxy determines if route is public or protected.
2. **User record sync**: APIs that need local user state call `upsertUserRecord()`.
3. **Content pipeline**: Editor writes markdown -> DB stores raw markdown -> viewer renders sanitized HTML.
4. **Billing pipeline**: Stripe checkout creates subscriptions -> webhook reconciles state.
5. **Email pipeline**: publish events trigger async Resend sends to non-unsubscribed subscribers.
6. **AI pipeline**: AI endpoints validate input, enforce plan limits, consume daily usage, and return streaming/JSON responses.

---

## 2. Tech Stack

| Technology | Version | Purpose | Where it matters |
|---|---|---|---|
| Next.js | 16.1.6 | App framework, App Router, route handlers | `src/app/**`, `next.config.ts` |
| React / React DOM | 19.2.3 | UI layer | Components and pages |
| TypeScript | ^5 | Static typing | Entire repo |
| Tailwind CSS | ^4 | Styling system | `src/app/globals.css`, `postcss.config.mjs` |
| Clerk | ^6.38.1 | Auth and protection | `src/proxy.ts`, layout/auth pages |
| Drizzle ORM | ^0.45.1 | ORM and SQL builder | `src/db/schema.ts`, route handlers |
| Neon Serverless | ^1.0.2 | Postgres HTTP driver | `src/db/index.ts` |
| Stripe | ^20.3.1 | Checkout and webhooks | Billing routes + `src/lib/stripe.ts` |
| Resend | ^6.9.2 | Email delivery | `src/app/api/posts/route.ts` |
| ai SDK | ^6.0.97 | Streaming/object AI responses | `src/app/api/ai/**` |
| @ai-sdk/google | ^3.0.30 | Gemini provider integration | `src/app/api/ai/**` |
| Vercel Blob | ^2.3.0 | Image storage | `src/app/api/upload/route.ts` |
| Zod | ^4.3.6 | Input validation | `src/lib/validations.ts` |
| markdown-it | ^14.1.0 | Markdown to HTML | `src/lib/markdown.ts` |
| sanitize-html | ^2.17.1 | XSS mitigation | `src/lib/markdown.ts` |
| Framer Motion | ^12.34.3 | Visual motion effects | `src/components/SmokeRings.tsx`, `src/components/ArticleVibeBackground.tsx` |
| Vitest | ^3.2.4 | Unit tests | `src/lib/*.test.ts`, `vitest.config.ts` |

---

## 3. Database Schema

**Schema source**: `src/db/schema.ts`  
**DB initialization**: `src/db/index.ts`

### Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `text` | Primary key | Clerk user id |
| `handle` | `varchar(255)` | Unique, not null | Public profile handle |
| `email` | `varchar(255)` | Unique, not null | Primary contact and identity matching |
| `bio` | `text` | Nullable | Optional author text |
| `plan` | `varchar(50)` | Not null, default `hobby` | `hobby` or `pro` |
| `plan_subscription_id` | `varchar(255)` | Nullable | Stripe sub id for Pro |
| `created_at` | `timestamp` | Not null, default now | Audit timestamp |

### Table: `posts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | Primary key | Post id |
| `author_id` | `text` | Not null, FK -> `users.id` | Ownership |
| `title` | `text` | Not null | Post title |
| `slug` | `varchar(255)` | Not null | URL segment |
| `content` | `text` | Nullable | Raw markdown body |
| `vibe_theme` | `varchar(50)` | Default `default` | Theme token |
| `color_scheme` | `text` | Nullable | JSON string with colors |
| `status` | `varchar(50)` | Default `draft` | `draft` or `published` |
| `is_paid` | `boolean` | Default `false` | Paywall toggle |
| `published_at` | `timestamp` | Nullable | Publish time |
| `created_at` | `timestamp` | Not null, default now | Create time |

Indexes and constraints:
- `posts_author_id_idx` on `author_id`.
- `posts_author_slug_uniq` unique on `(author_id, slug)`.

### Table: `subscribers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | Primary key | Subscriber row id |
| `author_id` | `text` | Not null, FK -> `users.id` | Target author |
| `subscriber_user_id` | `text` | Nullable | Clerk user id when subscriber is logged in |
| `email` | `varchar(255)` | Not null | Subscription email |
| `status` | `varchar(50)` | Default `pending` | `pending`, `active`, `past_due`, `unsubscribed` |
| `stripe_subscription_id` | `varchar(255)` | Nullable | Stripe subscription id |
| `unsubscribe_token` | `uuid` | Not null, default random | Token in unsubscribe links |
| `created_at` | `timestamp` | Not null, default now | Create time |

Indexes and constraints:
- `subscribers_author_email_uniq` unique on `(author_id, email)`.
- `subscribers_author_user_idx` on `(author_id, subscriber_user_id)`.
- `subscribers_email_idx` on `email`.
- `subscribers_stripe_sub_idx` on `stripe_subscription_id`.
- `subscribers_author_status_idx` on `(author_id, status)`.

### Table: `ai_daily_usage`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `serial` | Primary key | Row id |
| `user_id` | `text` | Not null, FK -> `users.id` | Owner |
| `usage_date` | `date` | Not null | UTC day key |
| `calls` | `integer` | Not null, default `0` | Calls count for day |
| `updated_at` | `timestamp` | Not null, default now | Last update |

Constraint:
- `ai_daily_usage_user_date_idx` unique on `(user_id, usage_date)`.

### Migration History (`drizzle/`)

| Migration | File | Purpose |
|---|---|---|
| 0000 | `0000_fluffy_butterfly.sql` | Initial users/posts/subscribers |
| 0001 | `0001_add_ai_daily_usage.sql` | Add AI usage table |
| 0002 | `0002_add_subscriber_user_id.sql` | Add subscriber user id and index |
| 0003 | `0003_fat_leo.sql` | Add performance indexes and subscriber uniqueness |
| 0004 | `0004_unusual_vampiro.sql` | Make slug uniqueness per author |

### Relationship Summary

```text
users (1) --< posts (many)
users (1) --< subscribers (many, as author)
users (1) --< ai_daily_usage (many)
```

---

## 4. Authentication and Authorization

### Clerk Integration
- `src/app/layout.tsx` wraps app with `ClerkProvider`.
- Sign-in/sign-up routes are App Router wrappers around Clerk components.

### Proxy Route Guard (`src/proxy.ts`)
Public routes:
- `/`
- `/sign-in(.*)`
- `/sign-up(.*)`
- `/feed`
- `/api/checkout`
- `/api/plans(.*)`
- `/api/unsubscribe`
- `/api/webhooks/stripe(.*)`

Public dynamic content rule:
- One or two URL segments are public unless first segment is reserved (`dashboard`, `api`, `sign-in`, `sign-up`, `feed`).

Everything else is protected with `auth.protect()`.

### Handler-Level Authorization
Protected route handlers call `currentUser()` and return 401 if missing:
- `POST/PUT/DELETE /api/posts`
- `POST /api/upload`
- `POST /api/ai/rewrite`
- `POST /api/ai/summarize`
- `POST /api/ai/colors`
- `GET /api/ai/usage`

Redirecting behavior for unauthenticated callers:
- `/api/checkout` and `/api/plans/*` redirect to `/sign-in` with `redirect_url` back to original endpoint.

---

## 5. Subscription System

VibeStack has two subscription domains:
- **Reader -> Author** subscription
- **Author -> VibeStack Pro** subscription

### 5A) Reader -> Author Subscription (`/api/checkout`)

Purpose:
- Reader pays monthly subscription to a specific author and unlocks paid content.

Session creation behavior:
1. Reads `authorId` (query for GET, form data for POST).
2. For POST, validates origin/referer host against `NEXT_PUBLIC_APP_URL`.
3. Checks hobby subscriber cap (500 non-unsubscribed subscribers).
4. Creates Stripe session with metadata:
   - `planType: author`
   - `authorId`
   - optional `authorHandle`
   - optional `subscriberUserId`
5. Redirects to Stripe Checkout.

Price:
- `AUTHOR_SUBSCRIPTION_PRICE_CENTS` (default `500` = $5/mo).

### Fast-path page sync (`src/app/[handle]/page.tsx`)
After Stripe success redirect with `session_id`, author page attempts immediate sync so UI reflects subscription quickly without waiting for webhook retries.

### Webhook durable sync (`src/app/api/webhooks/stripe/route.ts`)
On `checkout.session.completed` for non-pro sessions:
- upserts `subscribers` using unique `(author_id, email)`.

This is idempotent and race-safe because conflict target is stable and authoritative.

### Unsubscribe flow (`/api/unsubscribe`)
Important behavior:
- `GET` does not mutate state; it only renders confirmation page.
- `POST` performs mutation: optional Stripe cancel + DB status update.

This avoids accidental unsubscribe from scanners/prefetchers.

### 5B) Author -> VibeStack Pro (`/api/plans/pro`, `/api/plans/hobby`)

Upgrade flow:
1. Ensure authenticated user and local user row.
2. Create Stripe checkout metadata `planType=pro`, `userId`.
3. On webhook completion, set user plan to `pro` and store `plan_subscription_id`.

Downgrade flow:
1. Ensure user and local row.
2. Cancel existing plan subscription id if present.
3. Set plan to `hobby` and clear plan subscription id.

Price:
- `PRO_SUBSCRIPTION_PRICE_CENTS` (default `1200` = $12/mo).

---

## 6. Content System

### Validation and payload rules
Schemas in `src/lib/validations.ts` define post payloads:
- `title`: required, max 500 chars
- `content`: required on create, max 500,000 chars
- `vibe`: optional, max 50, default `default`
- `status`: `draft` or `published`
- `isPaid`: boolean
- `colorScheme`: nullable string

### Create post (`POST /api/posts`)
Processing sequence:
1. Authenticate user.
2. Parse and validate request body.
3. Upsert local user record.
4. Determine plan and enforce non-pro restrictions:
   - `vibeTheme` forced to `default`
   - `colorScheme` forced to `null`
5. If status is `published`, enforce cooldown using `PUBLISH_RATE_LIMIT_HOURS`.
6. Generate slug from title and append random suffix.
7. Retry insert up to 5 attempts on unique violation.
8. Fire-and-forget publish email dispatch when published.

### Update post (`PUT /api/posts`)
- Requires ownership.
- Applies cooldown only when moving draft -> published.
- Merges missing fields from existing row.
- Applies same plan gating logic.
- Sends publish emails on draft -> published transition.

### Delete post (`DELETE /api/posts`)
- Requires ownership.
- Requires numeric `id` query param.
- Hard deletes row.

### Read path (`src/app/[handle]/[slug]/page.tsx`)
- Fetches only published post for `handle + slug`.
- Grants full access for author.
- Grants full access to active subscribers by user id or normalized email.
- Paid non-subscriber path renders teaser via `getMarkdownTeaser()`.
- Full path renders sanitized HTML via `renderMarkdownToHtml()`.

### Markdown subsystem (`src/lib/markdown.ts`)
- `renderMarkdownToHtml()`: markdown-it render + sanitize-html clean pass.
- `getMarkdownTeaser()`: paragraph-first teaser with max-word clamp.
- `markdownToPlainText()`: sanitize to plain text for AI summarize preprocessing.

---

## 7. AI Features

### Provider architecture
- Uses `ai` SDK for `streamText()` and `generateObject()`.
- Uses Google provider from `@ai-sdk/google`.
- Model from `GOOGLE_AI_MODEL` with default `gemini-2.5-flash`.

### Plan limits
- Hobby: `aiTextLimit=2000`, `aiDailyCallLimit=15`.
- Pro: `aiTextLimit=8000`, `aiDailyCallLimit=100`.

### Usage tracking (`src/lib/ai-usage.ts`)
- Day key is UTC date string (`YYYY-MM-DD`).
- `consumeAiCall()` performs atomic `insert ... on conflict ... where calls < limit`.
- Returns `allowed`, `calls`, `limit`, `resetAt` (next UTC midnight).

### Endpoints

#### `POST /api/ai/rewrite`
- Auth required.
- Validates `{ text, vibe? }`.
- Enforces plan-based text limit.
- Consumes AI call.
- Streams rewritten markdown.
- Adds usage headers:
  - `X-AI-Usage-Calls`
  - `X-AI-Usage-Limit`
  - `X-AI-Usage-Reset`

#### `POST /api/ai/summarize`
- Auth required.
- Validates `{ text }`.
- Converts markdown to plain text before limits/prompting.
- Rejects empty normalized text.
- Consumes AI call.
- Streams concise summary.

#### `POST /api/ai/colors`
- Auth required and Pro-only.
- Validates structured input with optional style controls.
- Consumes AI call.
- Uses `generateObject()` to produce `{ background, text, primary }`.
- Returns JSON with usage headers.

#### `GET /api/ai/usage`
- Auth required.
- Returns current usage object `{ calls, limit, resetAt }`.

### Client integration in editor
`src/components/VibeEditor.tsx`:
- fetches usage on load,
- updates usage from response headers after AI calls,
- disables actions and shows toast when limits are reached.

---

## 8. Email System

### Integration details
- Provider: Resend (`RESEND_API_KEY`).
- Sender address in code: `VibeStack <hello@mail.eoschaos.it>`.
- Implementation lives in `src/app/api/posts/route.ts`.

### Send trigger and behavior
- Triggered when post is published (create or draft -> published update).
- Non-blocking dispatch: errors are logged and do not fail content request.

### Recipient selection
- Selects rows from `subscribers` where:
  - `author_id` matches,
  - `status != unsubscribed`.

### Email body details
- Uses rendered markdown HTML.
- Applies color scheme (or defaults).
- Embeds unsubscribe URL with token.

### Batching strategy
- Resend batch API limit handled by chunking sends in groups of 100.

---

## 9. Image Upload System

Route: `POST /api/upload?filename=...`

### Validation gates
- Requires authenticated user.
- Requires `filename` query param.
- Requires `content-length` header.
- Max upload size: 5 MB.
- MIME allowlist:
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `image/gif`
- Extension allowlist:
  - `png`, `jpg`, `jpeg`, `webp`, `gif`

### Storage format
- Filename is sanitized.
- Final key format: `uploads/{userId}/{timestamp}-{uuid}.{ext}`.
- Uploads to Vercel Blob with public access and long cache TTL.

### Client behavior
`src/components/VibeEditor.tsx` uploads selected image and appends markdown image syntax to content.

---

## 10. Frontend Architecture

### Server components

| Component/Page | File | Responsibility |
|---|---|---|
| Root layout | `src/app/layout.tsx` | Global providers, metadata, typography |
| Landing page | `src/app/page.tsx` | Product messaging and plan actions |
| Feed page | `src/app/feed/page.tsx` | Public index of published posts |
| Dashboard layout | `src/app/dashboard/layout.tsx` | Auth shell, navigation, user panel |
| Dashboard home | `src/app/dashboard/page.tsx` | Author metrics and post summary |
| Write page | `src/app/dashboard/write/page.tsx` | Compose/edit orchestration for editor |
| Audience page | `src/app/dashboard/audience/page.tsx` | Subscriber stats and controls |
| Author page | `src/app/[handle]/page.tsx` | Public author profile + subscribe CTA |
| Post page | `src/app/[handle]/[slug]/page.tsx` | Paywall decision + post rendering |

### Client components

| Component | File | Responsibility |
|---|---|---|
| VibeEditor | `src/components/VibeEditor.tsx` | Writing UX, AI actions, uploads, publish controls |
| Toast system | `src/components/Toast.tsx` | App notifications |
| AudienceTable | `src/components/AudienceTable.tsx` | Search/filter/export subscribers |
| MobileSidebar | `src/components/MobileSidebar.tsx` | Mobile dashboard navigation drawer |
| SmokeRings | `src/components/SmokeRings.tsx` | Landing decorative animation |
| ArticleVibeBackground | `src/components/ArticleVibeBackground.tsx` | Post page animated vibe background |
| DeletePostButton | `src/components/DeletePostButton.tsx` | Post delete UX action |
| HomeSignOutButton | `src/components/HomeSignOutButton.tsx` | Sign-out on landing context |
| DashboardSignOutButton | `src/components/DashboardSignOutButton.tsx` | Sign-out in dashboard shell |

### Error and loading boundaries
- Feed and dashboard both define dedicated `loading.tsx` and `error.tsx` routes for UX continuity.

---

## 11. API Route Reference

### Posts

#### `POST /api/posts`
- Auth: required
- Body: `title`, `content`, optional `vibe`, `status`, `isPaid`, `colorScheme`
- Notable behavior: plan gating, publish cooldown, async emails
- Returns: `200`, `400`, `401`, `429`, `500`

#### `PUT /api/posts`
- Auth: required + ownership
- Body: `id` + partial patch fields
- Notable behavior: cooldown only on draft -> published
- Returns: `200`, `400`, `401`, `404`, `429`, `500`

#### `DELETE /api/posts?id=<int>`
- Auth: required + ownership
- Returns: `200`, `400`, `401`, `404`, `500`

### Billing and plans

#### `GET /api/checkout?authorId=<id>`
- Auth: redirects unauthenticated users
- Returns: `303`, `400`, `403`, `500`

#### `POST /api/checkout`
- Auth: redirects unauthenticated users
- Body: form data with `authorId`
- CSRF-adjacent protection: origin/referer host validation
- Returns: `303`, `400`, `403`, `500`

#### `GET|POST /api/plans/pro`
- Auth: redirects unauthenticated users
- Returns: `303`, `500`

#### `GET|POST /api/plans/hobby`
- Auth: redirects unauthenticated users
- Returns: `303`, `500`

#### `POST /api/webhooks/stripe`
- Auth: Stripe signature verification
- Events:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Returns: `400` on signature failure, `200` otherwise

### Unsubscribe

#### `GET /api/unsubscribe?token=<uuid>`
- Public token endpoint
- Behavior: confirmation page only

#### `POST /api/unsubscribe?token=<uuid>`
- Public token endpoint
- Behavior: perform unsubscribe

### Upload

#### `POST /api/upload?filename=<name>`
- Auth: required
- Body: raw file stream
- Returns: `200`, `400`, `401`, `411`, `413`, `415`, `500`

### AI

#### `POST /api/ai/rewrite`
- Auth: required
- Returns stream with usage headers

#### `POST /api/ai/summarize`
- Auth: required
- Returns stream with usage headers

#### `POST /api/ai/colors`
- Auth: required + Pro
- Returns JSON palette + usage headers

#### `GET /api/ai/usage`
- Auth: required
- Returns current usage summary

---

## 12. Plan Limits and Enforcement

### Config (`src/lib/plan-limits.ts`)

```ts
PLAN_CONFIG = {
  hobby: { subscribers: 500,   aiTextLimit: 2000, aiDailyCallLimit: 15  },
  pro:   { subscribers: 10000, aiTextLimit: 8000, aiDailyCallLimit: 100 },
};
```

### Enforcement points
- Subscriber cap: `src/app/api/checkout/route.ts`
- AI text limit: `src/app/api/ai/rewrite/route.ts`, `src/app/api/ai/summarize/route.ts`
- AI daily calls: `src/lib/ai-usage.ts`
- Color generation Pro gate: `src/app/api/ai/colors/route.ts`
- Non-pro vibe/color coercion: `src/app/api/posts/route.ts`
- Client-side UX gating: `src/components/VibeEditor.tsx`

---

## 13. Security Model

### Authentication and access control
- Clerk proxy route protection + per-route `currentUser()` checks.
- Ownership checks on post mutations.

### Input validation
- Zod schemas for post and AI payloads.
- Upload MIME + extension + size + content-length checks.

### XSS defenses
- markdown-it configured with `html: false`.
- sanitize-html allowlist on rendered output.
- link transforms enforce `rel=noopener noreferrer` and `_blank` targets.

### Stripe integrity
- Webhook signatures verified with `STRIPE_WEBHOOK_SECRET`.

### CSRF reduction
- Checkout POST validates request origin/referer host against app URL host.

### Abuse controls
- Publish cooldown (`PUBLISH_RATE_LIMIT_HOURS`).
- AI per-day caps at database level.

### Runtime robustness
- DB build-phase guard in `src/db/index.ts` avoids hard fail during build without runtime DB URL.
- Lazy Stripe initialization in `src/lib/stripe.ts` avoids unrelated route crashes when Stripe key is missing.

---

## 14. Configuration and Environment Variables

Canonical template: `.env.example`

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk client key |
| `CLERK_SECRET_KEY` | Yes | Clerk server key |
| `DATABASE_URL` | Yes at runtime | Neon Postgres connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes for AI | Google provider API key |
| `GOOGLE_AI_MODEL` | Optional | AI model override, defaults to `gemini-2.5-flash` |
| `PUBLISH_RATE_LIMIT_HOURS` | Optional | Publish cooldown window, defaults to 24 |
| `RESEND_API_KEY` | Required for email sends | Resend API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes for client stripe usage | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Yes for billing APIs | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | Yes for webhook endpoint | Stripe signature verification key |
| `AUTHOR_SUBSCRIPTION_PRICE_CENTS` | Optional | Reader->author monthly amount |
| `PRO_SUBSCRIPTION_PRICE_CENTS` | Optional | Pro monthly amount |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical app URL used in redirects and checks |
| `BLOB_READ_WRITE_TOKEN` | Yes for uploads | Vercel Blob token |

---

## 15. Comprehensive File Reference

This section lists all relevant handwritten/source-of-truth files and what they do.

### Root files
- `.env.example` - Environment variable template and defaults.
- `.env.local` - Local runtime secrets (not a behavior spec file).
- `.gitignore` - Ignore rules for env, build output, dependencies, and editor artifacts.
- `README.md` - Developer-facing quickstart and overview.
- `CODEBASE.md` - In-repo technical reference.
- `package.json` - Scripts and dependency declarations.
- `package-lock.json` - Lockfile for deterministic install graph.
- `next.config.ts` - Next config, including allowed image remote patterns.
- `next-env.d.ts` - Next type references (generated, should not be manually edited).
- `tsconfig.json` - TypeScript project configuration.
- `tsconfig.tsbuildinfo` - TypeScript incremental build metadata cache.
- `eslint.config.mjs` - ESLint flat config for Next + TypeScript presets.
- `postcss.config.mjs` - Tailwind PostCSS plugin configuration.
- `vitest.config.ts` - Test runner config and alias mapping.
- `drizzle.config.ts` - Drizzle migration config.
- `test-db.mjs` - Manual script to verify DB connectivity.
- `drizzle.zip` - Archive artifact; not used by application runtime.

### App routes and pages (`src/app`)
- `src/app/layout.tsx` - Root app layout and providers.
- `src/app/globals.css` - Global styles and design system tokens.
- `src/app/page.tsx` - Landing page and pricing actions.
- `src/app/favicon.ico` - Browser icon.
- `src/app/feed/page.tsx` - Public feed list.
- `src/app/feed/loading.tsx` - Feed loading state UI.
- `src/app/feed/error.tsx` - Feed error boundary UI.
- `src/app/dashboard/layout.tsx` - Dashboard shell and navigation.
- `src/app/dashboard/page.tsx` - Dashboard overview and post summaries.
- `src/app/dashboard/write/page.tsx` - Write/edit page that hosts editor.
- `src/app/dashboard/audience/page.tsx` - Audience analytics and controls.
- `src/app/dashboard/loading.tsx` - Dashboard loading state UI.
- `src/app/dashboard/error.tsx` - Dashboard error boundary UI.
- `src/app/[handle]/page.tsx` - Public author profile and subscription entry point.
- `src/app/[handle]/[slug]/page.tsx` - Public post viewer with paywall logic.
- `src/app/sign-in/[[...sign-in]]/page.tsx` - Sign-in route wrapper.
- `src/app/sign-up/[[...sign-up]]/page.tsx` - Sign-up route wrapper.

### API route handlers (`src/app/api`)
- `src/app/api/posts/route.ts` - Post CRUD + publish email dispatch.
- `src/app/api/checkout/route.ts` - Reader subscription checkout.
- `src/app/api/upload/route.ts` - Image upload validation/storage.
- `src/app/api/unsubscribe/route.ts` - Token confirmation + unsubscribe mutation.
- `src/app/api/webhooks/stripe/route.ts` - Stripe event processing.
- `src/app/api/plans/pro/route.ts` - Pro upgrade checkout.
- `src/app/api/plans/hobby/route.ts` - Hobby downgrade and pro cancellation.
- `src/app/api/ai/rewrite/route.ts` - AI rewrite endpoint.
- `src/app/api/ai/summarize/route.ts` - AI summarize endpoint.
- `src/app/api/ai/colors/route.ts` - AI color generation endpoint.
- `src/app/api/ai/usage/route.ts` - AI usage endpoint.

### Components (`src/components`)
- `src/components/VibeEditor.tsx` - Main editor workflow UI.
- `src/components/Toast.tsx` - Toast provider and rendering.
- `src/components/AudienceTable.tsx` - Audience table interactivity.
- `src/components/MobileSidebar.tsx` - Mobile nav drawer.
- `src/components/SmokeRings.tsx` - Hero decorative animation.
- `src/components/ArticleVibeBackground.tsx` - Post vibe background effects.
- `src/components/DeletePostButton.tsx` - Post deletion interaction.
- `src/components/HomeSignOutButton.tsx` - Landing sign-out button.
- `src/components/DashboardSignOutButton.tsx` - Dashboard sign-out button.

### Libraries (`src/lib`)
- `src/lib/user-plans.ts` - User plan + upsert helpers.
- `src/lib/plan-limits.ts` - Limits and config helpers.
- `src/lib/ai-usage.ts` - Atomic AI usage accounting.
- `src/lib/validations.ts` - Zod schemas for API payload validation.
- `src/lib/markdown.ts` - Markdown rendering/sanitization utilities.
- `src/lib/stripe.ts` - Lazy Stripe client singleton/proxy.
- `src/lib/markdown.test.ts` - Markdown utility tests.
- `src/lib/ai-limits.test.ts` - Plan limit sanity test.

### Database and proxy
- `src/db/schema.ts` - Drizzle schema and indices.
- `src/db/index.ts` - Drizzle client bootstrapping.
- `src/proxy.ts` - Clerk proxy middleware and matcher config.

### Drizzle migrations and metadata
- `drizzle/0000_fluffy_butterfly.sql` - Initial migration.
- `drizzle/0001_add_ai_daily_usage.sql` - AI usage migration.
- `drizzle/0002_add_subscriber_user_id.sql` - Subscriber user id migration.
- `drizzle/0003_fat_leo.sql` - Performance and uniqueness migration.
- `drizzle/0004_unusual_vampiro.sql` - Slug uniqueness migration.
- `drizzle/meta/_journal.json` - Migration journal.
- `drizzle/meta/0000_snapshot.json` - Schema snapshot.
- `drizzle/meta/0001_snapshot.json` - Schema snapshot.
- `drizzle/meta/0003_snapshot.json` - Schema snapshot.
- `drizzle/meta/0004_snapshot.json` - Schema snapshot.

### Public assets (`public`)
- `public/file.svg` - Static icon.
- `public/globe.svg` - Static icon.
- `public/next.svg` - Static icon.
- `public/vercel.svg` - Static icon.
- `public/window.svg` - Static icon.

---

## 16. Intentionally Excluded Areas

These directories are excluded from deep per-file documentation because they are generated or vendor-managed:
- `.next/**` (Next build output)
- `node_modules/**` (installed dependencies)
- `.git/**` (repository internals)

Local secret values and machine-specific artifacts are also intentionally excluded.

---

## 17. Maintenance Checklist

Update this document when any of the following changes:
- app/page route structure
- API route signatures or behavior
- auth/public route policy (`src/proxy.ts`)
- schema tables/indexes/migrations
- plan limits or pricing
- env variables or integration providers
- email sender/template/unsubscribe semantics
- AI model/provider/limit logic

Suggested validation before finalizing doc edits:
1. Compare route list against `src/app/**` and `src/proxy.ts`.
2. Compare endpoint descriptions against `src/app/api/**/route.ts`.
3. Compare DB claims against `src/db/schema.ts` and `drizzle/*.sql`.
4. Compare env table against `.env.example` and runtime reads.

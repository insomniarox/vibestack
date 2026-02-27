import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlPage(title: string, body: string) {
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f9fafb; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
          h1 { color: #111827; margin-top: 0; }
          p { color: #4b5563; }
          a { color: #3b82f6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          button { background: #ef4444; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-size: 1rem; cursor: pointer; margin-top: 1rem; }
          button:hover { background: #dc2626; }
          .cancel { background: #e5e7eb; color: #374151; margin-left: 0.5rem; }
          .cancel:hover { background: #d1d5db; }
        </style>
      </head>
      <body>
        <div class="card">
          ${body}
        </div>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

/**
 * GET shows a confirmation page — NEVER performs the unsubscribe.
 * This prevents prefetching, link scanners, and crawlers from
 * accidentally unsubscribing users.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || !UUID_REGEX.test(token)) {
    return htmlPage("Invalid Link", `
      <h1>Invalid Link</h1>
      <p>This unsubscribe link is invalid or malformed.</p>
      <p><a href="/">Return to VibeStack</a></p>
    `);
  }

  try {
    const existing = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    if (existing.length === 0) {
      return htmlPage("Not Found", `
        <h1>Not Found</h1>
        <p>This unsubscribe link may be invalid or expired.</p>
        <p><a href="/">Return to VibeStack</a></p>
      `);
    }

    if (existing[0].status === 'unsubscribed') {
      return htmlPage("Already Unsubscribed", `
        <h1>Already Unsubscribed</h1>
        <p>You have already unsubscribed from this author.</p>
        <p><a href="/">Return to VibeStack</a></p>
      `);
    }

    // Show confirmation form — the actual unsubscribe happens on POST
    return htmlPage("Confirm Unsubscribe", `
      <h1>Unsubscribe?</h1>
      <p>Are you sure you want to unsubscribe? You will no longer receive emails from this author.</p>
      <form method="POST" action="/api/unsubscribe?token=${token}">
        <button type="submit">Yes, Unsubscribe</button>
        <button type="button" class="cancel" onclick="window.history.back()">Cancel</button>
      </form>
    `);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST performs the actual unsubscribe — cancels Stripe + updates DB.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || !UUID_REGEX.test(token)) {
    return htmlPage("Invalid Link", `
      <h1>Invalid Link</h1>
      <p>This unsubscribe link is invalid or malformed.</p>
      <p><a href="/">Return to VibeStack</a></p>
    `);
  }

  try {
    const existing = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    if (existing.length === 0) {
      return htmlPage("Not Found", `
        <h1>Not Found</h1>
        <p>This unsubscribe link may be invalid or expired.</p>
        <p><a href="/">Return to VibeStack</a></p>
      `);
    }

    if (existing[0].status === 'unsubscribed') {
      return htmlPage("Already Unsubscribed", `
        <h1>Already Unsubscribed</h1>
        <p>You have already unsubscribed from this author.</p>
        <p><a href="/">Return to VibeStack</a></p>
      `);
    }

    // Cancel the Stripe subscription if one exists
    const stripeSubId = existing[0].stripeSubscriptionId;
    if (stripeSubId) {
      try {
        await stripe.subscriptions.cancel(stripeSubId);
      } catch (stripeErr) {
        console.error("Stripe subscription cancel error:", stripeErr);
      }
    }

    await db
      .update(subscribers)
      .set({ status: 'unsubscribed' })
      .where(eq(subscribers.unsubscribeToken, token));

    return htmlPage("Successfully Unsubscribed", `
      <h1>Successfully Unsubscribed</h1>
      <p>You will no longer receive emails from this author.</p>
      <p><a href="/">Return to VibeStack</a></p>
    `);
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

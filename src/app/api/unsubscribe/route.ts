import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlPage(title: string, message: string) {
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
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${title}</h1>
          <p>${message}</p>
          <p><a href="/">Return to VibeStack</a></p>
        </div>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || !UUID_REGEX.test(token)) {
    return htmlPage("Invalid Link", "This unsubscribe link is invalid or malformed.");
  }

  try {
    const existing = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token));
    if (existing.length === 0) {
      return htmlPage("Not Found", "This unsubscribe link may be invalid or expired.");
    }

    // Cancel the Stripe subscription if one exists
    const stripeSubId = existing[0].stripeSubscriptionId;
    if (stripeSubId) {
      try {
        await stripe.subscriptions.cancel(stripeSubId);
      } catch (stripeErr) {
        // Log but don't block unsubscribe if Stripe cancel fails
        // (subscription may already be cancelled)
        console.error("Stripe subscription cancel error:", stripeErr);
      }
    }

    await db
      .update(subscribers)
      .set({ status: 'unsubscribed' })
      .where(eq(subscribers.unsubscribeToken, token));

    return htmlPage("Successfully Unsubscribed", "You will no longer receive emails from this author.");
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

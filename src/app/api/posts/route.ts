import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { posts, users, subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // 1. Authenticate with Clerk
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { title, content, vibe } = await req.json();

    // 2. Ensure the user exists in our DB
    const email = user.emailAddresses[0]?.emailAddress || "no-email";
    const handle = user.username || user.firstName || `user_${user.id.slice(-5)}`;
    
    await db.insert(users).values({
      id: user.id,
      email: email,
      handle: handle,
    }).onConflictDoNothing();

    // 3. Insert the Post into Neon Database
    const newPost = await db.insert(posts).values({
      authorId: user.id,
      title: title || "Untitled Vibe",
      content: content || "",
      vibeTheme: vibe || "neutral",
      publishedAt: new Date(),
    }).returning();

    // 4. RESEND INTEGRATION: Fetch subscribers & Blast Email!
    // Get all active subscribers for this specific author
    const userSubs = await db.select().from(subscribers).where(eq(subscribers.authorId, user.id));
    
    if (userSubs.length > 0 && process.env.RESEND_API_KEY) {
      const bccEmails = userSubs.map(sub => sub.email);
      
      await resend.emails.send({
        from: 'VibeStack <onboarding@resend.dev>', // Resend's default test domain
        to: email, // Send to the author, BCC the subscribers
        bcc: bccEmails,
        subject: `${title} - A new post from ${handle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505; color: #e5e5e5; border-radius: 8px;">
            <h1 style="color: #D4FF00;">${title}</h1>
            <div style="font-size: 16px; line-height: 1.6; color: #a3a3a3;">
              ${content.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: 1px solid #222; margin: 30px 0;" />
            <p style="color: #555; font-size: 12px; text-align: center;">Sent via VibeStack ⚡️</p>
          </div>
        `
      });
    }

    return NextResponse.json(newPost[0]);
  } catch (error) {
    console.error("Publishing Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

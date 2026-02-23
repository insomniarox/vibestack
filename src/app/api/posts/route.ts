import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { posts, users, subscribers } from "@/db/schema";
import { eq, and, gte, ne } from "drizzle-orm";
import { Resend } from "resend";
import sanitizeHtml from "sanitize-html";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { title, content, vibe, status = 'draft', isPaid = false, colorScheme } = await req.json();

    const email = user.emailAddresses[0]?.emailAddress || "no-email";
    const handle = user.username || user.firstName || `user_${user.id.slice(-5)}`;
    
    await db.insert(users).values({
      id: user.id,
      email: email,
      handle: handle,
    }).onConflictDoNothing();

    if (status === 'published') {
      const rateLimitHours = parseInt(process.env.PUBLISH_RATE_LIMIT_HOURS || "24", 10);
      const timeLimitDate = new Date(Date.now() - rateLimitHours * 60 * 60 * 1000);
      const recentPosts = await db.select().from(posts).where(
        and(
          eq(posts.authorId, user.id),
          eq(posts.status, 'published'),
          gte(posts.publishedAt, timeLimitDate)
        )
      );

      if (recentPosts.length > 0) {
        return new NextResponse(`Rate limit exceeded: You can only publish one post per ${rateLimitHours} hours.`, { status: 429 });
      }
    }

    const sanitizedContent = sanitizeHtml(content || "", {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height']
      }
    });

    const baseSlug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'untitled';
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const newPost = await db.insert(posts).values({
      authorId: user.id,
      title: title || "Untitled Vibe",
      slug: slug,
      content: sanitizedContent,
      vibeTheme: vibe || "neutral",
      status: status,
      isPaid: Boolean(isPaid),
      colorScheme: colorScheme || null,
      publishedAt: status === 'published' ? new Date() : null,
    }).returning();

    if (status === 'published') {
      const userSubs = await db.select().from(subscribers).where(
        and(
          eq(subscribers.authorId, user.id),
          ne(subscribers.status, 'unsubscribed')
        )
      );
      
      if (userSubs.length > 0 && process.env.RESEND_API_KEY) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Parse Color Scheme
        let colors = { background: '#050505', text: '#e5e5e5', primary: '#D4FF00' };
        if (colorScheme) {
          try {
            const parsed = JSON.parse(colorScheme);
            if (parsed.background) colors.background = parsed.background;
            if (parsed.text) colors.text = parsed.text;
            if (parsed.primary) colors.primary = parsed.primary;
          } catch (e) {
            console.error("Failed to parse color scheme", e);
          }
        }
        
        const emails = userSubs.map(sub => ({
          from: 'VibeStack <onboarding@resend.dev>',
          to: sub.email,
          subject: `${title} - A new post from ${handle}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: ${colors.background}; color: ${colors.text}; border-radius: 8px;">
              <h1 style="color: ${colors.primary};">${title}</h1>
              <div style="font-size: 16px; line-height: 1.6; color: ${colors.text}; opacity: 0.9;">
                ${sanitizedContent.replace(/\n/g, '<br/>')}
              </div>
              <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />
              <p style="color: ${colors.text}; font-size: 12px; text-align: center; opacity: 0.5;">Sent via VibeStack ⚡️</p>
              <p style="text-align: center; font-size: 10px;">
                <a href="${appUrl}/api/unsubscribe?id=${sub.id}" style="color: ${colors.text}; text-decoration: underline; opacity: 0.5;">Unsubscribe</a>
              </p>
            </div>
          `
        }));
        
        await resend.batch.send(emails);
      }
    }

    return NextResponse.json(newPost[0]);
  } catch (error) {
    console.error("Publishing Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id, title, content, vibe, status, isPaid, colorScheme } = await req.json();

    if (!id) {
      return new NextResponse("Post ID is required", { status: 400 });
    }

    // Verify ownership
    const existingPost = await db.select().from(posts).where(eq(posts.id, id));
    if (existingPost.length === 0 || existingPost[0].authorId !== user.id) {
      return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    const wasDraft = existingPost[0].status === 'draft';
    const isNowPublished = status === 'published';

    if (isNowPublished && wasDraft) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPosts = await db.select().from(posts).where(
        and(
          eq(posts.authorId, user.id),
          eq(posts.status, 'published'),
          gte(posts.publishedAt, twentyFourHoursAgo)
        )
      );

      if (recentPosts.length > 0) {
        return new NextResponse("Rate limit exceeded: You can only publish one post per 24 hours.", { status: 429 });
      }
    }

    const sanitizedContent = sanitizeHtml(content || "", {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height']
      }
    });

    const updatedPost = await db.update(posts).set({
      title: title || existingPost[0].title,
      content: sanitizedContent,
      vibeTheme: vibe || existingPost[0].vibeTheme,
      status: status || existingPost[0].status,
      isPaid: isPaid !== undefined ? Boolean(isPaid) : existingPost[0].isPaid,
      colorScheme: colorScheme !== undefined ? colorScheme : existingPost[0].colorScheme,
      publishedAt: isNowPublished && wasDraft ? new Date() : existingPost[0].publishedAt,
    }).where(eq(posts.id, id)).returning();

    // Trigger emails if transitioning from draft to published
    if (isNowPublished && wasDraft) {
      const userSubs = await db.select().from(subscribers).where(
        and(
          eq(subscribers.authorId, user.id),
          ne(subscribers.status, 'unsubscribed')
        )
      );
      
      const handle = user.username || user.firstName || `user_${user.id.slice(-5)}`;
      
      if (userSubs.length > 0 && process.env.RESEND_API_KEY) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Parse Color Scheme
        let colors = { background: '#050505', text: '#e5e5e5', primary: '#D4FF00' };
        const finalColorScheme = colorScheme !== undefined ? colorScheme : existingPost[0].colorScheme;
        if (finalColorScheme) {
          try {
            const parsed = JSON.parse(finalColorScheme);
            if (parsed.background) colors.background = parsed.background;
            if (parsed.text) colors.text = parsed.text;
            if (parsed.primary) colors.primary = parsed.primary;
          } catch (e) {
            console.error("Failed to parse color scheme", e);
          }
        }
        
        const emails = userSubs.map(sub => ({
          from: 'VibeStack <onboarding@resend.dev>',
          to: sub.email,
          subject: `${title} - A new post from ${handle}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: ${colors.background}; color: ${colors.text}; border-radius: 8px;">
              <h1 style="color: ${colors.primary};">${title}</h1>
              <div style="font-size: 16px; line-height: 1.6; color: ${colors.text}; opacity: 0.9;">
                ${sanitizedContent.replace(/\n/g, '<br/>')}
              </div>
              <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />
              <p style="color: ${colors.text}; font-size: 12px; text-align: center; opacity: 0.5;">Sent via VibeStack ⚡️</p>
              <p style="text-align: center; font-size: 10px;">
                <a href="${appUrl}/api/unsubscribe?id=${sub.id}" style="color: ${colors.text}; text-decoration: underline; opacity: 0.5;">Unsubscribe</a>
              </p>
            </div>
          `
        }));
        
        await resend.batch.send(emails);
      }
    }

    return NextResponse.json(updatedPost[0]);
  } catch (error) {
    console.error("Update Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Post ID is required", { status: 400 });
    }

    const existingPost = await db.select().from(posts).where(eq(posts.id, id));
    if (existingPost.length === 0 || existingPost[0].authorId !== user.id) {
      return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    await db.delete(posts).where(eq(posts.id, id));

    return new NextResponse("Deleted successfully", { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

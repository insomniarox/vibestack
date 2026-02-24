import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { posts, subscribers } from "@/db/schema";
import { eq, and, gte, ne } from "drizzle-orm";
import { Resend } from "resend";
import sanitizeHtml from "sanitize-html";
import { createPostSchema, updatePostSchema } from "@/lib/validations";
import { buildHandle, getUserPlan, upsertUserRecord } from "@/lib/user-plans";

const resend = new Resend(process.env.RESEND_API_KEY);

const SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height']
  }
};

function parseColorScheme(colorScheme: string | null | undefined) {
  const defaults = { background: '#050505', text: '#e5e5e5', primary: '#D4FF00' };
  if (!colorScheme) return defaults;
  try {
    const parsed = JSON.parse(colorScheme);
    return {
      background: parsed.background || defaults.background,
      text: parsed.text || defaults.text,
      primary: parsed.primary || defaults.primary,
    };
  } catch {
    return defaults;
  }
}

function getRateLimitHours(): number {
  return parseInt(process.env.PUBLISH_RATE_LIMIT_HOURS || "24", 10);
}

async function checkPublishRateLimit(userId: string): Promise<string | null> {
  const rateLimitHours = getRateLimitHours();
  if (rateLimitHours <= 0) return null;

  const timeLimitDate = new Date(Date.now() - rateLimitHours * 60 * 60 * 1000);
  const recentPosts = await db.select().from(posts).where(
    and(
      eq(posts.authorId, userId),
      eq(posts.status, 'published'),
      gte(posts.publishedAt, timeLimitDate)
    )
  );

  if (recentPosts.length > 0) {
    return `Rate limit exceeded: You can only publish one post per ${rateLimitHours} hours.`;
  }
  return null;
}

async function sendPublishEmails(
  userId: string,
  handle: string,
  title: string,
  sanitizedContent: string,
  colorScheme: string | null | undefined
) {
  const userSubs = await db.select().from(subscribers).where(
    and(
      eq(subscribers.authorId, userId),
      ne(subscribers.status, 'unsubscribed')
    )
  );

  if (userSubs.length === 0 || !process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const colors = parseColorScheme(colorScheme);

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
          <a href="${appUrl}/api/unsubscribe?token=${sub.unsubscribeToken}" style="color: ${colors.text}; text-decoration: underline; opacity: 0.5;">Unsubscribe</a>
        </p>
      </div>
    `
  }));

  await resend.batch.send(emails);
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, content, vibe, status, isPaid, colorScheme } = parsed.data;

    const email = user.emailAddresses[0]?.emailAddress || "no-email";
    const handle = buildHandle(user.id, user.username, user.firstName);

    await upsertUserRecord({
      id: user.id,
      email: email,
      handle: handle,
    });

    const plan = await getUserPlan(user.id);
    const effectiveVibe = plan === 'pro' ? vibe : 'neutral';
    const effectiveColorScheme = plan === 'pro' ? (colorScheme || null) : null;

    if (status === 'published') {
      const rateLimitError = await checkPublishRateLimit(user.id);
      if (rateLimitError) {
        return new NextResponse(rateLimitError, { status: 429 });
      }
    }

    const sanitizedContent = sanitizeHtml(content, SANITIZE_OPTIONS);

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const newPost = await db.insert(posts).values({
      authorId: user.id,
      title: title,
      slug: slug,
      content: sanitizedContent,
      vibeTheme: effectiveVibe,
      status: status,
      isPaid: isPaid,
      colorScheme: effectiveColorScheme,
      publishedAt: status === 'published' ? new Date() : null,
    }).returning();

    if (status === 'published') {
      await sendPublishEmails(user.id, handle, title, sanitizedContent, effectiveColorScheme);
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

    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id: postId, title, content, vibe, status, isPaid, colorScheme } = parsed.data;

    const email = user.emailAddresses[0]?.emailAddress || "no-email";
    const handle = buildHandle(user.id, user.username, user.firstName);

    await upsertUserRecord({
      id: user.id,
      email: email,
      handle: handle,
    });

    const plan = await getUserPlan(user.id);

    const existingPost = await db.select().from(posts).where(eq(posts.id, postId));
    if (existingPost.length === 0 || existingPost[0].authorId !== user.id) {
      return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    const wasDraft = existingPost[0].status === 'draft';
    const isNowPublished = status === 'published';

    if (isNowPublished && wasDraft) {
      const rateLimitError = await checkPublishRateLimit(user.id);
      if (rateLimitError) {
        return new NextResponse(rateLimitError, { status: 429 });
      }
    }

    const sanitizedContent = sanitizeHtml(content || "", SANITIZE_OPTIONS);
    const finalVibe = plan === 'pro' ? (vibe || existingPost[0].vibeTheme) : 'neutral';
    const finalColorScheme = plan === 'pro' ? (colorScheme !== undefined ? colorScheme : existingPost[0].colorScheme) : null;

    const updatedPost = await db.update(posts).set({
      title: title || existingPost[0].title,
      content: sanitizedContent,
      vibeTheme: finalVibe,
      status: status || existingPost[0].status,
      isPaid: isPaid !== undefined ? isPaid : existingPost[0].isPaid,
      colorScheme: finalColorScheme,
      publishedAt: isNowPublished && wasDraft ? new Date() : existingPost[0].publishedAt,
    }).where(eq(posts.id, postId)).returning();

    if (isNowPublished && wasDraft) {
      await sendPublishEmails(user.id, handle, title || existingPost[0].title, sanitizedContent, finalColorScheme);
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
    const idParam = searchParams.get("id");

    if (!idParam) {
      return new NextResponse("Post ID is required", { status: 400 });
    }

    const postId = parseInt(idParam, 10);
    if (isNaN(postId)) {
      return new NextResponse("Post ID must be a number", { status: 400 });
    }

    const existingPost = await db.select().from(posts).where(eq(posts.id, postId));
    if (existingPost.length === 0 || existingPost[0].authorId !== user.id) {
      return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    await db.delete(posts).where(eq(posts.id, postId));

    return new NextResponse("Deleted successfully", { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { aiRewriteSchema } from '@/lib/validations';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserPlan } from '@/lib/user-plans';
import { getAiTextLimit } from '@/lib/plan-limits';
import { consumeAiCall } from '@/lib/ai-usage';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    const textLimit = getAiTextLimit(plan);

    const body = await req.json();
    const parsed = aiRewriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { text, vibe } = parsed.data;

    if (text.length > textLimit) {
      return NextResponse.json(
        {
          code: 'TEXT_LIMIT_EXCEEDED',
          message: `Text must be ${textLimit} characters or less.`,
          limit: textLimit,
          actualLength: text.length,
        },
        { status: 400 }
      );
    }

    const usage = await consumeAiCall(user.id, plan);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily AI limit reached", calls: usage.calls, limit: usage.limit, resetAt: usage.resetAt },
        { status: 429 }
      );
    }

    const prompt = `You are an elite copywriter.
Rewrite the markdown content below to match a "${vibe || 'default'}" tone.
Keep the core message intact, preserve markdown structure (headings, lists, links, images, code fences), and return only the rewritten markdown.
No commentary, no fences around your answer.

<markdown_input>
${text}
</markdown_input>`;

    const result = streamText({
      model: google(process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'),
      prompt,
    });

    return result.toTextStreamResponse({
      headers: {
        "X-AI-Usage-Calls": String(usage.calls),
        "X-AI-Usage-Limit": String(usage.limit),
        "X-AI-Usage-Reset": usage.resetAt,
      },
    });
  } catch (error) {
    console.error("AI Rewrite Error:", error);
    return new NextResponse('Failed to rewrite text', { status: 500 });
  }
}

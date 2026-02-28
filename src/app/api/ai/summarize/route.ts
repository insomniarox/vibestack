import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { aiSummarizeSchema } from '@/lib/validations';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserPlan } from '@/lib/user-plans';
import { getAiTextLimit } from '@/lib/plan-limits';
import { consumeAiCall } from '@/lib/ai-usage';
import { markdownToPlainText } from '@/lib/markdown';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    const textLimit = getAiTextLimit(plan);

    const body = await req.json();
    const parsed = aiSummarizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { text } = parsed.data;
    const normalizedText = markdownToPlainText(text);

    if (!normalizedText) {
      return NextResponse.json(
        {
          code: 'EMPTY_TEXT',
          message: 'Text must include readable content after removing markdown syntax.',
        },
        { status: 400 }
      );
    }

    if (normalizedText.length > textLimit) {
      return NextResponse.json(
        {
          code: 'TEXT_LIMIT_EXCEEDED',
          message: `Text must be ${textLimit} characters or less.`,
          limit: textLimit,
          actualLength: normalizedText.length,
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

    const prompt = `Summarize the following text into a punchy, highly engaging TL;DR. 
    Keep it concise (1-2 sentences maximum). Return ONLY the summary.
    
    Text to summarize:
    ${normalizedText}`;

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
    console.error("AI Summarize Error:", error);
    return new NextResponse('Failed to summarize text', { status: 500 });
  }
}

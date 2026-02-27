import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { aiSummarizeSchema } from '@/lib/validations';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserPlan } from '@/lib/user-plans';
import { getAiTextLimit } from '@/lib/plan-limits';

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

    if (text.length > textLimit) {
      return NextResponse.json({ error: { text: [`Text must be ${textLimit} characters or less.`] } }, { status: 400 });
    }

    const prompt = `Summarize the following text into a punchy, highly engaging TL;DR. 
    Keep it concise (1-2 sentences maximum). Return ONLY the summary.
    
    Text to summarize:
    ${text}`;

    const result = streamText({
      model: google(process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'),
      prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Summarize Error:", error);
    return new NextResponse('Failed to summarize text', { status: 500 });
  }
}

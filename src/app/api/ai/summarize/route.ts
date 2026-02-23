import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { aiSummarizeSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = aiSummarizeSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
    }

    const { text } = parsed.data;

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
    return new Response('Failed to summarize text', { status: 500 });
  }
}

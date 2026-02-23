import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { aiRewriteSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = aiRewriteSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
    }

    const { text, vibe } = parsed.data;

    const prompt = `You are an elite copywriter. Rewrite the following text to perfectly match a "${vibe || 'neutral'}" tone. 
    Keep the core message intact, but aggressively adapt the vocabulary, pacing, and aesthetic to fit the mood.
    Return ONLY the rewritten text, no conversational filler.
    
    Original Text:
    ${text}`;

    const result = streamText({
      model: google(process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'),
      prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Rewrite Error:", error);
    return new Response('Failed to rewrite text', { status: 500 });
  }
}

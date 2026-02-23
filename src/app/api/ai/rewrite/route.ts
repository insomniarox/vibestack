import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { text, vibe } = await req.json();

    if (!text) {
      return new Response('No text provided', { status: 400 });
    }

    const prompt = `You are an elite copywriter. Rewrite the following text to perfectly match a "${vibe}" tone. 
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

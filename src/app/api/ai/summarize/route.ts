import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response('No text provided', { status: 400 });
    }

    const prompt = `Summarize the following text into a punchy, highly engaging TL;DR. 
    Keep it concise (1-2 sentences maximum). Return ONLY the summary.
    
    Text to summarize:
    ${text}`;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      prompt,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("AI Summarize Error:", error);
    return new Response('Failed to summarize text', { status: 500 });
  }
}

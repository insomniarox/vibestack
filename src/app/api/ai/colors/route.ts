import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { aiColorsSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = aiColorsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { vibe, content } = parsed.data;

    const result = await generateObject({
      model: google(process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'),
      schema: z.object({
        background: z.string().describe("Background color hex code (e.g., #050505)"),
        text: z.string().describe("Main text color hex code (e.g., #e5e5e5)"),
        primary: z.string().describe("Primary/Accent color hex code for highlights/buttons (e.g., #D4FF00)")
      }),
      prompt: `Generate a 3-color scheme (background, main text, and primary accent) that perfectly captures a "${vibe}" vibe. Consider the context of this post content: "${content ? content.substring(0, 500) : 'General newsletter'}". Ensure the text has high contrast against the background for readability. Use exact hex codes.`,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("AI Color Generation Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

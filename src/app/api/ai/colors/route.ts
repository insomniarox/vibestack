import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { aiColorsSchema } from '@/lib/validations';
import { currentUser } from '@clerk/nextjs/server';
import { getUserPlan } from '@/lib/user-plans';
import { consumeAiCall } from '@/lib/ai-usage';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    if (plan !== 'pro') {
      return new NextResponse("Upgrade to Pro to access vibe colors.", { status: 403 });
    }

    const body = await req.json();
    const parsed = aiColorsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const usage = await consumeAiCall(user.id, plan);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily AI limit reached", calls: usage.calls, limit: usage.limit, resetAt: usage.resetAt },
        { status: 429 }
      );
    }

    const { vibe, title, content, variationSeed, tone, contrast, saturation } = parsed.data;

    const stripMarkdown = (input: string) => {
      let text = input;
      text = text.replace(/```[\s\S]*?```/g, " ");
      text = text.replace(/`[^`]*`/g, " ");
      text = text.replace(/!\[[^\]]*\]\([^\)]*\)/g, " ");
      text = text.replace(/\[([^\]]+)\]\([^\)]*\)/g, "$1");
      text = text.replace(/^\s*#{1,6}\s+/gm, " ");
      text = text.replace(/^\s*>\s?/gm, " ");
      text = text.replace(/^\s*[-*+]\s+/gm, " ");
      text = text.replace(/^\s*\d+\.\s+/gm, " ");
      text = text.replace(/^\s*([-*_]\s*){3,}$/gm, " ");
      text = text.replace(/[_*~]/g, " ");
      text = text.replace(/\s+/g, " ").trim();
      return text;
    };

    const composedContent = `${title || "Untitled"}\n\n${content || ""}`;
    const cleanedContent = stripMarkdown(composedContent);
    const contextSnippet = cleanedContent.length > 0 ? cleanedContent.substring(0, 500) : "General newsletter";
    const seedLabel = typeof variationSeed === "number" ? `Variation seed: ${variationSeed}.` : "";
    const toneLabel = tone ? `Tone: ${tone}.` : "";
    const contrastLabel = contrast ? `Contrast: ${contrast}.` : "";
    const saturationLabel = saturation ? `Saturation: ${saturation}.` : "";

    const result = await generateObject({
      model: google(process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash'),
      temperature: 0.9,
      topP: 0.95,
      schema: z.object({
        background: z.string().describe("Background color hex code (e.g., #050505)"),
        text: z.string().describe("Main text color hex code (e.g., #e5e5e5)"),
        primary: z.string().describe("Primary/Accent color hex code for highlights/buttons (e.g., #D4FF00)")
      }),
      prompt: `Generate a 3-color scheme (background, main text, and primary accent) that perfectly captures a "${vibe}" vibe. ${seedLabel} ${toneLabel} ${contrastLabel} ${saturationLabel} Consider the context of this post content: "${contextSnippet}". Ensure the text has high contrast against the background for readability. Use exact hex codes.`,
    });

    return NextResponse.json(result.object, {
      headers: {
        "X-AI-Usage-Calls": String(usage.calls),
        "X-AI-Usage-Limit": String(usage.limit),
        "X-AI-Usage-Reset": usage.resetAt,
      },
    });
  } catch (error) {
    console.error("AI Color Generation Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

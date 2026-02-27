import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/user-plans";
import { getAiUsage } from "@/lib/ai-usage";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = await getUserPlan(user.id);
    const usage = await getAiUsage(user.id, plan);
    return NextResponse.json(usage);
  } catch (error) {
    console.error("AI Usage Error:", error);
    return new NextResponse("Failed to fetch AI usage", { status: 500 });
  }
}

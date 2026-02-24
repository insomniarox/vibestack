import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VibeEditor from "@/components/VibeEditor";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/user-plans";

export default async function WritePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const plan = await getUserPlan(userId);
  const { id } = await searchParams;
  let initialPost = null;

  if (id) {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      redirect("/dashboard/write");
    }
    const existingPost = await db.select().from(posts).where(eq(posts.id, postId));
    if (existingPost.length > 0 && existingPost[0].authorId === userId) {
      initialPost = existingPost[0];
    } else {
      // Not found or unauthorized
      redirect("/dashboard/write");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      
      {/* Top Navigation for Editor */}
      <div className="max-w-[1600px] mx-auto mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono px-3 py-1 rounded-full glass text-primary">
            {initialPost?.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <main className="max-w-[1600px] mx-auto">
        <VibeEditor initialPost={initialPost} plan={plan} />
      </main>
      
    </div>
  );
}
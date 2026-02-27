import { Users, Zap, Plus, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { db } from "../../db";
import { posts, subscribers, users } from "../../db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import DeletePostButton from "@/components/DeletePostButton";

const POSTS_PER_PAGE = 20;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { userId } = await auth();
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const offset = (currentPage - 1) * POSTS_PER_PAGE;

  let subCount = 0;
  let latestPost = null;
  let allPosts: typeof posts.$inferSelect[] = [];
  let publishedCount = 0;
  let totalPosts = 0;
  let handle = "";

  if (userId) {
    try {
      const userRecord = await db.select().from(users).where(eq(users.id, userId));
      if (userRecord.length > 0) {
        handle = userRecord[0].handle;
      }

      const [subCountResult, publishedCountResult, totalCountResult, paginatedPosts, latestPublished] = await Promise.all([
        db.select({ value: count() }).from(subscribers).where(eq(subscribers.authorId, userId)),
        db.select({ value: count() }).from(posts).where(
          and(eq(posts.authorId, userId), eq(posts.status, 'published'))
        ),
        db.select({ value: count() }).from(posts).where(eq(posts.authorId, userId)),
        db.select().from(posts).where(eq(posts.authorId, userId)).orderBy(desc(posts.createdAt)).limit(POSTS_PER_PAGE).offset(offset),
        db.select().from(posts).where(
          and(eq(posts.authorId, userId), eq(posts.status, 'published'))
        ).orderBy(desc(posts.publishedAt)).limit(1),
      ]);

      subCount = subCountResult[0].value;
      publishedCount = publishedCountResult[0].value;
      totalPosts = totalCountResult[0].value;
      allPosts = paginatedPosts;
      latestPost = latestPublished[0] || null;
    } catch (e) {
      console.error("DB Fetch Error:", e);
    }
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back.</h1>
          <p className="text-gray-400">Here is what is happening with your newsletter today.</p>
        </div>
        <Link
          href="/feed"
          className="glass inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/5 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-horizon" />
          Explore the Feed
        </Link>
      </header>

      {/* Brutalist Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[160px]">
        
        {/* Primary Action Card (Span 2x2) */}
        <Link href="/dashboard/write" className="md:col-span-2 md:row-span-2 bg-primary text-black p-6 md:p-8 flex flex-col justify-between group hover:scale-[1.01] transition-transform cursor-pointer relative overflow-hidden block">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold tracking-tight mb-2">Write in 4D.</h3>
            <p className="text-black/70 max-w-sm">Create a new AI-augmented newsletter post. Let the Vibe Engine do the heavy lifting.</p>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <span className="font-mono font-bold">CREATE_POST</span>
            <div className="w-12 h-12 bg-black text-primary flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
          </div>
          {/* Decorative element */}
          <div className="absolute -bottom-10 -right-10 w-64 h-64 border border-black/10 rounded-full pointer-events-none" />
        </Link>

        {/* Stat Card 1 */}
        <div className="bg-surface border border-border p-6 flex flex-col justify-between hover:border-gray-700 transition-colors">
          <div className="flex justify-between items-start">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1">Active</span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{subCount}</p>
            <p className="text-sm text-gray-400 mt-1">Total Subscribers</p>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface border border-border p-6 flex flex-col justify-between hover:border-gray-700 transition-colors">
          <div className="flex justify-between items-start">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{publishedCount}</p>
            <p className="text-sm text-gray-400 mt-1">Published Posts</p>
          </div>
        </div>

        {/* Recent Vibe Card (Span 2 horizontal) */}
        <div className="md:col-span-2 bg-surface border border-border p-6 flex flex-col justify-between hover:border-gray-700 transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-horizon/20 blur-[50px] -z-0 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-horizon" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Latest Dispatch</span>
            </div>
          </div>
          <div className="relative z-10">
            {latestPost ? (
              <>
                <h4 className="text-xl font-bold tracking-tight mb-1">{latestPost.title}</h4>
                <p className="text-sm text-gray-400 truncate">Published {latestPost.createdAt?.toLocaleDateString()} • Vibe: {latestPost.vibeTheme}</p>
              </>
            ) : (
              <>
                <h4 className="text-xl font-bold tracking-tight mb-1 text-gray-500">No posts yet</h4>
                <p className="text-sm text-gray-400 truncate">Your latest masterpiece will appear here.</p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* List of all posts below the bento grid */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Your Posts</h2>
        <div className="glass border border-border rounded-2xl overflow-hidden">
          {allPosts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {allPosts.map((post) => (
                <div key={post.id} className="p-6 hover:bg-white/[0.02] transition-colors flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold mb-1 text-gray-200">{post.title}</h3>
                    <p className="text-sm text-gray-400">Vibe: {post.vibeTheme} • {post.createdAt?.toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {post.status === 'published' ? (
                      <>
                        <Link href={`/${handle || post.authorId}/${post.slug || post.id}`} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-gray-300 hover:text-white transition-colors">View</Link>
                        <span className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">Published</span>
                      </>
                    ) : (
                      <>
                        <Link href={`/dashboard/write?id=${post.id}`} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-gray-300 hover:text-white transition-colors">Edit</Link>
                        <DeletePostButton id={post.id} />
                        <span className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-gray-400 font-medium">Draft</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No posts created yet. Time to start writing!
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            {currentPage > 1 && (
              <Link
                href={`/dashboard?page=${currentPage - 1}`}
                className="px-4 py-2 glass border border-border rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                &larr; Previous
              </Link>
            )}
            <span className="text-sm text-gray-400 font-mono">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/dashboard?page=${currentPage + 1}`}
                className="px-4 py-2 glass border border-border rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

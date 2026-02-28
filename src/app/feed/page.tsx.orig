import { db } from "@/db";
import { posts, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { markdownToPlainText } from "@/lib/markdown";

export const revalidate = 60;

const POSTS_PER_PAGE = 20;

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { userId } = await auth();
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const offset = (currentPage - 1) * POSTS_PER_PAGE;

  const [feedPosts, totalResult] = await Promise.all([
    db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt))
      .limit(POSTS_PER_PAGE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.status, "published")),
  ]);

  const totalPosts = Number(totalResult[0].count);
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-black font-bold text-lg font-mono">V</div>
              <span className="font-semibold text-lg tracking-tight">VibeStack</span>
            </Link>
            {userId && (
              <Link
                href="/dashboard"
                className="bg-primary text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="mt-8">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">The Feed</h1>
            <p className="text-gray-400">Discover the latest vibes from our creators.</p>
          </div>
        </header>

        <div className="space-y-8">
          {feedPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 glass rounded-2xl border border-border">
              No posts yet. Be the first to publish!
            </div>
          ) : (
            feedPosts.map(({ post, author }) => (
              <article key={post.id} className="glass p-6 rounded-2xl border border-border hover:border-primary/50 transition-colors group relative">
                <Link href={`/${author.handle}/${post.slug}`} className="absolute inset-0 z-10">
                  <span className="sr-only">Read {post.title}</span>
                </Link>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/${author.handle}`} className="relative z-20 flex items-center gap-3 group/author">
                      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-primary group-hover/author:border-primary transition-colors">
                        {author.handle.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white group-hover/author:text-primary transition-colors">@{author.handle}</p>
                        <p className="text-xs text-gray-500 group-hover/author:text-gray-400">
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </p>
                      </div>
                    </Link>
                  </div>
                  {post.isPaid && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
                      Premium
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 font-serif group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                
                <p className="text-gray-400 line-clamp-3 mb-4 text-sm leading-relaxed">
                  {post.content ? markdownToPlainText(post.content) : ''}
                </p>

                <div className="flex items-center text-sm font-medium text-primary">
                  Read more <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </article>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            {currentPage > 1 && (
              <Link
                href={`/feed?page=${currentPage - 1}`}
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
                href={`/feed?page=${currentPage + 1}`}
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

import { db } from "@/db";
import { users, posts, subscribers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

const POSTS_PER_PAGE = 12;

export default async function AuthorProfile({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ page?: string }> }) {
  const { handle } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const offset = (currentPage - 1) * POSTS_PER_PAGE;
  
  // 1. Fetch Author
  const userResult = await db.select().from(users).where(eq(users.handle, handle));
  const author = userResult[0];
  
  if (!author) {
    return notFound();
  }

  // 2. Fetch Published Posts
  const [authorPosts, totalResult] = await Promise.all([
    db.select().from(posts)
      .where(and(eq(posts.authorId, author.id), eq(posts.status, 'published')))
      .orderBy(desc(posts.publishedAt))
      .limit(POSTS_PER_PAGE)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(posts)
      .where(and(eq(posts.authorId, author.id), eq(posts.status, 'published'))),
  ]);

  const totalPosts = Number(totalResult[0].count);
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  // 3. Subscription Status
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  
  let isSubscribed = false;
  let unsubscribeToken: string | null = null;

  if (user?.id === author.id) {
    isSubscribed = true;
  } else if (userEmail) {
    const subResult = await db.select().from(subscribers).where(
      and(
        eq(subscribers.authorId, author.id),
        eq(subscribers.email, userEmail),
        eq(subscribers.status, 'active')
      )
    );
    if (subResult.length > 0) {
      isSubscribed = true;
      unsubscribeToken = subResult[0]?.unsubscribeToken || null;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <nav className="p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-black font-bold text-lg font-mono">V</div>
          <span className="font-semibold text-lg tracking-tight">VibeStack</span>
        </Link>
        {user?.id && (
          <Link
            href="/dashboard"
            className="bg-primary text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <header className="mb-20 text-center">
          <div className="w-20 h-20 bg-surface border border-border rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-mono text-primary shadow-[0_0_30px_rgba(212,255,0,0.1)]">
            {author.handle.substring(0, 2).toUpperCase()}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">@{author.handle}</h1>
          {author.bio && <p className="text-gray-400 text-lg">{author.bio}</p>}
          
          {!isSubscribed ? (
            <form action="/api/checkout" method="POST" className="mt-8 inline-block">
              <input type="hidden" name="authorId" value={author.id} />
              <button type="submit" className="bg-primary text-black px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(212,255,0,0.2)]">
                Subscribe ($5/mo)
              </button>
            </form>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="inline-block px-8 py-3 rounded-full border border-primary/50 text-primary font-semibold glass">
                Subscribed
              </div>
              {unsubscribeToken && user?.id !== author.id && (
                <Link
                  href={`/api/unsubscribe?token=${unsubscribeToken}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold bg-red-500 text-black hover:bg-red-400 transition-colors"
                >
                  Unsubscribe
                </Link>
              )}
            </div>
          )}
        </header>

        <div className="space-y-8">
          <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest border-b border-border pb-4 mb-8">Published Transmissions</h2>
          
          {authorPosts.length > 0 ? (
            <div className="flex flex-col gap-6">
              {authorPosts.map((post) => (
                <Link 
                  key={post.id} 
                  href={`/${author.handle}/${post.slug}`}
                  className="glass p-8 rounded-2xl block hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group"
                >
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{post.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{post.publishedAt?.toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="px-2 py-1 rounded bg-white/5 font-mono text-xs">{post.vibeTheme}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 glass rounded-2xl">
              No public transmissions yet.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            {currentPage > 1 && (
              <Link
                href={`/${author.handle}?page=${currentPage - 1}`}
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
                href={`/${author.handle}?page=${currentPage + 1}`}
                className="px-4 py-2 glass border border-border rounded-lg text-sm hover:bg-white/5 transition-colors"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

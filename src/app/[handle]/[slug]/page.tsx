import { db } from "@/db";
import { users, posts, subscribers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getMarkdownTeaser, renderMarkdownToHtml } from "@/lib/markdown";

export default async function PostPage({ params }: { params: Promise<{ handle: string, slug: string }> }) {
  const { handle, slug } = await params;
  
  // 1. Fetch Author
  const userResult = await db.select().from(users).where(eq(users.handle, handle));
  const author = userResult[0];
  if (!author) return notFound();

  // 2. Fetch Post
  const postResult = await db.select().from(posts)
    .where(and(eq(posts.authorId, author.id), eq(posts.slug, slug), eq(posts.status, 'published')));
  
  const post = postResult[0];
  if (!post) return notFound();

  // 3. Paywall Logic
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  
  let isSubscribed = false;

  // The author can always read their own posts
  if (user?.id === author.id) {
    isSubscribed = true;
  } else if (userEmail) {
    // Check if current user has an active subscription to this author
    const subResult = await db.select().from(subscribers).where(
      and(
        eq(subscribers.authorId, author.id),
        eq(subscribers.email, userEmail),
        eq(subscribers.status, 'active')
      )
    );
    if (subResult.length > 0) {
      isSubscribed = true;
    }
  }

  const showPaywall = post.isPaid && !isSubscribed;
  
  // If paid & unsubscribed, only show the first 2 paragraphs as a teaser
  const fullContent = post.content || "";
  const renderedHtml = showPaywall ? getMarkdownTeaser(fullContent, 2, 350) : renderMarkdownToHtml(fullContent);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Vibe Background Effect based on theme */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] blur-[120px] rounded-full pointer-events-none opacity-30 ${
        post.vibeTheme === 'luxury' ? 'bg-amber-500' :
        post.vibeTheme === 'aggressive' ? 'bg-red-500' :
        post.vibeTheme === 'melancholic' ? 'bg-blue-500' :
        'bg-horizon'
      }`} />

      <nav className="p-6 relative z-10 max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-black font-bold text-lg font-mono">V</div>
            <span className="font-semibold text-lg tracking-tight">VibeStack</span>
          </Link>
          <span className="text-border">/</span>
          <Link href={`/${author.handle}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            @{author.handle}
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.id && (
            <Link
              href="/dashboard"
              className="bg-primary text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
          {!isSubscribed && (
            <form action="/api/checkout" method="POST">
              <input type="hidden" name="authorId" value={author.id} />
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors backdrop-blur-md">
                Subscribe ($5/mo)
              </button>
            </form>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-20 relative z-10">
        <header className="mb-16 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-border text-xs font-mono text-gray-400 mb-6 uppercase tracking-widest">
            {post.vibeTheme} Vibe
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>{post.publishedAt?.toLocaleDateString()}</span>
          </div>
        </header>

        {/* The Post Content using Instrument Serif for that premium feel */}
        <article className="prose prose-invert prose-lg md:prose-xl mx-auto font-serif tracking-wide leading-relaxed text-gray-300 relative" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
          <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />

          {showPaywall && (
            <div className="relative mt-4 pt-24 pb-12 glass border border-primary/30 rounded-2xl text-center overflow-hidden flex flex-col items-center justify-center font-sans">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent bottom-full translate-y-full pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 text-white">Keep Reading with Premium</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto text-base">
                  Subscribe to @{author.handle} to unlock this full transmission and get access to all future premium content.
                </p>
                <form action="/api/checkout" method="POST">
                  <input type="hidden" name="authorId" value={author.id} />
                  <button type="submit" className="bg-primary text-black px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(212,255,0,0.2)]">
                    Upgrade to Read ($5/mo)
                  </button>
                </form>
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}

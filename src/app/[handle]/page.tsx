import { db } from "@/db";
import { users, posts, subscribers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";

export default async function AuthorProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  
  // 1. Fetch Author
  const userResult = await db.select().from(users).where(eq(users.handle, handle));
  const author = userResult[0];
  
  if (!author) {
    return notFound();
  }

  // 2. Fetch Published Posts
  const authorPosts = await db.select().from(posts)
    .where(and(eq(posts.authorId, author.id), eq(posts.status, 'published')))
    .orderBy(desc(posts.publishedAt));

  // 3. Subscription Status
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  
  let isSubscribed = false;

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
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <nav className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
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
            <div className="mt-8 inline-block px-8 py-3 rounded-full border border-primary/50 text-primary font-semibold glass">
              Subscribed
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
      </main>
    </div>
  );
}

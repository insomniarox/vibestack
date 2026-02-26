import Link from "next/link";
import { LayoutGrid, PenTool, Users, ChevronDown } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import DashboardSignOutButton from "@/components/DashboardSignOutButton";
import { dark } from "@clerk/themes";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { subscribers, users } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getUserPlan } from "@/lib/user-plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const plan = userId ? await getUserPlan(userId) : "hobby";

  const subscribedAuthors = userEmail
    ? await db
      .select({
        authorId: subscribers.authorId,
        unsubscribeToken: subscribers.unsubscribeToken,
        handle: users.handle,
      })
      .from(subscribers)
      .innerJoin(users, eq(subscribers.authorId, users.id))
      .where(and(eq(subscribers.email, userEmail), eq(subscribers.status, "active")))
      .orderBy(asc(users.handle))
    : [];

  const planLabel = plan === "pro" ? "PRO" : "HOBBY";
  const planClasses = plan === "pro"
    ? "bg-primary text-black border border-primary/60"
    : "bg-white/5 text-gray-300 border border-border";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Brutalist Sidebar (Hidden on Mobile) */}
      <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col justify-between">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-7 h-7 bg-primary text-black font-bold text-lg font-mono">V</div>
            <span className="font-semibold tracking-tight text-lg">VibeStack</span>
          </Link>
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-widest uppercase">
            <span className={`px-2 py-0.5 rounded-full ${planClasses}`}>{planLabel}</span>
            <span className="text-gray-500">Plan</span>
          </div>
          <nav className="space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-border text-sm font-medium hover:bg-white/10 transition-colors">
              <LayoutGrid className="w-4 h-4" /> Dashboard
            </Link>
            <Link href="/dashboard/write" className="flex items-center gap-3 px-4 py-3 border border-transparent text-sm font-medium text-gray-400 hover:text-white hover:border-border transition-colors">
              <PenTool className="w-4 h-4" /> New Post
            </Link>
            <Link href="/dashboard/audience" className="flex items-center gap-3 px-4 py-3 border border-transparent text-sm font-medium text-gray-400 hover:text-white hover:border-border transition-colors">
              <Users className="w-4 h-4" /> Subscribers
            </Link>
          </nav>
          <details className="mt-8 border border-border rounded-xl overflow-hidden group">
            <summary
              aria-label="Toggle subscribed authors"
              className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <span>Subscribed Authors</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{subscribedAuthors.length}</span>
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <div className="px-4 pb-4 pt-2">
              {subscribedAuthors.length > 0 ? (
                subscribedAuthors.map((author, index) => (
                  <div
                    key={author.authorId}
                    className={`flex flex-col gap-2 py-4 px-2 -mx-2 rounded-lg ${index % 2 === 0 ? "bg-horizon/15" : "bg-primary/10"}`}
                  >
                    <Link
                      href={`/${author.handle}`}
                      className="text-sm text-gray-300 hover:text-primary transition-colors"
                    >
                      @{author.handle}
                    </Link>
                    <Link
                      href={`/api/unsubscribe?token=${author.unsubscribeToken}`}
                      className="inline-flex items-center justify-center w-fit px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-black hover:bg-red-400 transition-colors"
                    >
                      Unsubscribe
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 space-y-2">
                  <p>No active subscriptions yet.</p>
                  <Link href="/feed" className="inline-flex items-center text-horizon hover:text-horizon/80 transition-colors">
                    Explore the feed
                  </Link>
                </div>
              )}
            </div>
          </details>
        </div>
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium">
            <UserButton showName appearance={{ baseTheme: dark, elements: { userButtonBox: "flex-row-reverse", userButtonOuterIdentifier: "text-white font-semibold" } }} />
          </div>
          <DashboardSignOutButton />
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
          <h2 className="text-sm font-mono text-gray-400">/dashboard</h2>
          <div className="w-8 h-8 bg-surface border border-border flex items-center justify-center text-xs font-mono">
            US
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { LayoutGrid, PenTool, Users, ChevronDown } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import DashboardSignOutButton from "@/components/DashboardSignOutButton";
import MobileSidebar from "@/components/MobileSidebar";
import { dark } from "@clerk/themes";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { subscribers, users } from "@/db/schema";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { getUserPlan } from "@/lib/user-plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress;
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const plan = userId ? await getUserPlan(userId) : "hobby";

  const subscribedAuthors = userId || normalizedEmail
    ? await db
      .select({
        authorId: subscribers.authorId,
        unsubscribeToken: subscribers.unsubscribeToken,
        handle: users.handle,
      })
      .from(subscribers)
      .innerJoin(users, eq(subscribers.authorId, users.id))
      .where(and(
        eq(subscribers.status, "active"),
        or(
          userId ? eq(subscribers.subscriberUserId, userId) : sql`false`,
          normalizedEmail ? sql`lower(${subscribers.email}) = ${normalizedEmail}` : sql`false`
        )
      ))
      .orderBy(asc(users.handle))
    : [];

  const planLabel = plan === "pro" ? "PRO" : "HOBBY";
  const planClasses = plan === "pro"
    ? "bg-primary text-black border border-primary/60"
    : "bg-white/5 text-gray-300 border border-border";

  const sidebarContent = (
    <>
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
        <details className="mt-8 border border-border rounded-xl overflow-hidden group bg-surface/50 backdrop-blur-md">
          <summary
            aria-label="Toggle subscribed authors"
            className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span>Subscriptions</span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-white/10 px-2 py-0.5 rounded-full">{subscribedAuthors.length}</span>
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <div className="px-2 pb-2 pt-1">
            {subscribedAuthors.length > 0 ? (
              <div className="flex flex-col gap-1">
                {subscribedAuthors.map((author) => (
                  <div
                    key={author.authorId}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group/item"
                  >
                    <Link
                      href={`/${author.handle}`}
                      className="text-sm text-gray-300 group-hover/item:text-white transition-colors truncate max-w-[120px]"
                    >
                      @{author.handle}
                    </Link>
                    <a
                      href={`/api/unsubscribe?token=${author.unsubscribeToken}`}
                      className="opacity-0 group-hover/item:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
                      title="Unsubscribe"
                    >
                      Unsubscribe
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 px-2 space-y-2 pb-2">
                <p>No active subscriptions.</p>
                <Link href="/feed" className="inline-flex items-center text-horizon hover:text-horizon/80 transition-colors">
                  Explore the feed
                </Link>
              </div>
            )}
          </div>
        </details>
      </div>
      <div className="p-6 space-y-2 mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium">
          <UserButton showName appearance={{ baseTheme: dark, elements: { userButtonBox: "flex-row-reverse", userButtonOuterIdentifier: "text-white font-semibold" } }} />
        </div>
        <DashboardSignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Brutalist Sidebar (Hidden on Mobile) */}
      <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto">
        {sidebarContent}
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full">
        <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <MobileSidebar>{sidebarContent}</MobileSidebar>
            <h2 className="text-sm font-mono text-gray-400">/dashboard</h2>
          </div>
          <div className="w-8 h-8 bg-surface border border-border flex items-center justify-center text-xs font-mono">
            US
          </div>
        </header>
        <div className="p-4 md:p-8 overflow-x-hidden relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
}

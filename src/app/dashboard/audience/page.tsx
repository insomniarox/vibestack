export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users, MailOpen, MousePointerClick, UserMinus, ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getUserPlan, PLAN_LIMITS } from "@/lib/user-plans";
import AudienceTable from "@/components/AudienceTable";

type Subscriber = typeof subscribers.$inferSelect;

export default async function AudiencePage() {
  const { userId } = await auth();
  let userSubscribers: Subscriber[] = [];
  let plan: "hobby" | "pro" = "hobby";
  
  if (userId) {
    try {
      plan = await getUserPlan(userId);
      userSubscribers = await db.select().from(subscribers).where(eq(subscribers.authorId, userId)).orderBy(desc(subscribers.createdAt));
    } catch (e) {
      console.error("DB Fetch Error:", e);
    }
  }

  const activeCount = userSubscribers.filter(s => s.status === 'active').length;
  const unsubsCount = userSubscribers.filter(s => s.status === 'unsubscribed').length;
  const planMaxSubscribers = PLAN_LIMITS[plan].subscribers;

  // Serialize for client component (dates must be strings)
  const serializedSubscribers = userSubscribers.map(s => ({
    id: s.id,
    email: s.email,
    status: s.status,
    createdAt: s.createdAt?.toISOString() ?? "",
  }));

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Top Nav */}
      <div className="max-w-[1200px] mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 glass border border-border rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audience</h1>
            <p className="text-sm text-gray-400">Manage subscribers and track engagement</p>
          </div>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto space-y-8">
        <section className="glass border border-border rounded-2xl px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono tracking-widest uppercase bg-white/5 border border-border">
              {plan}
            </span>
            <span>
              Subscribers: <span className="text-white font-semibold">{userSubscribers.length}</span> / {planMaxSubscribers}
            </span>
          </div>
          {plan === "hobby" && (
            <form action="/api/plans/pro" method="POST">
              <button
                type="submit"
                className="bg-primary text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Upgrade to Pro
              </button>
            </form>
          )}
        </section>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Subscribers", value: userSubscribers.length.toString(), icon: Users, color: "text-primary", trend: "All time" },
            { label: "Active", value: activeCount.toString(), icon: MailOpen, color: "text-purple-400", trend: "Current" },
            { label: "Click Rate", value: "--", icon: MousePointerClick, color: "text-emerald-400", trend: "Coming soon" },
            { label: "Unsubscribed", value: unsubsCount.toString(), icon: UserMinus, color: "text-red-400", trend: "All time" },
          ].map((stat, i) => (
            <div key={i} className="glass border border-border rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-surface border border-border ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-400 font-medium mb-2">{stat.label}</p>
              <div className="text-xs text-gray-500 font-mono bg-black/40 border border-border/50 inline-block px-2 py-1 rounded">{stat.trend}</div>
            </div>
          ))}
        </div>

        {/* Client component with search + export */}
        <AudienceTable subscribers={serializedSubscribers} />
      </main>
    </div>
  );
}

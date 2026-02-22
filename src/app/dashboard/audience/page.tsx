import Link from "next/link";
import { Users, MailOpen, MousePointerClick, UserMinus, Search, Download, ArrowLeft } from "lucide-react";

export default function AudiencePage() {
  // Mock data for visual scaffolding
  const mockSubscribers = [
    { id: 1, email: "alice@example.com", status: "Subscribed", date: "2026-02-21", engagement: "High" },
    { id: 2, email: "bob@corporate.io", status: "Subscribed", date: "2026-02-20", engagement: "Medium" },
    { id: 3, email: "charlie@web3.eth", status: "Bounced", date: "2026-02-18", engagement: "Low" },
    { id: 4, email: "diana@design.co", status: "Subscribed", date: "2026-02-15", engagement: "High" },
    { id: 5, email: "evan@startup.inc", status: "Unsubscribed", date: "2026-02-10", engagement: "None" },
  ];

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
        <button className="flex items-center gap-2 glass border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <main className="max-w-[1200px] mx-auto space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Subscribers", value: "2,048", icon: Users, color: "text-primary", trend: "+12% this week" },
            { label: "Avg Open Rate", value: "54.2%", icon: MailOpen, color: "text-purple-400", trend: "+5.1% this week" },
            { label: "Click Rate", value: "12.8%", icon: MousePointerClick, color: "text-emerald-400", trend: "Stable" },
            { label: "Unsubscribed", value: "24", icon: UserMinus, color: "text-red-400", trend: "-2% this week" },
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

        {/* Subscribers Table */}
        <div className="glass border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search emails..." 
                className="w-full bg-black border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-gray-200 placeholder:text-gray-600 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs font-semibold tracking-widest uppercase text-gray-400 hover:text-white px-3 py-1">Filter</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-black/40 text-xs uppercase tracking-widest text-gray-500 font-semibold">
                  <th className="p-4 font-medium">Subscriber</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date Added</th>
                  <th className="p-4 font-medium">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm">
                {mockSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 font-medium text-gray-200">{sub.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sub.status === 'Subscribed' ? 'bg-primary/10 text-primary border border-primary/20' :
                        sub.status === 'Bounced' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono">{sub.date}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-black border border-border/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            sub.engagement === 'High' ? 'w-full bg-primary shadow-[0_0_10px_rgba(212,255,0,0.5)]' :
                            sub.engagement === 'Medium' ? 'w-1/2 bg-purple-500' :
                            sub.engagement === 'Low' ? 'w-1/4 bg-yellow-500' : 'w-0'
                          }`} />
                        </div>
                        <span className="text-xs text-gray-500">{sub.engagement}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-border bg-surface/30 flex justify-between items-center text-xs text-gray-500">
            <span>Showing 5 of 2,048 subscribers</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-border rounded hover:bg-white/5 transition-colors disabled:opacity-50">Prev</button>
              <button className="px-3 py-1 border border-border rounded hover:bg-white/5 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

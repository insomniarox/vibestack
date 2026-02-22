import { ArrowUpRight, Users, Mail, Zap, Plus } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back.</h1>
        <p className="text-gray-400">Here is what is happening with your newsletter today.</p>
      </header>

      {/* Brutalist Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[160px]">
        
        {/* Primary Action Card (Span 2x2) */}
        <Link href="/dashboard/write" className="md:col-span-2 md:row-span-2 bg-primary text-black p-8 flex flex-col justify-between group hover:scale-[1.01] transition-transform cursor-pointer relative overflow-hidden block">
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
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">2,048</p>
            <p className="text-sm text-gray-400 mt-1">Total Subscribers</p>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface border border-border p-6 flex flex-col justify-between hover:border-gray-700 transition-colors">
          <div className="flex justify-between items-start">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1">+5.2%</span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">64.2%</p>
            <p className="text-sm text-gray-400 mt-1">Avg. Open Rate</p>
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
            <Link href="#" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="relative z-10">
            <h4 className="text-xl font-bold tracking-tight mb-1">The Future of AI Design</h4>
            <p className="text-sm text-gray-400 truncate">Published 2 days ago • Vibe: Synthetic Luxury</p>
          </div>
        </div>

      </div>
    </div>
  );
}

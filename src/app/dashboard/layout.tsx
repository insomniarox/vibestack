import Link from "next/link";
import { LayoutGrid, PenTool, Users, LogOut } from "lucide-react";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Brutalist Sidebar (Hidden on Mobile) */}
      <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col justify-between">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-7 h-7 bg-primary text-black font-bold text-lg font-mono">V</div>
            <span className="font-semibold tracking-tight text-lg">VibeStack</span>
          </Link>
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
        </div>
        <div className="p-6 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium">
            <UserButton showName appearance={{ baseTheme: dark, elements: { userButtonBox: "flex-row-reverse", userButtonOuterIdentifier: "text-white font-semibold" } }} />
          </div>
          <SignOutButton>{(
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-primary transition-colors" type="button">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}</SignOutButton>
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

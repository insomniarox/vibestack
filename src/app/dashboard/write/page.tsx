import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VibeEditor from "@/components/VibeEditor";

export default function WritePage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      
      {/* Top Navigation for Editor */}
      <div className="max-w-[1600px] mx-auto mb-6 flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono px-3 py-1 rounded-full glass text-primary">
            DRAFT
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <main className="max-w-[1600px] mx-auto">
        <VibeEditor />
      </main>
      
    </div>
  );
}

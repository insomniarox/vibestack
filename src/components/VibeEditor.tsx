"use client";

import { useState } from "react";
import { Sparkles, Image as ImageIcon, Wand2, ArrowRight, Settings2 } from "lucide-react";

export default function VibeEditor() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [vibe, setVibe] = useState("neutral");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    if (!title || !content) return alert("Title and content are required to publish!");
    setIsPublishing(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, vibe })
      });
      if (!res.ok) throw new Error("Failed to publish");
      alert("✨ Successfully published to the VibeStack!");
      setTitle("");
      setContent("");
    } catch (error) {
      console.error(error);
      alert("Publish failed. Check console.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAiAction = async (endpoint: string) => {
    if (!content) return;
    setIsAiThinking(true);
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, vibe })
      });

      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let newText = "";

      setContent(""); // Clear current content to stream the new one

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // The AI SDK sends stream chunks like `0:"text"` so we parse out the raw text for the basic UI
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              newText += JSON.parse(line.slice(2));
              setContent(newText);
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error("AI Action failed:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-[calc(100vh-140px)]">
      
      {/* Main Editor Area */}
      <div className="flex-1 glass border border-border rounded-2xl flex flex-col relative overflow-hidden">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50 backdrop-blur-md z-10">
          <input 
            type="text" 
            placeholder="Post Title..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-2xl font-bold focus:outline-none w-full placeholder:text-gray-600 font-sans"
          />
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-primary text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(212,255,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? 'Publishing...' : 'Publish'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Editor Canvas (Placeholder for Novel/TipTap) */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          <textarea 
            placeholder="Write in 4D... (Type '/' for AI commands)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-transparent text-gray-300 text-lg leading-relaxed focus:outline-none resize-none font-serif placeholder:font-sans placeholder:text-gray-700"
          />
          
          {/* Subtle Horizon Glow inside the editor */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[200px] bg-horizon/20 blur-[100px] rounded-full pointer-events-none" />
        </div>
      </div>

      {/* AI Vibe Sidebar */}
      <div className="w-full xl:w-80 glass border border-border rounded-2xl p-6 flex flex-col gap-8 overflow-y-auto">
        
        {/* Vibe Engine Selector */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Settings2 className="w-4 h-4" />
            <h3 className="text-xs font-bold tracking-widest uppercase">The Vibe Engine</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['neutral', 'aggressive', 'melancholic', 'luxury'].map((v) => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`p-3 rounded-xl text-xs font-semibold capitalize transition-all border ${
                  vibe === v 
                  ? 'bg-primary/10 border-primary/50 text-primary shadow-[0_0_10px_rgba(212,255,0,0.1)]' 
                  : 'bg-surface border-border text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-border" />

        {/* AI Actions */}
        <div>
          <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">AI Copilot</h3>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleAiAction('/api/ai/rewrite')}
              disabled={isAiThinking}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group bg-surface disabled:opacity-50"
            >
              <div className="p-2 bg-black rounded-lg group-hover:bg-primary/10 transition-colors">
                <Wand2 className={`w-4 h-4 text-primary ${isAiThinking ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-200">Rewrite</div>
                <div className="text-xs text-gray-500">Change tone & style</div>
              </div>
            </button>

            <button 
              onClick={() => handleAiAction('/api/ai/summarize')}
              disabled={isAiThinking}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group bg-surface disabled:opacity-50"
            >
              <div className="p-2 bg-black rounded-lg group-hover:bg-purple-500/10 transition-colors">
                <Sparkles className={`w-4 h-4 text-purple-400 ${isAiThinking ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-200">Summarize</div>
                <div className="text-xs text-gray-500">Generate a TL;DR</div>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group bg-surface">
              <div className="p-2 bg-black rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                <ImageIcon className="w-4 h-4 text-emerald-400 group-hover:-rotate-12 transition-transform" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-200">Generate Image</div>
                <div className="text-xs text-gray-500">AI art from context</div>
              </div>
            </button>
          </div>
        </div>

        {/* Stats / Word Count */}
        <div className="mt-auto pt-6 border-t border-border flex justify-between items-center text-xs text-gray-500 font-mono">
          <span>{content.split(/\s+/).filter(word => word.length > 0).length} WORDS</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            SAVED
          </span>
        </div>

      </div>
    </div>
  );
}

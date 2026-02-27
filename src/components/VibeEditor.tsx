"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2, ArrowRight, Settings2, Image as ImageIcon, Loader2, Lock, Unlock, X, Palette, Save, Eye } from "lucide-react";
import type { posts } from "@/db/schema";
import { getAiDailyCallLimit } from "@/lib/plan-limits";

type VibeEditorPost = typeof posts.$inferSelect;

export default function VibeEditor({ initialPost, plan }: { initialPost?: VibeEditorPost | null; plan: "hobby" | "pro" }) {
  const router = useRouter();
  const isPro = plan === "pro";
  const [title, setTitle] = useState(initialPost?.title || "");
  const [content, setContent] = useState(initialPost?.content || "");
  const [vibe, setVibe] = useState(isPro ? initialPost?.vibeTheme || "neutral" : "neutral");
  const [toneIndex, setToneIndex] = useState(1);
  const [contrastIndex, setContrastIndex] = useState(1);
  const [saturationIndex, setSaturationIndex] = useState(1);
  const toneOptions = ["cool", "neutral", "warm"] as const;
  const contrastOptions = ["low", "medium", "high"] as const;
  const saturationOptions = ["muted", "balanced", "vivid"] as const;
  const tone = toneOptions[toneIndex];
  const contrast = contrastOptions[contrastIndex];
  const saturation = saturationOptions[saturationIndex];
  const [isPaid, setIsPaid] = useState(initialPost?.isPaid || false);
  const [colorScheme, setColorScheme] = useState<{ background: string; text: string; primary: string } | null>(
    isPro && initialPost?.colorScheme ? JSON.parse(initialPost.colorScheme) : null
  );
  
  const [thinkingAction, setThinkingAction] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingColors, setIsGeneratingColors] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [aiCallsUsed, setAiCallsUsed] = useState(0);
  const [aiResetLabel, setAiResetLabel] = useState("");

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const dailyCallLimit = getAiDailyCallLimit(plan);
  const aiUsagePercent = Math.min(100, Math.round((aiCallsUsed / dailyCallLimit) * 100));

  const resetLabel = aiResetLabel || "--";

  const applyUsageFromHeaders = (res: Response) => {
    const calls = Number(res.headers.get("X-AI-Usage-Calls"));
    const resetAt = res.headers.get("X-AI-Usage-Reset");
    if (Number.isFinite(calls)) setAiCallsUsed(calls);
    if (resetAt) {
      setAiResetLabel(new Date(resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    }
  };

  const fetchAiUsage = async () => {
    try {
      const res = await fetch("/api/ai/usage");
      if (!res.ok) return;
      const data = await res.json();
      setAiCallsUsed(Number.isFinite(data.calls) ? data.calls : 0);
      if (data.resetAt) {
        setAiResetLabel(new Date(data.resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      }
    } catch {
      // ignore usage fetch errors
    }
  };

  useEffect(() => {
    fetchAiUsage();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      alert("Unsupported file type. Use PNG, JPG, GIF, or WebP.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      alert("File too large. Max 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const blob = await res.json();
      
      setContent((prev: string) => prev + (prev.length > 0 ? '\n\n' : '') + `![${file.name}](${blob.url})\n`);
      setIsDirty(true);
    } catch (err) {
      console.error(err);
      alert("Image upload failed. Check console.");
    } finally {
      setIsUploading(false);
    }
  };

  const generateColorScheme = async () => {
    if (!isPro) return;
    setIsGeneratingColors(true);
    try {
      const variationSeed = Math.floor(Math.random() * 1_000_000);
      const res = await fetch('/api/ai/colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe,
          title: title || "Untitled",
          content,
          variationSeed,
          tone,
          contrast,
          saturation,
        })
      });
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          const resetAt = data?.resetAt ? new Date(data.resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
          if (Number.isFinite(data?.calls)) setAiCallsUsed(data.calls);
          if (resetAt) setAiResetLabel(resetAt);
          alert(`Daily AI limit reached. Resets at ${resetAt}.`);
          return;
        }
        throw new Error('Failed to generate color scheme');
      }
      const data = await res.json();
      setColorScheme(data);
      setIsDirty(true);
      applyUsageFromHeaders(res);
    } catch (error) {
      console.error(error);
      alert('Failed to generate color scheme');
    } finally {
      setIsGeneratingColors(false);
      fetchAiUsage();
    }
  };

  const savePost = async (status: 'draft' | 'published') => {
    if (!title || !content) return alert(`Title and content are required to ${status}!`);
    
    if (status === 'published') setIsPublishing(true);
    else setIsSavingDraft(true);

    try {
      const method = initialPost ? 'PUT' : 'POST';
      const payloadVibe = isPro ? vibe : "neutral";
      const payloadColorScheme = isPro && colorScheme ? JSON.stringify(colorScheme) : null;
      const body = {
        ...(initialPost && { id: initialPost.id }),
        title, 
        content, 
        vibe: payloadVibe, 
        status, 
        isPaid,
        colorScheme: payloadColorScheme
      };

      const res = await fetch('/api/posts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to save ${status}`);
      }
      
      alert(status === 'published' ? "✨ Successfully published to the VibeStack!" : "💾 Draft saved successfully!");
      setIsDirty(false);
      
      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Action failed: ${message}`);
    } finally {
      setIsPublishing(false);
      setIsSavingDraft(false);
    }
  };

  const handleAiAction = async (endpoint: string, actionName: string) => {
    if (!content) return;
    setThinkingAction(actionName);
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, vibe: isPro ? vibe : "neutral" })
      });

      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => null);
          const resetAt = data?.resetAt ? new Date(data.resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
          if (Number.isFinite(data?.calls)) setAiCallsUsed(data.calls);
          if (resetAt) setAiResetLabel(resetAt);
          alert(`Daily AI limit reached. Resets at ${resetAt}.`);
          return;
        }
        const errText = await res.text();
        throw new Error(`API Error: ${res.status} - ${errText}`);
      }
      if (!res.body) throw new Error('No response body');

      applyUsageFromHeaders(res);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let newText = "";

      setContent("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        newText += decoder.decode(value, { stream: true });
        setContent(newText);
        setIsDirty(true);
      }
    } catch (error) {
      console.error("AI Action failed:", error);
    } finally {
      setThinkingAction(null);
      fetchAiUsage();
    }
  };

  return (
    <>
      <div className="flex flex-col xl:flex-row gap-6 w-full h-auto">
        
        {/* Main Editor Area */}
        <div className="flex-1 glass border border-border rounded-2xl flex flex-col relative overflow-hidden min-h-[500px] lg:min-h-[calc(100vh-140px)]">
          {/* Editor Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border bg-surface/50 backdrop-blur-md z-10 gap-4">
            <input 
              type="text" 
              placeholder="Post Title..." 
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              className="bg-transparent text-xl md:text-2xl font-bold focus:outline-none w-full placeholder:text-gray-600 font-sans"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2 md:gap-4 p-2 md:p-4 border-b border-border bg-surface/30 backdrop-blur-md z-10 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full">
            <label className="cursor-pointer text-gray-400 hover:text-white transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-white/5 shrink-0" title="Add Image">
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin xl:w-4 xl:h-4" /> : <ImageIcon className="w-5 h-5 xl:w-4 xl:h-4" />}
              <span className="hidden xl:inline ml-2 text-sm font-medium">{isUploading ? 'Uploading...' : 'Add Image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
            </label>
            
            <div className="w-px h-5 bg-border shrink-0" />
            
            <button 
              onClick={() => savePost('draft')}
              disabled={isSavingDraft || isPublishing}
              title="Save Draft"
              className="text-gray-400 hover:text-white transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 shrink-0"
            >
              {isSavingDraft ? <Loader2 className="w-5 h-5 animate-spin xl:w-4 xl:h-4" /> : <Save className="w-5 h-5 xl:w-4 xl:h-4" />}
              <span className="hidden xl:inline ml-2 text-sm font-medium">{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <div className="w-px h-5 bg-border shrink-0" />
            
            <button 
              onClick={() => setShowPreview(true)}
              title="Preview"
              className="text-gray-400 hover:text-white transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-white/5 shrink-0"
            >
              <Eye className="w-5 h-5 xl:w-4 xl:h-4" />
              <span className="hidden xl:inline ml-2 text-sm font-medium">Preview</span>
            </button>
            
            <div className="flex-1 min-w-[10px]" />
            
            <button 
              onClick={() => savePost('published')}
              disabled={isPublishing || isSavingDraft}
              className="bg-primary text-black px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,255,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed ml-auto shrink-0 whitespace-nowrap"
            >
              {isPublishing ? 'Publishing...' : (initialPost?.status === 'published' ? 'Update' : 'Publish')} <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
          
          {/* Editor Canvas */}
          <div className="flex flex-col flex-1 p-4 md:p-8 relative min-h-[400px]">
            <textarea 
              placeholder="Use Markdown for formatting"
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
              className="flex-1 w-full resize-none overflow-y-auto bg-transparent text-gray-300 text-base md:text-lg leading-relaxed focus:outline-none font-serif placeholder:font-sans placeholder:text-gray-700 relative z-10"
            />
            
            {/* Subtle Horizon Glow inside the editor */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] md:w-[500px] h-[100px] md:h-[200px] bg-horizon/20 blur-[60px] md:blur-[100px] rounded-full pointer-events-none" />
          </div>
        </div>

        {/* AI Vibe Sidebar */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Monetization / Paywall */}
          <div className="glass border border-border rounded-2xl p-4 md:p-6 flex flex-col shrink-0">
            <div className="flex items-center gap-2 mb-4 text-gray-400">
              <Lock className="w-4 h-4" />
              <h3 className="text-xs font-bold tracking-widest uppercase">Monetization</h3>
            </div>
            <button
              onClick={() => { setIsPaid(!isPaid); setIsDirty(true); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all border ${
                isPaid 
                ? 'bg-primary/10 border-primary/50 text-primary shadow-[0_0_10px_rgba(212,255,0,0.1)]' 
                : 'bg-surface border-border text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <span>{isPaid ? 'Premium Members Only' : 'Free for Everyone'}</span>
              {isPaid ? <Lock className="w-4 h-4 text-primary" /> : <Unlock className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          {/* Vibe Engine (Pro Only) */}
          {isPro && (
            <div className="glass border border-border rounded-2xl p-4 md:p-6 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Settings2 className="w-4 h-4" />
                  <h3 className="text-xs font-bold tracking-widest uppercase">The Vibe Engine</h3>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {/* Vibe Engine Selector */}
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {['neutral', 'aggressive', 'melancholic', 'luxury'].map((v) => (
                      <button
                        key={v}
                        onClick={() => { setVibe(v); setIsDirty(true); }}
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

                   {/* AI Color Scheme Generator */}
                   <div className="bg-surface/50 p-3 rounded-xl border border-border">
                     <div className="flex flex-col gap-3 mb-3">
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                           <span>Tone</span>
                           <span className="text-primary">{tone}</span>
                         </div>
                         <input
                           type="range"
                           min={0}
                           max={2}
                           step={1}
                           value={toneIndex}
                           onChange={(e) => { setToneIndex(Number(e.target.value)); setIsDirty(true); }}
                           className="w-full accent-primary"
                         />
                         <div className="flex justify-between text-[10px] text-gray-500">
                           <span>Cool</span>
                           <span>Neutral</span>
                           <span>Warm</span>
                         </div>
                       </div>
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                           <span>Contrast</span>
                           <span className="text-primary">{contrast}</span>
                         </div>
                         <input
                           type="range"
                           min={0}
                           max={2}
                           step={1}
                           value={contrastIndex}
                           onChange={(e) => { setContrastIndex(Number(e.target.value)); setIsDirty(true); }}
                           className="w-full accent-primary"
                         />
                         <div className="flex justify-between text-[10px] text-gray-500">
                           <span>Low</span>
                           <span>Medium</span>
                           <span>High</span>
                         </div>
                       </div>
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                           <span>Saturation</span>
                           <span className="text-primary">{saturation}</span>
                         </div>
                         <input
                           type="range"
                           min={0}
                           max={2}
                           step={1}
                           value={saturationIndex}
                           onChange={(e) => { setSaturationIndex(Number(e.target.value)); setIsDirty(true); }}
                           className="w-full accent-primary"
                         />
                         <div className="flex justify-between text-[10px] text-gray-500">
                           <span>Muted</span>
                           <span>Balanced</span>
                           <span>Vivid</span>
                         </div>
                       </div>
                     </div>
                     <button 
                       onClick={generateColorScheme}
                       disabled={isGeneratingColors || aiCallsUsed >= dailyCallLimit}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-black text-xs font-semibold hover:bg-white/5 transition-colors border border-border disabled:opacity-50"
                    >
                      {isGeneratingColors ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Palette className="w-4 h-4 text-primary" />
                      )}
                      {isGeneratingColors ? 'Generating colors...' : 'Generate Theme Colors'}
                    </button>

                    {colorScheme && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3 bg-black p-2 rounded-lg border border-border">
                          <div className="flex flex-1 rounded-full overflow-hidden h-6 border border-border">
                            <div style={{ backgroundColor: colorScheme.background }} className="flex-1" title="Background" />
                            <div style={{ backgroundColor: colorScheme.text }} className="flex-1" title="Text" />
                            <div style={{ backgroundColor: colorScheme.primary }} className="flex-1" title="Primary" />
                          </div>
                          <button onClick={() => { setColorScheme(null); setIsDirty(true); }} className="text-gray-500 hover:text-white transition-colors" title="Remove Color Scheme">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Miniature Vibe Preview */}
                        <div 
                          className="p-4 rounded-lg border border-border text-xs font-sans text-center transition-colors duration-500"
                          style={{ backgroundColor: colorScheme.background, color: colorScheme.text }}
                        >
                          <h4 style={{ color: colorScheme.primary }} className="font-bold text-sm mb-1 transition-colors duration-500">Email Vibe Preview</h4>
                          <p className="opacity-90">This is how your email will look to your readers.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Copilot & Stats */}
          <div className="glass border border-border rounded-2xl p-4 md:p-6 flex flex-col flex-1 shrink-0 min-h-[350px]">
            <div>
              <div className="flex items-center gap-2 mb-4 text-gray-400">
                <Wand2 className="w-4 h-4" />
                <h3 className="text-xs font-bold tracking-widest uppercase">AI Copilot</h3>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleAiAction('/api/ai/rewrite', 'rewrite')}
                  disabled={!!thinkingAction || aiCallsUsed >= dailyCallLimit}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group bg-surface disabled:opacity-50"
                >
                  <div className="p-2 bg-black rounded-lg group-hover:bg-primary/10 transition-colors">
                    {thinkingAction === 'rewrite' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-[0_0_10px_rgba(212,255,0,0.5)]" />
                    ) : (
                      <Wand2 className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-200">Rewrite</div>
                    <div className="text-xs text-gray-500">Change tone & style</div>
                  </div>
                </button>

                <button 
                  onClick={() => handleAiAction('/api/ai/summarize', 'summarize')}
                  disabled={!!thinkingAction || aiCallsUsed >= dailyCallLimit}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-all text-left group bg-surface disabled:opacity-50"
                >
                  <div className="p-2 bg-black rounded-lg group-hover:bg-primary/10 transition-colors">
                    {thinkingAction === 'summarize' ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-[0_0_10px_rgba(212,255,0,0.5)]" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-200">Summarize</div>
                    <div className="text-xs text-gray-500">Generate a TL;DR</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Daily AI Usage Meter */}
            <div className="rounded-xl border border-border bg-surface/70 p-3 mt-6 mb-4">
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
                <span>Daily AI Usage</span>
                <span>{aiCallsUsed} / {dailyCallLimit} calls</span>
              </div>
              <div className="h-2 rounded-full bg-black/60 border border-border overflow-hidden">
                <div
                  className="h-full bg-primary/80 transition-all"
                  style={{ width: `${aiUsagePercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                <span>{aiUsagePercent}% used</span>
                <span>Reset @ {resetLabel}</span>
              </div>
            </div>

            {/* Stats / Word Count */}
            <div className="pt-4 border-t border-border flex justify-between items-center text-xs text-gray-500 font-mono shrink-0">
              <span>{content.split(/\s+/).filter((word: string) => word.length > 0).length} WORDS</span>
              <span className="flex items-center gap-2">
                {isDirty ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    UNSAVED
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    SAVED
                  </>
                )}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative shadow-2xl transition-colors duration-500"
            style={{ backgroundColor: colorScheme?.background || '#050505' }}
          >
            <button 
              onClick={() => setShowPreview(false)} 
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/50 hover:text-white transition-colors border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-8">
              <div className="mb-6 flex items-center justify-center">
                <span 
                  className="text-xs font-mono font-bold tracking-widest border px-3 py-1 rounded-full uppercase"
                  style={{ color: colorScheme?.primary || '#6b7280', borderColor: colorScheme ? `${colorScheme.primary}33` : '#374151' }}
                >
                  Email Preview
                </span>
              </div>
              
              <h1 
                className="text-3xl font-bold mb-6 text-center transition-colors duration-500"
                style={{ color: colorScheme?.primary || '#D4FF00' }}
              >
                {title || 'Untitled Post'}
              </h1>
              
              <div 
                className="text-base leading-relaxed whitespace-pre-wrap font-sans transition-colors duration-500"
                style={{ color: colorScheme?.text || '#a3a3a3' }}
              >
                {content || 'Your post content will appear here...'}
              </div>
              
              <hr className="border-white/10 my-10" />
              
              <div className="text-center space-y-2">
                <p className="text-xs opacity-50 font-sans" style={{ color: colorScheme?.text || '#a3a3a3' }}>Sent via VibeStack ⚡️</p>
                <p className="text-[10px] underline cursor-pointer opacity-50 font-sans" style={{ color: colorScheme?.text || '#a3a3a3' }}>Unsubscribe</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

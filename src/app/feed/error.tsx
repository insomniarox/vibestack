"use client";

export default function FeedError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="glass border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Failed to load feed</h2>
        <p className="text-gray-400 mb-6">{error.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          className="bg-primary text-black px-6 py-2 rounded-full font-semibold hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

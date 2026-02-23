export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div className="h-10 w-48 bg-surface rounded animate-pulse" />
          <div className="h-5 w-72 bg-surface rounded mt-2 animate-pulse" />
        </header>
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass p-6 rounded-2xl border border-border animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-surface" />
                <div>
                  <div className="h-4 w-24 bg-surface rounded" />
                  <div className="h-3 w-16 bg-surface rounded mt-1" />
                </div>
              </div>
              <div className="h-7 w-3/4 bg-surface rounded mb-3" />
              <div className="h-4 w-full bg-surface rounded mb-2" />
              <div className="h-4 w-2/3 bg-surface rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

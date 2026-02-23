export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <header className="mb-10">
        <div className="h-10 w-64 bg-surface rounded" />
        <div className="h-5 w-96 bg-surface rounded mt-2" />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[160px]">
        <div className="md:col-span-2 md:row-span-2 bg-surface rounded" />
        <div className="bg-surface border border-border rounded" />
        <div className="bg-surface border border-border rounded" />
        <div className="md:col-span-2 bg-surface border border-border rounded" />
      </div>
    </div>
  );
}

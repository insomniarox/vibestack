"use client";

import { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";

type Subscriber = {
  id: number;
  email: string;
  status: string | null;
  createdAt: string;
};

export default function AudienceTable({ subscribers }: { subscribers: Subscriber[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return subscribers;
    const q = searchQuery.trim().toLowerCase();
    return subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.status || "").toLowerCase().includes(q)
    );
  }, [subscribers, searchQuery]);

  const handleExportCsv = () => {
    const header = "Email,Status,Date Added";
    const rows = subscribers.map((s) => {
      const email = `"${s.email.replace(/"/g, '""')}"`;
      const status = s.status || "pending";
      const date = s.createdAt
        ? new Date(s.createdAt).toLocaleDateString()
        : "";
      return `${email},${status},${date}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vibestack-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Export Button */}
      <div className="max-w-[1200px] mx-auto mb-8 flex items-center justify-end">
        <button
          onClick={handleExportCsv}
          disabled={subscribers.length === 0}
          className="flex items-center gap-2 glass border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Subscribers Table */}
      <div className="glass border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 text-gray-200 placeholder:text-gray-600 transition-colors"
            />
          </div>
          {searchQuery && (
            <span className="text-xs text-gray-500 font-mono">
              {filtered.length} of {subscribers.length} shown
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/40 text-xs uppercase tracking-widest text-gray-500 font-semibold">
                <th className="p-4 font-medium">Subscriber</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {filtered.length > 0 ? (
                filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-4 font-medium text-gray-200">
                      {sub.email}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          sub.status === "active"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : sub.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : sub.status === "past_due"
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}
                      >
                        {sub.status || "pending"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono">
                      {sub.createdAt
                        ? new Date(sub.createdAt).toLocaleDateString()
                        : ""}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="p-8 text-center text-gray-500"
                  >
                    {subscribers.length === 0
                      ? "No subscribers yet. Time to grow your audience!"
                      : "No subscribers match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePostButton({ id }: { id: number }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to delete");
      }
      router.refresh(); // Refresh the dashboard data
    } catch (err: any) {
      console.error(err);
      alert(`Could not delete post: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}

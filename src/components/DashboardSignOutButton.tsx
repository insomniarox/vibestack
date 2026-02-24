"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function DashboardSignOutButton() {
  return (
    <SignOutButton>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-primary transition-colors"
        type="button"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </SignOutButton>
  );
}

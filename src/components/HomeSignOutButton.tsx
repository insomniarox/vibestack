"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function HomeSignOutButton() {
  return (
    <SignOutButton>
      <button
        className="glass px-3 md:px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap hover:scale-105 transition-transform duration-200 flex items-center justify-center gap-2"
        type="button"
      >
        <LogOut className="w-4 h-4 md:hidden" />
        <span className="hidden md:inline">Sign Out</span>
      </button>
    </SignOutButton>
  );
}

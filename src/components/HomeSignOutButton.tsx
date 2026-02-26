"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function HomeSignOutButton() {
  return (
    <SignOutButton>
      <button
        className="glass px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap hover:scale-105 transition-transform duration-200"
        type="button"
      >
        Sign Out
      </button>
    </SignOutButton>
  );
}

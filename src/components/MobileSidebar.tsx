"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

export default function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    if (!mounted || !isOpen) return;
    // Add escape key listener to close sidebar
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    // Prevent scrolling on body when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, mounted]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Open Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] md:hidden flex">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Sidebar Content */}
          <div className="relative w-72 bg-[#111111] border-r border-border shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-left-full duration-300">
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full z-20 shadow-lg border border-border"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
            <div
              className="flex-1 overflow-y-auto w-full max-h-screen flex flex-col"
              onClick={(event) => {
                const target = event.target as HTMLElement | null;
                if (!target) return;
                const link = target.closest('a');
                if (link) setIsOpen(false);
              }}
            >
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

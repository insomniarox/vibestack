"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function SmokeRings() {
  const prefersReducedMotion = useReducedMotion();

  const morphingRadius = [
    "40% 60% 70% 30% / 40% 50% 60% 50%",
    "70% 30% 50% 50% / 30% 30% 70% 70%",
    "100% 60% 60% 100% / 100% 100% 60% 60%",
    "40% 60% 70% 30% / 40% 50% 60% 50%",
  ];

  if (prefersReducedMotion) {
    return (
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 pointer-events-none flex justify-center items-center mix-blend-screen opacity-40"
        style={{ contain: "layout paint style", isolation: "isolate" }}
      >
        <div className="absolute w-[350px] h-[350px] rounded-full border-[4px] border-indigo-500 blur-[12px]" />
        <div className="absolute w-[450px] h-[450px] rounded-full border-[4px] border-emerald-500 blur-[16px]" />
        <div className="absolute w-[300px] h-[300px] rounded-full border-[4px] border-purple-500 blur-[14px]" />
      </div>
    );
  }

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 pointer-events-none flex justify-center items-center mix-blend-screen opacity-80"
      style={{ contain: "layout paint style", isolation: "isolate" }}
    >
      {/* Inner Indigo Ring */}
      <motion.div
        animate={{ rotate: [0, 120, 240, 360], borderRadius: morphingRadius }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute transform-gpu w-[350px] h-[350px] border-t-[4px] border-r-[24px] border-b-[8px] border-l-[32px] border-indigo-500 blur-[12px]"
        style={{ willChange: "transform, border-radius", backfaceVisibility: "hidden" }}
      />
      {/* Outer Emerald Ring */}
      <motion.div
        animate={{ rotate: [360, 240, 120, 0], borderRadius: morphingRadius }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute transform-gpu w-[450px] h-[450px] border-t-[30px] border-r-[8px] border-b-[20px] border-l-[10px] border-emerald-500 blur-[16px]"
        style={{ willChange: "transform, border-radius", backfaceVisibility: "hidden" }}
      />
      {/* Accent Purple Ring */}
      <motion.div
        animate={{ rotate: [0, 120, 240, 360], borderRadius: morphingRadius }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute transform-gpu w-[300px] h-[300px] border-t-[12px] border-r-[35px] border-b-[6px] border-l-[20px] border-purple-500 blur-[14px]"
        style={{ willChange: "transform, border-radius", backfaceVisibility: "hidden" }}
      />
    </div>
  );
}

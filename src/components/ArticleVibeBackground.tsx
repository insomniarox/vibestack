"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ArticleVibeBackground({ 
  vibeTheme, 
  isPaid 
}: { 
  vibeTheme: string | null; 
  isPaid: boolean | null;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Base blob colors mapped from page.tsx logic
  let baseColorClass = "bg-horizon";
  let waveBorderClass = "border-horizon";

  if (vibeTheme === "luxury") {
    baseColorClass = "bg-amber-500";
    waveBorderClass = "border-amber-500";
  } else if (vibeTheme === "aggressive") {
    baseColorClass = "bg-red-500";
    waveBorderClass = "border-red-500";
  } else if (vibeTheme === "melancholic") {
    baseColorClass = "bg-blue-500";
    waveBorderClass = "border-blue-500";
  }

  // Base shapes mapped from vibe
  let waveShapeClass = "rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%]"; // default organic
  let waveRotate = [0, 90, 180, 360];

  if (vibeTheme === "melancholic") {
    waveShapeClass = "rounded-full"; // calm circles
    waveRotate = [0, 0, 0, 0];
  } else if (vibeTheme === "aggressive") {
    waveShapeClass = "rotate-45"; // diamonds
    waveRotate = [45, 135, 225, 405]; // fast spinning diamonds
  } else if (vibeTheme === "luxury") {
    waveShapeClass = "rounded-[70%_30%_50%_50%_/_30%_30%_70%_70%]"; // elegant long asymmetrical
    waveRotate = [0, -90, -180, -360];
  }

  if (!mounted) return null;

  if (prefersReducedMotion) {
    return (
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] blur-[120px] rounded-full pointer-events-none opacity-30 ${baseColorClass}`} />
    );
  }

  const waves = [0, 1, 2];
  const premiumWaves = [0.5, 1.5]; // Intermittent
  
  // Deterministic random points for sparks to avoid hydration mismatch, though we only render after mount.
  const sparks = Array.from({ length: 15 }).map((_, i) => {
    const angle = (i * 24) * (Math.PI / 180);
    const radius = 50 + (i * 12);
    const startX = Math.cos(angle) * radius;
    const startY = Math.sin(angle) * radius;
    const endX = Math.cos(angle) * (radius + 200);
    const endY = Math.sin(angle) * (radius + 200);
    const duration = 4 + (i % 4) * 2;
    const delay = (i % 5) * 0.8;
    return { startX, startY, endX, endY, duration, delay };
  });

  return (
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0 flex items-center justify-center overflow-visible"
      style={{
        maskImage: "radial-gradient(circle at center, black 10%, transparent 60%)",
        WebkitMaskImage: "radial-gradient(circle at center, black 10%, transparent 60%)"
      }}
    >
      {/* 1. Underlying Blurred Blob */}
      <div className={`absolute w-[600px] h-[400px] blur-[100px] rounded-full opacity-30 ${baseColorClass}`} />

      {/* 2. Base Vibe Waves */}
      {waves.map((i) => (
        <motion.div
          key={`wave-${i}`}
          className={`absolute w-[200px] h-[200px] border border-opacity-50 ${waveBorderClass} ${waveShapeClass}`}
          initial={{ scale: 0.2, opacity: 0, rotate: waveRotate[0] }}
          animate={{
            scale: [0.2, 1.5, 3],
            opacity: [0, 0.3, 0],
            rotate: waveRotate
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2.66
          }}
        />
      ))}

      {/* 3. Premium Intermittent Acid Green Waves & Sparks */}
      {isPaid && (
        <>
          {premiumWaves.map((i) => (
            <motion.div
              key={`premium-wave-${i}`}
              className={`absolute w-[200px] h-[200px] border-[1px] border-primary ${waveShapeClass}`}
              style={{ boxShadow: "inset 0 0 20px rgba(212,255,0,0.1), 0 0 20px rgba(212,255,0,0.1)" }}
              initial={{ scale: 0.2, opacity: 0, rotate: waveRotate[0] }}
              animate={{
                scale: [0.2, 1.5, 3],
                opacity: [0, 0.4, 0],
                rotate: waveRotate
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
                delay: i * 2.66
              }}
            />
          ))}

          {sparks.map((spark, i) => (
            <motion.div
              key={`spark-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary"
              style={{ boxShadow: "0 0 10px #D4FF00, 0 0 20px #D4FF00" }}
              initial={{ 
                x: spark.startX, 
                y: spark.startY,
                opacity: 0,
                scale: 0
              }}
              animate={{
                x: [spark.startX, spark.endX],
                y: [spark.startY, spark.endY],
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: spark.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: spark.delay
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

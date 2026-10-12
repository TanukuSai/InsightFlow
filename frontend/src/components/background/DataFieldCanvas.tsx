"use client";

import React, { useEffect, useRef, useState } from "react";

export type DotFieldStage = 1 | 2 | 3 | 4;

export interface DataFieldCanvasProps {
  scrollProgress?: number; // Continuous float from 1.0 to 4.0
  stage?: DotFieldStage;    // Discrete stage fallback
  className?: string;
  isBackground?: boolean;
  height?: string | number;
  mode?: "landing" | "ambient" | "signal-brief";
}

interface Particle {
  id: number;
  // Stage 1 coordinates & drift
  x1: number;
  y1: number;
  vx1: number;
  vy1: number;

  // Category & Styling
  categoryIndex: number; // 0: Ops, 1: Product, 2: Fraud, 3: Service, 4: Neutral Slate
  radius: number;
  pulsePhase: number;
  isKeyRiskNode: boolean;

  // Current interpolated position
  currX: number;
  currY: number;
}

// Section 4 Palette: Muted Teal (Ops), Muted Blue (Product), Muted Plum (Fraud), Muted Ochre (Service), Neutral Slate
const PALETTE_SECTION_4 = [
  { fill: "rgba(57, 135, 121, 0.88)", stroke: "rgba(230, 243, 240, 0.95)", glow: "rgba(57, 135, 121, 0.25)", name: "Operational / Muted Teal" },
  { fill: "rgba(88, 118, 184, 0.88)", stroke: "rgba(235, 241, 252, 0.95)", glow: "rgba(88, 118, 184, 0.25)", name: "Product / Muted Blue" },
  { fill: "rgba(139, 110, 155, 0.88)", stroke: "rgba(245, 240, 248, 0.95)", glow: "rgba(139, 110, 155, 0.25)", name: "Fraud / Muted Plum" },
  { fill: "rgba(181, 138, 67, 0.88)", stroke: "rgba(253, 248, 237, 0.95)", glow: "rgba(181, 138, 67, 0.25)", name: "Customer Service / Muted Ochre" },
  { fill: "rgba(114, 123, 134, 0.55)", stroke: "rgba(226, 227, 221, 0.85)", glow: "rgba(114, 123, 134, 0.12)", name: "Neutral Slate / Base" },
];

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function DataFieldCanvas({
  scrollProgress,
  stage = 1,
  className = "",
  isBackground = false,
  height,
  mode = "landing",
}: DataFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const targetProgressRef = useRef<number>(1.0);
  const currentProgressRef = useRef<number>(1.0);
  const [mounted, setMounted] = useState(false);

  // Synchronize target progress from either continuous scrollProgress (1.0 - 4.0) or discrete stage (1, 2, 3, 4)
  useEffect(() => {
    if (typeof scrollProgress === "number") {
      targetProgressRef.current = Math.max(1.0, Math.min(4.0, scrollProgress));
    } else {
      targetProgressRef.current = Math.max(1.0, Math.min(4.0, Number(stage)));
    }
  }, [scrollProgress, stage]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let heightVal = 0;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleResize = () => {
      const rect = isBackground
        ? { width: window.innerWidth, height: window.innerHeight }
        : containerRef.current?.getBoundingClientRect() || { width: 600, height: 450 };

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      heightVal = rect.height;

      canvas.width = width * dpr;
      canvas.height = heightVal * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${heightVal}px`;

      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Initialize 85 elegant, high-performance particles
    const PARTICLE_COUNT = mode === "signal-brief" ? 36 : isBackground ? (width < 640 ? 55 : 85) : 65;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      // In split hero, bias scatter toward the right half on desktop
      let initX = Math.random() * width;
      if (isBackground && width > 960) {
        initX = width * 0.44 + Math.random() * (width * 0.52);
      } else if (mode === "signal-brief") {
        initX = width * 0.25 + Math.random() * (width * 0.72);
      }
      const initY = Math.random() * (heightVal || 400);

      // Assign categories: ~55% semantic categories, ~45% neutral slate
      let cat = i % 4;
      if (i % 2 === 1 || i % 5 === 0) {
        cat = 4; // Slate neutral point to prevent rainbow clutter
      }

      return {
        id: i,
        x1: initX,
        y1: initY,
        vx1: (Math.random() - 0.5) * (prefersReducedMotion ? 0.04 : 0.35),
        vy1: (Math.random() - 0.5) * (prefersReducedMotion ? 0.04 : 0.35),
        categoryIndex: cat,
        radius: mode === "signal-brief" ? 3.2 + Math.random() * 2.8 : 3.8 + Math.random() * 4.0,
        pulsePhase: Math.random() * Math.PI * 2,
        isKeyRiskNode: cat === 2 || (cat === 0 && i % 7 === 0),
        currX: initX,
        currY: initY,
      };
    });

    let isDocumentVisible = true;
    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const render = () => {
      if (!isDocumentVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, heightVal);

      // Continuous interpolation of scroll progress
      if (prefersReducedMotion) {
        currentProgressRef.current = targetProgressRef.current;
      } else {
        const diff = targetProgressRef.current - currentProgressRef.current;
        if (Math.abs(diff) > 0.001) {
          currentProgressRef.current += diff * 0.08;
        } else {
          currentProgressRef.current = targetProgressRef.current;
        }
      }

      const p = currentProgressRef.current;
      const pts = particlesRef.current;

      // 1. Calculate continuous target coordinates for each particle
      pts.forEach((pt, idx) => {
        pt.pulsePhase += 0.02;

        // Mode: Signal Brief (Contained ambient orbital flow on Dashboard)
        if (mode === "signal-brief") {
          pt.currX += pt.vx1 * 0.7;
          pt.currY += pt.vy1 * 0.7;
          if (pt.currX < 15) { pt.currX = 15; pt.vx1 *= -1; }
          if (pt.currX > width - 15) { pt.currX = width - 15; pt.vx1 *= -1; }
          if (pt.currY < 15) { pt.currY = 15; pt.vy1 *= -1; }
          if (pt.currY > heightVal - 15) { pt.currY = heightVal - 15; pt.vy1 *= -1; }
          return;
        }

        // Mode: Landing Story (Continuous interpolation between 4 stages)
        // Stage 1 position: gentle organic drift
        pt.x1 += pt.vx1;
        pt.y1 += pt.vy1;
        if (isBackground && width > 960) {
          const minX = width * 0.44;
          const maxX = width - 25;
          if (pt.x1 < minX) { pt.x1 = minX; pt.vx1 = Math.abs(pt.vx1); }
          if (pt.x1 > maxX) { pt.x1 = maxX; pt.vx1 = -Math.abs(pt.vx1); }
        } else {
          if (pt.x1 < 15) { pt.x1 = 15; pt.vx1 *= -1; }
          if (pt.x1 > width - 15) { pt.x1 = width - 15; pt.vx1 *= -1; }
        }
        if (pt.y1 < 20) { pt.y1 = 20; pt.vy1 *= -1; }
        if (pt.y1 > heightVal - 20) { pt.y1 = heightVal - 20; pt.vy1 *= -1; }

        // Stage 2 position: Attracted into 4 dense repeat clusters
        const clusterCenterX = (width / 5) * ((pt.categoryIndex % 4) + 1);
        const clusterCenterY = heightVal * 0.48;
        const angleS2 = pt.pulsePhase * 0.35 + idx * 0.28;
        const distS2 = 26 + ((idx * 17) % 60);
        const x2 = clusterCenterX + Math.cos(angleS2) * distS2;
        const y2 = clusterCenterY + Math.sin(angleS2) * (distS2 * 0.65);

        // Stage 3 position: Distributed into 4 departmental lanes
        const channelX = (width / 5) * ((pt.categoryIndex % 4) + 1);
        const lateralSpread = ((idx * 31) % 76) - 38;
        const x3 = channelX + lateralSpread;
        const y3 = (pt.y1 * 0.4 + idx * 16 + pt.categoryIndex * 24) % Math.max(100, heightVal - 60) + 30;

        // Stage 4 position: Resolved decision constellation
        let x4: number;
        let y4: number;
        if (pt.isKeyRiskNode) {
          // Key risk nodes orbit in an attentive group
          const angleS4 = pt.pulsePhase * 0.65 + idx * 0.45;
          x4 = width * 0.52 + Math.cos(angleS4) * 140;
          y4 = heightVal * 0.42 + Math.sin(angleS4) * 75;
        } else {
          // Settled architectural lattice
          const col = idx % 10;
          const row = Math.floor(idx / 10);
          x4 = width * 0.12 + col * ((width * 0.76) / 10);
          y4 = heightVal * 0.64 + row * 22;
        }

        // Multi-stage continuous interpolation
        let targetX = pt.x1;
        let targetY = pt.y1;

        if (p < 2.0) {
          // Interpolate Stage 1 -> Stage 2
          const t = smoothStep(p - 1.0);
          targetX = lerp(pt.x1, x2, t);
          targetY = lerp(pt.y1, y2, t);
        } else if (p < 3.0) {
          // Interpolate Stage 2 -> Stage 3
          const t = smoothStep(p - 2.0);
          targetX = lerp(x2, x3, t);
          targetY = lerp(y2, y3, t);
        } else {
          // Interpolate Stage 3 -> Stage 4
          const t = smoothStep(p - 3.0);
          targetX = lerp(x3, x4, t);
          targetY = lerp(y3, y4, t);
        }

        // Smoothly glide particle toward interpolated target
        pt.currX += (targetX - pt.currX) * 0.14;
        pt.currY += (targetY - pt.currY) * 0.14;
      });

      // 2. Draw subtle proximity connecting filaments
      const filamentProgress = Math.max(0, p - 1.2); // Fades in smoothly as user scrolls past Stage 1
      if (filamentProgress > 0 || mode === "signal-brief") {
        ctx.lineWidth = 0.65;
        const maxDist = mode === "signal-brief" ? 75 : 85;
        const baseAlpha = mode === "signal-brief" ? 0.16 : Math.min(0.20, filamentProgress * 0.08);

        for (let i = 0; i < pts.length; i += 2) {
          for (let j = i + 1; j < pts.length; j += 3) {
            const sameCategory = pts[i].categoryIndex === pts[j].categoryIndex;
            const isConnected = sameCategory || p >= 3.2 || mode === "signal-brief";
            if (isConnected) {
              const dx = pts[i].currX - pts[j].currX;
              const dy = pts[i].currY - pts[j].currY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < maxDist) {
                const alpha = (1 - dist / maxDist) * baseAlpha;
                const pal = PALETTE_SECTION_4[pts[i].categoryIndex];
                ctx.strokeStyle = pal.fill.replace(/[\d.]+\)$/, `${alpha})`);
                ctx.beginPath();
                ctx.moveTo(pts[i].currX, pts[i].currY);
                ctx.lineTo(pts[j].currX, pts[j].currY);
                ctx.stroke();
              }
            }
          }
        }
      }

      // 3. Draw individual particles
      pts.forEach((pt) => {
        const pal = PALETTE_SECTION_4[pt.categoryIndex];
        const r = pt.radius + Math.sin(pt.pulsePhase) * 0.6;

        // Stage 4 Quiet Halo Ring on Key Risk Nodes
        const haloFactor = Math.max(0, p - 2.8);
        if (pt.isKeyRiskNode && haloFactor > 0) {
          const haloAlpha = Math.min(0.35, haloFactor * 0.28);
          const pulseR = r * (2.4 + Math.sin(pt.pulsePhase * 1.4) * 0.4);
          ctx.beginPath();
          ctx.arc(pt.currX, pt.currY, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(184, 61, 66, ${haloAlpha})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Luminous aura
        ctx.beginPath();
        ctx.arc(pt.currX, pt.currY, r * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = pal.glow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(pt.currX, pt.currY, r, 0, Math.PI * 2);
        ctx.fillStyle = pal.fill;
        ctx.fill();

        // Rim highlight
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // Specular reflection
        ctx.beginPath();
        ctx.arc(pt.currX - r * 0.35, pt.currY - r * 0.35, Math.max(1.0, r * 0.26), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mounted, mode]);

  if (!mounted) return null;

  if (isBackground) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height: height || "100%" }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
      />
    </div>
  );
}

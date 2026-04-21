"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  baseX: number; baseY: number;
  z: number;       // depth 0..1 — controls size + alpha
  phase: number;   // breathing phase offset
  vx: number; vy: number;
}

export default function ParticleCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let mx = 0.5, my = 0.5;
    let particles: Particle[] = [];
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function build() {
      const W = canvas!.offsetWidth;
      const H = canvas!.offsetHeight;
      canvas!.width  = W * DPR;
      canvas!.height = H * DPR;
      ctx!.scale(DPR, DPR);
      particles = [];

      const cols = Math.ceil(W / 30);
      const rows = Math.ceil(H / 30);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() > 0.6) continue; // ~40 % density
          const bx = (c + 0.5) / cols * W + (Math.random() - .5) * 10;
          const by = (r + 0.5) / rows * H + (Math.random() - .5) * 10;
          particles.push({ x: bx, y: by, baseX: bx, baseY: by, z: Math.random(), phase: Math.random() * Math.PI * 2, vx: 0, vy: 0 });
        }
      }
    }

    function tick(t: number) {
      const W = canvas!.offsetWidth;
      const H = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, W, H);

      for (const p of particles) {
        const pulse = 0.45 + 0.55 * Math.sin(t / 4000 + p.phase);
        const alpha  = (0.06 + 0.20 * p.z) * pulse;
        const r      = 0.8 + p.z * 1.4;

        // Subtle pointer drift
        const fx = (mx * W - p.baseX) / W * 0.003;
        const fy = (my * H - p.baseY) / H * 0.003;
        p.vx = p.vx * 0.90 + fx;
        p.vy = p.vy * 0.90 + fy;
        p.x  = p.baseX + p.vx * 18;
        p.y  = p.baseY + p.vy * 18;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(100,116,139,${alpha.toFixed(3)})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(tick);
    }

    build();
    raf = requestAnimationFrame(tick);

    const onResize = () => build();
    const onMouse  = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mx = (e.clientX - rect.left) / rect.width;
      my = (e.clientY - rect.top)  / rect.height;
    };

    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouse);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        opacity: 0.9,
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

// Lightweight canvas starfield with two parallax depths + faint nebula glows.
// Parallax is driven by the current camera transform via a ref the parent updates.
export interface StarfieldHandle {
  setCamera: (x: number, y: number, zoom: number) => void;
}

export default function Starfield({
  cameraRef,
}: {
  cameraRef: React.MutableRefObject<{ x: number; y: number; zoom: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; z: number; s: number; tw: number };
    let stars: Star[] = [];
    const nebulae: { x: number; y: number; r: number; c: string }[] = [];

    function seed() {
      const count = Math.min(420, Math.floor((w * h) / 4500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() < 0.7 ? 0.25 : 0.55, // depth → parallax factor
        s: Math.random() * 1.3 + 0.3,
        tw: Math.random() * Math.PI * 2,
      }));
      nebulae.length = 0;
      const palette = ["#1b2a5e", "#3a2750", "#103f3a", "#4a3a14"];
      for (let i = 0; i < 5; i++) {
        nebulae.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 320 + 220,
          c: palette[i % palette.length],
        });
      }
    }

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    let t = 0;
    function draw() {
      t += 0.008;
      const cam = cameraRef.current;
      ctx!.clearRect(0, 0, w, h);

      // nebula glows (very subtle), parallax slow
      ctx!.globalCompositeOperation = "lighter";
      for (const n of nebulae) {
        const px = (n.x + cam.x * 0.04) % (w + 600);
        const py = (n.y + cam.y * 0.04) % (h + 600);
        const g = ctx!.createRadialGradient(px, py, 0, px, py, n.r);
        g.addColorStop(0, n.c + "55");
        g.addColorStop(1, n.c + "00");
        ctx!.fillStyle = g;
        ctx!.fillRect(px - n.r, py - n.r, n.r * 2, n.r * 2);
      }

      // stars
      for (const st of stars) {
        const px = (((st.x + cam.x * st.z) % w) + w) % w;
        const py = (((st.y + cam.y * st.z) % h) + h) % h;
        const tw = 0.55 + 0.45 * Math.sin(t + st.tw);
        ctx!.globalAlpha = tw * (st.z > 0.4 ? 0.95 : 0.6);
        ctx!.fillStyle = "#e9ecf5";
        ctx!.beginPath();
        ctx!.arc(px, py, st.s, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [cameraRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

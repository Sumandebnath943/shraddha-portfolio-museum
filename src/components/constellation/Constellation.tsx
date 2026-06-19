"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import * as THREE from "three";
import Scene from "./Scene";
import MilestonePlacard from "@/components/timeline/MilestonePlacard";
import { getConstellation, PHASE_LABEL } from "@/lib/constellation-layout";
import { useConstellation } from "@/store/constellation";
import { startAmbient, stopAmbient, chime, warpSweep } from "@/lib/constellation-audio";

export default function Constellation() {
  const router = useRouter();
  const nodes = useMemo(getConstellation, []);

  const skin = useConstellation((s) => s.skin);
  const mode = useConstellation((s) => s.mode);
  const playing = useConstellation((s) => s.playing);
  const tourIndex = useConstellation((s) => s.tourIndex);
  const focusedId = useConstellation((s) => s.focusedId);
  const selected = useConstellation((s) => s.selected);
  const soundOn = useConstellation((s) => s.soundOn);
  const warping = useConstellation((s) => s.warping);
  const faceFormed = useConstellation((s) => s.faceFormed);

  const play = useConstellation((s) => s.play);
  const pause = useConstellation((s) => s.pause);
  const setTourIndex = useConstellation((s) => s.setTourIndex);
  const focus = useConstellation((s) => s.focus);
  const setSelected = useConstellation((s) => s.setSelected);
  const setSoundOn = useConstellation((s) => s.setSoundOn);
  const setWarping = useConstellation((s) => s.setWarping);

  const dark = skin === "dark";
  const c = dark
    ? { ink: "#f4f1ff", dim: "#b7b2cf", faint: "#7c7795", acc: "#f0d488", border: "#C9A227", pillBg: "rgba(17,16,26,0.7)", pillInk: "#f0d488" }
    : { ink: "#2a2417", dim: "#6e6044", faint: "#9a8a64", acc: "#7a5c18", border: "#9c7a2a", pillBg: "#2a2417", pillInk: "#f0e2c2" };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const st = useConstellation.getState();
      st.setReducedMotion(true);
      st.setMode("explore");
    }
  }, []);

  useEffect(() => {
    if (soundOn) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [soundOn]);

  // tour auto-advance
  useEffect(() => {
    if (!playing || mode !== "tour") return;
    if (useConstellation.getState().soundOn) chime((tourIndex * 2) % 12);
    const id = window.setTimeout(() => {
      const st = useConstellation.getState();
      if (st.tourIndex >= nodes.length - 1) {
        st.pause();
        st.setMode("explore");
      } else {
        st.setTourIndex(st.tourIndex + 1);
      }
    }, 4200);
    return () => window.clearTimeout(id);
  }, [playing, tourIndex, mode, nodes.length]);

  const enterMuseum = () => {
    const st = useConstellation.getState();
    if (st.soundOn) warpSweep();
    setWarping(true);
    // gather to sun → swirl into portal → fly through → load
    window.setTimeout(() => router.push("/museum"), 1950);
  };

  const current = nodes[Math.max(0, Math.min(nodes.length - 1, tourIndex))];
  const activeId = mode === "tour" ? current?.m.id : focusedId;
  const fullscreen = playing || warping; // particles gone, spiral takes the screen

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: dark ? "#06060e" : "#ece2cd" }}>
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 0, 80], fov: 55, near: 0.1, far: 400 }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* ── overlay chrome (clicks pass through to the sky except on controls) ── */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{ opacity: warping ? 0 : 1, transition: "opacity 0.4s" }}>
        {/* top bar — fades in once the portrait has formed */}
        <div
          className="absolute inset-x-0 top-0 flex items-start justify-end p-6 sm:p-8"
          style={{ opacity: faceFormed ? 1 : 0, transition: "opacity 0.7s" }}
        >
          <div className="pointer-events-auto flex items-center gap-2">
            <IconBtn onClick={() => setSoundOn(!soundOn)} title={soundOn ? "Sound on" : "Sound off"} c={c}>
              {soundOn ? "♪" : "✕"}
            </IconBtn>
            <button
              onClick={enterMuseum}
              style={{ background: c.pillBg, color: c.pillInk, border: `1px solid ${c.border}88`, fontSize: 11, letterSpacing: "0.14em", padding: "9px 16px", borderRadius: 999 }}
            >
              ENTER THE MUSEUM →
            </button>
          </div>
        </div>

        {/* name / designation — fades in beneath the portrait once it has formed */}
        <div
          className="absolute left-8 sm:left-12"
          style={{ bottom: "13%", maxWidth: 380, opacity: faceFormed && !fullscreen ? 1 : 0, transition: "opacity 0.7s" }}
        >
          <h1 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 46, lineHeight: 0.96, color: c.ink, margin: 0 }}>
            Shraddha Sonel
          </h1>
          <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: c.acc, margin: "12px 0 0" }}>
            Multidisciplinary Designer
          </p>
          <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 16, lineHeight: 1.5, color: c.dim, margin: "10px 0 0", maxWidth: 330 }}>
            Brand identity, print, social, marketing &amp; information design — Pune, India.
          </p>
        </div>

        {/* tour caption */}
        <AnimatePresence mode="wait">
          {mode === "tour" && current && (
            <motion.div
              key={current.m.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-x-0 bottom-28 text-center"
            >
              <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, letterSpacing: "0.2em", color: dark ? current.hue : current.hueLight }}>
                {PHASE_LABEL[current.m.phase]} · {current.m.dates}
              </p>
              <h2 style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: 34, color: c.ink, margin: "6px 0 0" }}>
                {current.m.title}
              </h2>
              <p style={{ fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 16, color: c.dim, margin: "4px 0 0" }}>
                {current.m.tagline}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* bottom control rail — appears with the chart */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center gap-4 p-6 sm:p-8"
          style={{ opacity: faceFormed ? 1 : 0, transition: "opacity 0.7s" }}
        >
          <button
            className="pointer-events-auto"
            onClick={() => (playing ? pause() : play())}
            aria-label={playing ? "Pause tour" : "Play tour"}
            style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${c.border}88`, color: c.acc, background: c.pillBg, fontSize: 13 }}
          >
            {playing ? "❚❚" : "▸"}
          </button>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: c.faint }}>2014</span>
          <div className="pointer-events-auto flex flex-1 items-center justify-between" style={{ maxWidth: 520 }}>
            {nodes.map((n, i) => {
              const on = activeId === n.m.id;
              return (
                <button
                  key={n.m.id}
                  title={n.m.title}
                  onClick={() => {
                    setTourIndex(i);
                    focus(n.m.id);
                  }}
                  style={{
                    width: on ? 11 : 7,
                    height: on ? 11 : 7,
                    borderRadius: 999,
                    background: on ? (dark ? n.hue : n.hueLight) : "transparent",
                    border: `1px solid ${dark ? n.hue : n.hueLight}`,
                    transition: "all 0.3s",
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: c.faint }}>NOW</span>
        </div>
      </div>

      {/* hyperspace flash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.98), rgba(255,236,198,0.5) 28%, rgba(255,255,255,0) 64%)",
          opacity: warping ? 1 : 0,
          transform: warping ? "scale(1.15)" : "scale(0.05)",
          transition: "opacity 1.7s ease-in, transform 1.9s cubic-bezier(0.6,0,0.9,1)",
        }}
      />

      <MilestonePlacard
        item={selected}
        onClose={() => {
          focus(null);
          setSelected(null);
        }}
      />
    </div>
  );
}

function IconBtn({ children, onClick, title, c }: { children: React.ReactNode; onClick: () => void; title: string; c: { border: string; acc: string; pillBg: string } }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${c.border}88`, color: c.acc, background: c.pillBg, fontSize: 14 }}
    >
      {children}
    </button>
  );
}

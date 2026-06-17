"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls, AdaptiveDpr, BakeShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import Link from "next/link";
import type { PointerLockControls as PLC } from "three-stdlib";
import Architecture from "./Architecture";
import Player from "./Player";
import Exhibit, { ExhibitPicker } from "./Exhibit";
import Decor, { DECOR_FILES } from "./Decor";
import Kiosk from "./Kiosk";
import MuseumPlacard from "./MuseumPlacard";
import { getPlacements } from "@/lib/museum-layout";
import { getExhibits } from "@/content";
import { useMuseum } from "@/store/museum";

function Scene() {
  const placements = useMemo(() => getPlacements(), []);
  return (
    <>
      <color attach="background" args={["#0e0d10"]} />
      <fogExp2 attach="fog" args={["#15120e", 0.012]} />

      {/* low, moody ambient — dim but readable; spotlights add the bright pools */}
      <ambientLight intensity={0.52} color="#fff1da" />
      <hemisphereLight intensity={0.5} color="#fff6ea" groundColor="#6b6358" />
      {/* dim key for soft grounding shadows (baked once) */}
      <directionalLight
        position={[8, 15, 10]}
        intensity={0.55}
        color="#fff1d8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* central path glow down the nave + entrance (the lit walkway). Forward
          rendering evaluates every light on every fragment, so this is kept to a
          lean set (perf): a few well-spaced warm lamps, entrance one softer so it
          doesn't blow out the title wall. */}
      {[16, 2, -14, -30, -46, -60].map((z, i) => (
        <pointLight
          key={i}
          position={[0, 4.3, z]}
          intensity={z > 13 ? 14 : 30}
          distance={20}
          decay={2}
          color="#ffd9a0"
        />
      ))}

      <Architecture />
      <Decor />
      <Kiosk />
      {placements.map((p) => (
        <Exhibit key={p.exhibit.slug} p={p} />
      ))}
      <ExhibitPicker />
      <Player />
      <BakeShadows />
    </>
  );
}

export default function Museum() {
  const controls = useRef<PLC>(null);
  const [locked, setLocked] = useState(false);
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const entered = useMuseum((s) => s.entered);
  const setEntered = useMuseum((s) => s.setEntered);
  const nearby = useMuseum((s) => s.nearby);
  const selected = useMuseum((s) => s.selected);
  const setSelected = useMuseum((s) => s.setSelected);
  const nearKiosk = useMuseum((s) => s.nearKiosk);
  const kioskOpen = useMuseum((s) => s.kioskOpen);
  const setKioskOpen = useMuseum((s) => s.setKioskOpen);
  const seatIndex = useMuseum((s) => s.seatIndex);
  const seated = useMuseum((s) => s.seated);
  const autoPanning = useMuseum((s) => s.autoPanning);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // Preload every exhibit image up front so the walk is hitch-free (no
  // textures streaming in while you move). Warms THREE's cache; the in-scene
  // TextureLoader calls then resolve instantly.
  useEffect(() => {
    THREE.Cache.enabled = true;
    const imgUrls = getExhibits().flatMap((e) =>
      e.image ? [e.image.thumb, e.image.full] : [],
    );
    const total = imgUrls.length + DECOR_FILES.length;
    if (total === 0) {
      setReady(true);
      return;
    }
    let done = 0;
    let cancelled = false;
    const imgLoader = new THREE.ImageLoader();
    const gltfLoader = new GLTFLoader();
    const tick = () => {
      if (cancelled) return;
      done += 1;
      setProgress(done / total);
      if (done >= total) setReady(true);
    };
    // Preload every exhibit image AND every decor model up front, so once the
    // visitor enters nothing streams in mid-walk (drei's useGLTF.preload, fired
    // from Decor's module import, warms the same browser cache in parallel).
    imgUrls.forEach((u) => imgLoader.load(u, tick, undefined, tick));
    DECOR_FILES.forEach((u) => gltfLoader.load(u, tick, undefined, tick));
    return () => {
      cancelled = true;
    };
  }, []);

  // click while locked + aimed at an exhibit → open its placard
  useEffect(() => {
    const onDown = () => {
      const st = useMuseum.getState();
      if (locked && st.nearby && !st.selected && !st.nearKiosk) {
        setSelected(st.nearby);
        controls.current?.unlock();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [locked, setSelected]);

  // press E while standing at the kiosk → open the download panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const st = useMuseum.getState();
      if (locked && st.nearKiosk && !st.kioskOpen && !st.selected) {
        setKioskOpen(true);
        controls.current?.unlock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, setKioskOpen]);

  const closeKiosk = () => {
    setKioskOpen(false);
    controls.current?.lock();
  };

  const enter = () => {
    if (!ready && !entered) return; // wait until everything is preloaded
    setEntered(true);
    controls.current?.lock();
  };
  const closePlacard = () => {
    setSelected(null);
    controls.current?.lock();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg)]">
      <Canvas
        shadows="soft"
        dpr={[1, 1.6]}
        camera={{ fov: 72, near: 0.1, far: 250 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <PointerLockControls
          ref={controls}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.28} luminanceThreshold={0.72} luminanceSmoothing={0.22} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.34} />
          <SMAA />
        </EffectComposer>
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* crosshair */}
      {locked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div
            className={`h-1.5 w-1.5 rounded-full transition-all ${
              nearby || nearKiosk ? "scale-150 bg-[var(--gold-bright)]" : "bg-white/60"
            }`}
          />
          {(nearby || nearKiosk || (seatIndex !== null && seated === null)) && (
            <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[0.65rem] tracking-[0.25em] text-[var(--gold-bright)] uppercase">
              {nearKiosk
                ? "Press E · Downloads"
                : nearby
                  ? "Click to view"
                  : "Press E · Sit"}
            </span>
          )}
        </div>
      )}

      {/* top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--bg-2)]/70 px-4 py-2 text-xs tracking-wider text-[var(--ink-dim)] uppercase backdrop-blur transition-colors hover:text-[var(--ink)]"
        >
          ← Timeline
        </Link>
        <p
          className="signage text-sm text-[var(--ink)]"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)" }}
        >
          Shraddha Sonel
        </p>
      </div>

      {/* bottom hint — context aware */}
      {locked && (
        <p
          className="eyebrow pointer-events-none absolute inset-x-0 bottom-6 z-10 text-center text-[var(--ink-dim)]"
          style={{ textShadow: "0 1px 12px rgba(0,0,0,0.95)" }}
        >
          {seated !== null ? (
            autoPanning ? (
              <>Admiring the room &nbsp;·&nbsp; Move the mouse to look around &nbsp;·&nbsp; E or W A S D · Stand</>
            ) : (
              <>Seated &nbsp;·&nbsp; Hold still and the view will pan &nbsp;·&nbsp; E or W A S D · Stand</>
            )
          ) : (
            <>W A S D · Move &nbsp;·&nbsp; Mouse · Look &nbsp;·&nbsp; Click · View &nbsp;·&nbsp; E · Sit / Kiosk &nbsp;·&nbsp; Esc · Release</>
          )}
        </p>
      )}

      {/* mobile / touch guard — pointer-lock FPS controls need a desktop */}
      {isTouch && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[var(--bg)]/92 px-8 text-center backdrop-blur">
          <p className="eyebrow">A note from the curator</p>
          <h1 className="signage text-2xl text-[var(--ink)]">Shraddha Sonel</h1>
          <p className="display max-w-sm text-xl italic text-[var(--ink-dim)]">
            The walkable museum is built for a mouse &amp; keyboard. For the full first-person
            experience, please visit on a desktop. The timeline is fully touch-friendly.
          </p>
          <Link
            href="/"
            className="rounded-full bg-[var(--gold)] px-7 py-3 text-sm tracking-[0.18em] text-[var(--bg)] uppercase"
          >
            ← Back to the Timeline
          </Link>
        </div>
      )}

      {/* enter / resume gate */}
      {!isTouch && !selected && !locked && !kioskOpen && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[var(--bg)]/82 text-center backdrop-blur-sm">
          <p className="eyebrow">{entered ? "Paused" : "Now Open"}</p>
          <h1 className="signage text-3xl text-[var(--ink)] sm:text-4xl">Shraddha Sonel</h1>
          <p className="display max-w-md px-6 text-xl italic text-[var(--ink-dim)]">
            {entered
              ? "Click to resume your walk through the galleries."
              : "A walkable museum of brand identity, print, social, marketing & information design."}
          </p>
          {entered || ready ? (
            <button
              id="lock-trigger"
              onClick={enter}
              className="rounded-full bg-[var(--gold)] px-8 py-3.5 text-sm tracking-[0.18em] text-[var(--bg)] uppercase transition-transform hover:scale-[1.04]"
            >
              {entered ? "Resume" : "Enter the Museum"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-px w-56 overflow-hidden bg-[var(--hairline)]">
                <div
                  className="h-full bg-[var(--gold)] transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="eyebrow">Preparing the galleries · {Math.round(progress * 100)}%</p>
            </div>
          )}
          {(entered || ready) && (
            <p className="eyebrow opacity-70">Move with WASD · Look with the mouse</p>
          )}
        </div>
      )}

      {/* kiosk download panel */}
      {kioskOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg)]/80 px-6 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--hairline)] bg-[var(--bg-2)]/95 p-8 text-center shadow-2xl">
            <button
              onClick={closeKiosk}
              aria-label="Close"
              className="absolute right-4 top-4 text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)]"
            >
              ✕
            </button>
            <p className="eyebrow">Download Centre</p>
            <h2 className="signage mt-1 text-2xl text-[var(--ink)]">Shraddha Sonel</h2>
            <p className="display mt-2 text-base italic text-[var(--ink-dim)]">
              Take a copy with you.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href="/resume.pdf"
                download
                className="flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3.5 text-sm tracking-[0.16em] text-[var(--bg)] uppercase transition-transform hover:scale-[1.03]"
              >
                ↓ Download Résumé
              </a>
              <a
                href="/portfolio.pdf"
                download
                className="flex items-center justify-center gap-2 rounded-full border border-[var(--gold)] px-7 py-3.5 text-sm tracking-[0.16em] text-[var(--gold-bright)] uppercase transition-colors hover:bg-[var(--gold)]/10"
              >
                ↓ Download Portfolio
              </a>
            </div>
            <button
              onClick={closeKiosk}
              className="eyebrow mt-6 text-[var(--ink-dim)] underline-offset-4 transition-colors hover:text-[var(--ink)] hover:underline"
            >
              Back to the galleries
            </button>
          </div>
        </div>
      )}

      <MuseumPlacard onClose={closePlacard} />
    </div>
  );
}

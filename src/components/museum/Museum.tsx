"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PointerLockControls, AdaptiveDpr, BakeShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import Link from "next/link";
import type { PointerLockControls as PLC } from "three-stdlib";
import Architecture from "./Architecture";
import Player from "./Player";
import Exhibit, { ExhibitPicker, SpotlightPool } from "./Exhibit";
import Decor, { DECOR_FILES } from "./Decor";
import Kiosk from "./Kiosk";
import Assistant, { ASSISTANT_URL } from "./Assistant";
import AssistantChat from "./AssistantChat";
import GuideMenu from "./GuideMenu";
import MuseumPlacard from "./MuseumPlacard";
import { getPlacements } from "@/lib/museum-layout";
import { getExhibits } from "@/content";
import { useMuseum } from "@/store/museum";

// Mounts only once everything inside <Suspense> has resolved (all GLB models
// loaded). It then precompiles the scene's shaders against the current lights —
// including the spotlight pool — and signals ready a couple of frames later, so
// the "Enter" button never appears (and you never drop in) mid-load.
function SceneReady({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    gl.compile(scene, camera);
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

function Scene({ onReady }: { onReady: () => void }) {
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
      <Assistant />
      {placements.map((p) => (
        <Exhibit key={p.exhibit.slug} p={p} />
      ))}
      <SpotlightPool placements={placements} />
      <ExhibitPicker />
      <Player />
      <BakeShadows />
      <SceneReady onReady={onReady} />
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
  const freeLook = useMuseum((s) => s.freeLook);
  const setFreeLook = useMuseum((s) => s.setFreeLook);
  // Pointer Lock is unavailable in some contexts (embedded preview panes, certain
  // permissions policies). Detect it up front; if blocked we enter in a no-lock
  // "free look" mode (steer with the cursor) so the museum is always reachable.
  const [pointerLockOK] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      const fp = (document as Document & { featurePolicy?: { allowsFeature(f: string): boolean } }).featurePolicy;
      if (fp && typeof fp.allowsFeature === "function") return fp.allowsFeature("pointer-lock");
    } catch {
      /* ignore */
    }
    return typeof document.body.requestPointerLock === "function";
  });
  const nearby = useMuseum((s) => s.nearby);
  const selected = useMuseum((s) => s.selected);
  const setSelected = useMuseum((s) => s.setSelected);
  const nearKiosk = useMuseum((s) => s.nearKiosk);
  const kioskOpen = useMuseum((s) => s.kioskOpen);
  const setKioskOpen = useMuseum((s) => s.setKioskOpen);
  const chatOpen = useMuseum((s) => s.chatOpen);
  const setChatOpen = useMuseum((s) => s.setChatOpen);
  const seatIndex = useMuseum((s) => s.seatIndex);
  const seated = useMuseum((s) => s.seated);
  const autoPanning = useMuseum((s) => s.autoPanning);
  const [ready, setReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [progress, setProgress] = useState(0);
  // white "bridge" from the landing's burst-to-white → fades out on first mount so
  // the (light) cover appears to fade in cinematically on the white screen.
  const [bridge, setBridge] = useState(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBridge(false));
    return () => cancelAnimationFrame(id);
  }, []);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  // the museum is only truly enterable once BOTH the assets are fetched (the
  // progress bar) AND the 3D scene has mounted + precompiled its shaders.
  const fullyReady = ready && sceneReady;
  // "in the museum" = pointer locked OR free-look fallback engaged
  const active = locked || freeLook;

  // Preload every exhibit image up front so the walk is hitch-free (no
  // textures streaming in while you move). Warms THREE's cache; the in-scene
  // TextureLoader calls then resolve instantly.
  useEffect(() => {
    THREE.Cache.enabled = true;
    const imgUrls = getExhibits().flatMap((e) =>
      e.image ? [e.image.thumb, e.image.full] : [],
    );
    const gltfUrls = [...DECOR_FILES, ASSISTANT_URL];
    const total = imgUrls.length + gltfUrls.length;
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
    gltfUrls.forEach((u) => gltfLoader.load(u, tick, undefined, tick));
    return () => {
      cancelled = true;
    };
  }, []);

  // click while active + aimed at an exhibit → open its placard
  useEffect(() => {
    const onDown = () => {
      const st = useMuseum.getState();
      if ((locked || st.freeLook) && st.nearby && !st.selected && !st.nearKiosk) {
        setSelected(st.nearby);
        if (pointerLockOK) controls.current?.unlock();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [locked, setSelected, pointerLockOK]);

  // press E while standing at the kiosk → open the download panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useMuseum.getState();
      // Esc closes the chat and RESUMES the walk. The re-lock must happen right
      // here in the keydown gesture — if deferred to an effect the browser has
      // already dropped the user-activation and refuses pointer lock, dumping
      // you on the pause gate (the bug). Closing it here keeps you in the museum.
      if (e.code === "Escape") {
        if (st.chatOpen) {
          e.preventDefault();
          st.setChatOpen(false);
          st.setSpeaking(false);
          st.setListening(false);
          st.setBubble("");
          if (pointerLockOK) controls.current?.lock();
        }
        return;
      }
      // C summons the guide + opens the chat (works while the pointer is locked)
      if (e.code === "KeyC") {
        if (!st.chatOpen && !st.selected && !st.kioskOpen) setChatOpen(true);
        return;
      }
      // V opens the chat and starts listening — ask the guide by voice
      if (e.code === "KeyV") {
        if (!st.chatOpen && !st.selected && !st.kioskOpen) {
          setChatOpen(true);
          st.setListening(true);
        }
        return;
      }
      if (e.code !== "KeyE") return;
      if ((locked || st.freeLook) && st.nearKiosk && !st.kioskOpen && !st.selected) {
        setKioskOpen(true);
        if (pointerLockOK) controls.current?.unlock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, setKioskOpen, setChatOpen, pointerLockOK]);

  // opening the chat releases the pointer (so the visitor can type); closing
  // it re-locks and resumes the walk. (No-op when pointer lock is unavailable;
  // free-look pauses via the chatOpen "frozen" check in Player.)
  useEffect(() => {
    if (!pointerLockOK) return;
    if (chatOpen) controls.current?.unlock();
    else if (entered) controls.current?.lock();
  }, [chatOpen, entered, pointerLockOK]);

  const closeKiosk = () => {
    setKioskOpen(false);
    if (pointerLockOK) controls.current?.lock();
  };

  const enter = () => {
    if (!fullyReady && !entered) return; // wait until everything is fully loaded
    setEntered(true);
    if (pointerLockOK) controls.current?.lock();
    else setFreeLook(true); // no pointer lock here → enter in cursor-steer mode
  };
  const closePlacard = () => {
    setSelected(null);
    if (pointerLockOK) controls.current?.lock();
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
          <Scene onReady={onSceneReady} />
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
      {active && (
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
      {active && (
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
          ) : freeLook ? (
            <>W A S D · Move &nbsp;·&nbsp; Move cursor to the edges · Look &nbsp;·&nbsp; Click · View &nbsp;·&nbsp; E · Sit / Kiosk &nbsp;·&nbsp; C · Ask</>
          ) : (
            <>W A S D · Move &nbsp;·&nbsp; Mouse · Look &nbsp;·&nbsp; Click · View &nbsp;·&nbsp; E · Sit / Kiosk &nbsp;·&nbsp; C · Ask &nbsp;·&nbsp; V · Speak &nbsp;·&nbsp; Esc · Release</>
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

      {/* enter / resume gate — LIGHT, fully opaque cover page */}
      {!isTouch && !selected && !active && !kioskOpen && !chatOpen && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          // starts at the SAME white as the landing burst, then warms to parchment —
          // a smooth colour transformation, so there is no white→cream jump.
          style={{ background: bridge ? "#ffffff" : "#ece2cd", transition: "background-color 2.1s ease-out" }}
        >
          <div
            className="flex flex-col items-center justify-center gap-6 text-center"
            // the cover materialises out of the white (blur → sharp), Venom-style
            style={{
              opacity: bridge ? 0 : 1,
              transform: bridge ? "scale(0.985)" : "none",
              filter: bridge ? "blur(9px)" : "blur(0px)",
              transition:
                "opacity 1.6s ease-out 0.6s, transform 1.6s ease-out 0.6s, filter 1.6s ease-out 0.6s",
            }}
          >
            <p className="eyebrow" style={{ color: "#9a8a64" }}>{entered ? "Paused" : "Now Open"}</p>
            <h1 className="signage text-3xl sm:text-4xl" style={{ color: "#2a2417" }}>
              Shraddha Sonel
            </h1>
            <p className="display max-w-md px-6 text-xl italic" style={{ color: "#6e6044" }}>
              {entered
                ? "Click to resume your walk through the galleries."
                : "A walkable museum of brand identity, print, social, marketing & information design."}
            </p>
            {entered || fullyReady ? (
              <button
                id="lock-trigger"
                onClick={enter}
                className="rounded-full px-8 py-3.5 text-sm tracking-[0.18em] uppercase transition-transform hover:scale-[1.04]"
                style={{ background: "#9c7a2a", color: "#fdf6e3" }}
              >
                {entered ? "Resume" : "Enter the Museum"}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-px w-56 overflow-hidden" style={{ background: "#cabfa6" }}>
                  <div
                    className="h-full transition-[width] duration-300 ease-out"
                    style={{ width: `${ready ? 100 : Math.round(progress * 100)}%`, background: "#9c7a2a" }}
                  />
                </div>
                <p className="eyebrow" style={{ color: "#9a8a64" }}>
                  {ready
                    ? "Building the galleries · almost there"
                    : `Preparing the galleries · ${Math.round(progress * 100)}%`}
                </p>
              </div>
            )}
            {(entered || fullyReady) && (
              <p className="eyebrow opacity-70" style={{ color: "#9a8a64" }}>
                Move with WASD · Look with the mouse
              </p>
            )}
          </div>
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

      {entered && <AssistantChat />}
      {entered && <GuideMenu />}

      <MuseumPlacard onClose={closePlacard} />
    </div>
  );
}

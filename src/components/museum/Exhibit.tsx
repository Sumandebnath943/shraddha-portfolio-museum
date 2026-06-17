"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ExhibitPlacement } from "@/lib/museum-layout";
import { WALL_H, ART_CENTER_Y } from "@/lib/museum-layout";
import { interactables, playerPos, useMuseum } from "@/store/museum";

const MAX_H = 1.62;
const MAX_W = 2.05;
// printed wall-label ("tombstone") card dimensions
const LABEL_W = 0.62;
const LABEL_H = 0.34;

// Shared soft "spotlight wash" texture — an always-present warm pool on the
// wall behind every frame, so each piece reads as lit even from a distance
// (cheaper than keeping 28 live spotlights on at once).
let poolTexCache: THREE.CanvasTexture | null = null;
function getPoolTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (poolTexCache) return poolTexCache;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 104, 8, 128, 132, 130);
  g.addColorStop(0, "rgba(255,244,221,0.95)");
  g.addColorStop(0.45, "rgba(255,235,198,0.34)");
  g.addColorStop(1, "rgba(255,235,198,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  poolTexCache = new THREE.CanvasTexture(c);
  poolTexCache.colorSpace = THREE.SRGBColorSpace;
  return poolTexCache;
}
const CEILING_LOCAL_Y = WALL_H - ART_CENTER_Y; // ceiling height in group space
// track-light: hangs just under the ceiling, set forward of the wall, tilted
// so its -Y (lens) axis points straight at the artwork centre (group origin).
const fixtureZ = 1.2;
const fixtureY = CEILING_LOCAL_Y - 0.28;
const fixtureTilt = Math.atan2(fixtureZ, fixtureY);

export default function Exhibit({ p }: { p: ExhibitPlacement }) {
  const { exhibit: e, pos, rotationY, accent } = p;
  const img = e.image;
  const aspect = img?.aspect ?? 1.333;

  // frame dimensions
  let h = MAX_H;
  let w = h * aspect;
  if (w > MAX_W) {
    w = MAX_W;
    h = w / aspect;
  }

  const poolTex = useMemo(getPoolTexture, []);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const canvasRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  // only mount this exhibit's spotlight when the visitor is near (perf: keeps
  // the number of active lights low instead of all 28 at once)
  const litRef = useRef(false);
  const [lit, setLit] = useState(false);

  const worldPos = useRef(new THREE.Vector3(pos[0], pos[1], pos[2]));

  // thumb as an instant placeholder, then full-res straight away (textures are
  // preloaded behind the entry screen, so this is a warm-cache hit — no mid-walk swap)
  useEffect(() => {
    if (!img) return;
    const loader = new THREE.TextureLoader();
    let disposed = false;
    const apply = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      if (matRef.current) {
        matRef.current.map = tex;
        matRef.current.needsUpdate = true;
      }
    };
    loader.load(img.thumb, (tex) => {
      if (disposed) return;
      apply(tex);
      loader.load(img.full, (full) => {
        if (!disposed) apply(full);
      });
    });
    return () => {
      disposed = true;
    };
  }, [img]);

  // register for centre-screen raycast picking
  useEffect(() => {
    const mesh = canvasRef.current;
    if (!mesh) return;
    interactables.set(e.slug, mesh);
    return () => {
      interactables.delete(e.slug);
    };
  }, [e.slug]);

  // assign spotlight target (re-runs when the light (re)mounts on approach)
  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, [lit]);

  useFrame(() => {
    const dist = playerPos.distanceTo(worldPos.current);
    const near = dist < 7;
    // cull the light when far (with hysteresis); generous range so a whole bay
    // reads as lit in the moody scene
    const want = dist < (litRef.current ? 26 : 24);
    if (want !== litRef.current) {
      litRef.current = want;
      setLit(want);
    }
    // spotlight pool: bright base, brightens further as you approach
    if (spotRef.current) {
      const t = THREE.MathUtils.clamp(1 - (dist - 3) / 14, 0.7, 1);
      spotRef.current.intensity = THREE.MathUtils.lerp(spotRef.current.intensity, 30 * t, 0.07);
    }
    // gentle frame emphasis when in range
    if (groupRef.current) {
      const target = near ? 1.012 : 1;
      const s = THREE.MathUtils.lerp(groupRef.current.scale.x, target, 0.1);
      groupRef.current.scale.setScalar(s);
    }
  });

  if (!img) return null;

  return (
    <group ref={groupRef} position={pos} rotation={[0, rotationY, 0]}>
      {/* always-on soft spotlight wash on the wall behind the piece */}
      {poolTex && (
        <mesh position={[0, 0.2, -0.16]}>
          <planeGeometry args={[w + 0.95, h + 2.2]} />
          <meshBasicMaterial
            map={poolTex}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* gilded gold frame */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[w + 0.26, h + 0.26, 0.06]} />
        <meshStandardMaterial color="#bd9542" roughness={0.34} metalness={0.9} />
      </mesh>
      {/* cream mat */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[w + 0.13, h + 0.13]} />
        <meshStandardMaterial color="#f4f1e9" roughness={0.9} />
      </mesh>
      {/* artwork */}
      <mesh ref={canvasRef} position={[0, 0, 0.026]} userData={{ slug: e.slug }}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial ref={matRef} roughness={0.6} metalness={0} toneMapped />
      </mesh>

      {/* ceiling track-light: hangs from the ceiling in front of the piece and
          tilts back at it — the barrel/lens visibly aim where the pool falls.
          fixtureTilt aligns the head's -Y axis with the (fixture → art) vector. */}
      <group position={[0, fixtureY, fixtureZ]} rotation={[fixtureTilt, 0, 0]}>
        {/* stem to the ceiling */}
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 8]} />
          <meshStandardMaterial color="#141417" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* barrel */}
        <mesh castShadow>
          <cylinderGeometry args={[0.072, 0.092, 0.26, 18]} />
          <meshStandardMaterial color="#17171b" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* glowing lens at the bottom, facing the art */}
        <mesh position={[0, -0.135, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.066, 20]} />
          <meshStandardMaterial color="#fff3da" emissive="#ffe6b0" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      </group>

      {/* dedicated spotlight pool — emitted from the fixture, only mounted near */}
      {lit && (
        <>
          <spotLight
            ref={spotRef}
            position={[0, fixtureY, fixtureZ]}
            angle={0.4}
            penumbra={0.55}
            distance={11}
            intensity={14}
            color={"#fff3df"}
            castShadow={false}
          />
          <object3D ref={targetRef} position={[0, 0, 0]} />
        </>
      )}

      {/* wall label — a printed "tombstone" card mounted on the wall beside the
          piece, the way galleries actually do it: a small pale panel with crisp
          dark sans-serif text (high contrast, clear hierarchy). Placed to the
          lower-right of the frame at a comfortable reading height. */}
      <group position={[w / 2 + 0.18 + LABEL_W / 2, -h / 2 + LABEL_H / 2 - 0.02, 0.02]}>
        {/* card stock, very slightly proud of the wall */}
        <mesh castShadow>
          <boxGeometry args={[LABEL_W, LABEL_H, 0.012]} />
          <meshStandardMaterial color="#f7f4ec" roughness={0.92} metalness={0} />
        </mesh>
        {/* thin accent rule down the left edge */}
        <mesh position={[-LABEL_W / 2 + 0.018, 0, 0.008]}>
          <boxGeometry args={[0.01, LABEL_H - 0.05, 0.004]} />
          <meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} />
        </mesh>
        <Text
          position={[-LABEL_W / 2 + 0.05, LABEL_H / 2 - 0.055, 0.011]}
          fontSize={0.058}
          maxWidth={LABEL_W - 0.09}
          lineHeight={1.08}
          color="#1f1d18"
          anchorX="left"
          anchorY="top"
          textAlign="left"
        >
          {e.title}
        </Text>
        <Text
          position={[-LABEL_W / 2 + 0.05, -LABEL_H / 2 + 0.085, 0.011]}
          fontSize={0.036}
          letterSpacing={0.04}
          color="#6a6052"
          anchorX="left"
          anchorY="middle"
          textAlign="left"
        >
          {e.category}
        </Text>
        <Text
          position={[-LABEL_W / 2 + 0.05, -LABEL_H / 2 + 0.045, 0.011]}
          fontSize={0.036}
          letterSpacing={0.04}
          color="#9a9388"
          anchorX="left"
          anchorY="middle"
          textAlign="left"
        >
          {String(e.year)}
        </Text>
      </group>
    </group>
  );
}

// Centre-screen raycaster: sets the nearby exhibit (for the crosshair prompt).
export function ExhibitPicker() {
  const setNearby = useMuseum((s) => s.setNearby);
  const ray = useRef(new THREE.Raycaster());
  const center = new THREE.Vector2(0, 0);

  useFrame(({ camera }) => {
    ray.current.setFromCamera(center, camera);
    const meshes = Array.from(interactables.values());
    const hits = ray.current.intersectObjects(meshes, false);
    const hit = hits.find((h) => h.distance < 8);
    setNearby((hit?.object.userData.slug as string) ?? null);
  });
  return null;
}

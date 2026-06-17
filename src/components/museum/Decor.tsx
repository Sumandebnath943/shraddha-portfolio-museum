"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DECOR, type DecorItem } from "@/lib/museum-layout";

// CC0 decor props (plants, statues, a classical column) sourced from poly.pizza.
// Provenance lives in src/lib/decor-credits.ts — courtesy only, never rendered.
// Every model is preloaded at module import (i.e. while the page is loading),
// so nothing streams in once the visitor is walking the galleries.
const USED_SLUGS = Array.from(new Set(DECOR.map((d) => d.slug)));
export const DECOR_FILES = USED_SLUGS.map((s) => `/models/${s}.glb`);
DECOR_FILES.forEach((f) => useGLTF.preload(f));

const PLINTH_H = 0.9;

// Shared soft contact-shadow blob — a cheap, baked-looking dark radial decal we
// lay on the floor under props so they read as grounded. Far cheaper than real
// dynamic shadow casting (no per-frame shadow map), which keeps the scene fast.
let contactCache: THREE.CanvasTexture | null = null;
export function getContactShadow(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (contactCache) return contactCache;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.6, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  contactCache = new THREE.CanvasTexture(c);
  return contactCache;
}

export function ContactShadow({ radius, y = 0.02 }: { radius: number; y?: number }) {
  const tex = useMemo(getContactShadow, []);
  if (!tex) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0.9} />
    </mesh>
  );
}

function DecorModel({ item }: { item: DecorItem }) {
  const { scene } = useGLTF(`/models/${item.slug}.glb`);

  // Normalise: each GLB has an arbitrary scale/origin. Clone it, measure its
  // bounding box, scale so it stands `item.height` tall, then drop its base to
  // y=0 and centre it on x/z. The outer group then places it in the room.
  const normalized = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = item.height / (size.y || 1);
    clone.position.set(-center.x, -box.min.y, -center.z);
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.setScalar(s);
    return wrapper;
  }, [scene, item.height]);

  return (
    <group position={item.pos} rotation={[0, item.rotationY ?? 0, 0]}>
      {/* grounding shadow on the floor below (account for pedestal lift) */}
      <ContactShadow radius={Math.max(0.35, item.height * 0.28)} y={-item.pos[1] + 0.02} />
      {item.onPedestal && (
        <group position={[0, -PLINTH_H / 2, 0]}>
          {/* simple stone plinth so statues read as gallery objects */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, PLINTH_H, 0.7]} />
            <meshStandardMaterial color="#e7e3d8" roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[0, PLINTH_H / 2 - 0.02, 0]} receiveShadow>
            <boxGeometry args={[0.8, 0.05, 0.8]} />
            <meshStandardMaterial color="#d8d3c5" roughness={0.8} metalness={0} />
          </mesh>
        </group>
      )}
      <primitive object={normalized} />
    </group>
  );
}

export default function Decor() {
  return (
    <group>
      {DECOR.map((item, i) => (
        <DecorModel key={i} item={item} />
      ))}
    </group>
  );
}

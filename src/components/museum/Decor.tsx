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

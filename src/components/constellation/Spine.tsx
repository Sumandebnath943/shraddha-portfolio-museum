"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { getSpineCurve, SKIN } from "@/lib/constellation-layout";
import { glowTexture } from "./textures";
import { env } from "@/store/constellation";
import type { SkinName } from "@/lib/constellation-layout";

const COUNT = 16;

export default function Spine({ skin, reduced }: { skin: SkinName; reduced: boolean }) {
  const curve = useMemo(getSpineCurve, []);
  const pts = useMemo(() => curve.getSpacedPoints(180), [curve]);
  const pal = SKIN[skin];
  const group = useRef<THREE.Group>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null);
  const offsets = useMemo(() => Array.from({ length: COUNT }, (_, i) => i / COUNT), []);
  const tex = useMemo(glowTexture, []);
  const lineBase = skin === "dark" ? 0.3 : 0.45;
  const flowBase = skin === "dark" ? 0.9 : 0.6;

  useFrame(() => {
    const k = env.bgLight;
    if (group.current) {
      const base = reduced ? 0 : performance.now() * 0.00004;
      group.current.children.forEach((child, i) => {
        const t = (offsets[i] + base) % 1;
        child.position.copy(curve.getPointAt(t));
        const mat = (child as THREE.Sprite).material as THREE.SpriteMaterial;
        if (mat) mat.opacity = flowBase * k;
      });
    }
    if (lineRef.current?.material) {
      lineRef.current.material.opacity = lineBase * k;
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={pts}
        color={pal.spine}
        lineWidth={skin === "dark" ? 1.1 : 0.9}
        transparent
        opacity={lineBase}
      />
      <group ref={group}>
        {offsets.map((_, i) => (
          <sprite key={i} scale={[0.34, 0.34, 1]}>
            <spriteMaterial
              map={tex}
              color={pal.spineLit}
              blending={skin === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending}
              transparent
              opacity={skin === "dark" ? 0.9 : 0.6}
              depthWrite={false}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

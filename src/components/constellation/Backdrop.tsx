"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Sparkles, Line } from "@react-three/drei";
import * as THREE from "three";
import { nebulaTexture, parchmentTexture, glowTexture } from "./textures";
import { getBounds } from "@/lib/constellation-layout";
import { env } from "@/store/constellation";
import type { SkinName } from "@/lib/constellation-layout";

export default function Backdrop({ skin, reduced }: { skin: SkinName; reduced: boolean }) {
  return skin === "dark" ? <CosmosBackdrop reduced={reduced} /> : <AtlasBackdrop />;
}

function CosmosBackdrop({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const glow = useMemo(glowTexture, []);
  // nebula clouds spread across the WHOLE frame (incl. corners) so nothing reads
  // as dead black — varied cool/warm tints, parallaxed behind the spiral.
  const neb = useMemo(
    () => [
      { p: [-16, 7, -16] as [number, number, number], c: "rgb(86,64,150)", s: 46, o: 0.5 },
      { p: [17, 9, -18] as [number, number, number], c: "rgb(120,54,96)", s: 42, o: 0.4 },
      { p: [20, -8, -20] as [number, number, number], c: "rgb(28,104,112)", s: 52, o: 0.46 },
      { p: [-19, -9, -22] as [number, number, number], c: "rgb(40,70,140)", s: 48, o: 0.4 },
      { p: [-2, 13, -24] as [number, number, number], c: "rgb(70,52,128)", s: 40, o: 0.32 },
      { p: [4, -14, -24] as [number, number, number], c: "rgb(30,96,103)", s: 44, o: 0.34 },
      { p: [0, 0, -14] as [number, number, number], c: "rgb(150,110,60)", s: 30, o: 0.18 },
    ],
    [],
  );
  useFrame((_, dt) => {
    if (ref.current) {
      if (!reduced) ref.current.rotation.z += dt * 0.006;
      // dim the nebula while the particle "sun" is present; bloom back on Play
      ref.current.children.forEach((child, i) => {
        const mat = (child as THREE.Sprite).material as THREE.SpriteMaterial;
        if (mat) mat.opacity = neb[i].o * env.bgLight;
      });
    }
  });
  return (
    <>
      <Stars radius={120} depth={70} count={reduced ? 2200 : 7000} factor={3.2} saturation={0} fade speed={reduced ? 0 : 0.4} />
      <Stars radius={60} depth={25} count={reduced ? 120 : 420} factor={7} saturation={0.25} fade speed={reduced ? 0 : 0.7} />
      {!reduced && <Sparkles count={120} scale={[70, 46, 24]} size={2.4} speed={0.28} opacity={0.5} color="#fff7e6" />}
      <group ref={ref}>
        {neb.map((n, i) => (
          <sprite key={i} position={n.p} scale={[n.s, n.s, 1]}>
            <spriteMaterial map={i === neb.length - 1 ? glow : nebulaTexture(n.c)} color={i === neb.length - 1 ? "#ffd9a0" : "#ffffff"} blending={THREE.AdditiveBlending} transparent opacity={n.o} depthWrite={false} />
          </sprite>
        ))}
      </group>
    </>
  );
}

function circlePts(cx: number, cy: number, r: number, z: number, seg = 96): [number, number, number][] {
  const a: [number, number, number][] = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r, z]);
  }
  return a;
}

function AtlasBackdrop() {
  const { center, radius } = useMemo(getBounds, []);
  const rings = useMemo(
    () => [0.42, 0.72, 1.0, 1.24, 1.5].map((f) => circlePts(center.x, center.y, radius * f, -0.6)),
    [center, radius],
  );
  const spokes = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      lines.push([
        [center.x, center.y, -0.6],
        [center.x + Math.cos(a) * radius * 1.5, center.y + Math.sin(a) * radius * 1.5, -0.6],
      ]);
    }
    return lines;
  }, [center, radius]);
  // faint decorative background constellations to fill the parchment like a real atlas
  const decos = useMemo(() => {
    const out: [number, number, number][][] = [];
    const seeds = [
      [-22, 10], [23, 12], [-24, -11], [25, -9], [-15, 16], [16, -16],
    ];
    seeds.forEach(([cx, cy]) => {
      const pts: [number, number, number][] = [];
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        pts.push([cx + (Math.random() - 0.5) * 7, cy + (Math.random() - 0.5) * 6, -1.5]);
      }
      out.push(pts);
    });
    return out;
  }, []);
  const ink = useMemo(() => {
    const arr = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 64;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 44;
      arr[i * 3 + 2] = -2 - Math.random() * 4;
    }
    return arr;
  }, []);

  return (
    <>
      <mesh position={[center.x, center.y, -8]}>
        <planeGeometry args={[96, 60]} />
        <meshBasicMaterial map={parchmentTexture()} toneMapped={false} depthWrite={false} />
      </mesh>
      {spokes.map((s, i) => (
        <Line key={`sp${i}`} points={s} color="#4a3f2b" lineWidth={0.6} transparent opacity={0.09} />
      ))}
      {rings.map((r, i) => (
        <Line key={`r${i}`} points={r} color="#4a3f2b" lineWidth={0.7} transparent opacity={0.13} />
      ))}
      {decos.map((d, i) => (
        <Line key={`d${i}`} points={d} color="#6b5d44" lineWidth={0.6} transparent opacity={0.22} />
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ink, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#5c4f37" size={0.08} sizeAttenuation transparent opacity={0.55} />
      </points>
    </>
  );
}

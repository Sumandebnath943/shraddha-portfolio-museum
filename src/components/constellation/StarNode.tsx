"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { glowTexture, coreTexture } from "./textures";
import { useConstellation, env } from "@/store/constellation";
import type { SkinName, StarNode as Node } from "@/lib/constellation-layout";

function ringPts(r: number, seg = 56): [number, number, number][] {
  const a: [number, number, number][] = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    a.push([Math.cos(t) * r, Math.sin(t) * r, 0]);
  }
  return a;
}

export default function StarNode({
  node,
  skin,
  reduced,
}: {
  node: Node;
  skin: SkinName;
  reduced: boolean;
}) {
  const glowRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Sprite>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const focusedId = useConstellation((s) => s.focusedId);
  const focus = useConstellation((s) => s.focus);
  const setSelected = useConstellation((s) => s.setSelected);
  const setHovered = useConstellation((s) => s.setHovered);
  const isFocused = focusedId === node.m.id;

  const glow = useMemo(glowTexture, []);
  const core = useMemo(coreTexture, []);
  const color = skin === "dark" ? node.hue : node.hueLight;
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const dark = skin === "dark";
  const baseGlow = node.size * (dark ? 3.4 : 1.9);
  const big = node.size >= 1.05;
  const rays = useMemo(() => {
    if (dark || !big) return [];
    const out: [number, number, number][][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.39;
      out.push([
        [Math.cos(a) * node.size * 0.7, Math.sin(a) * node.size * 0.7, 0],
        [Math.cos(a) * node.size * 2.1, Math.sin(a) * node.size * 2.1, 0],
      ]);
    }
    return out;
  }, [dark, big, node.size]);
  const sats = useMemo(
    () => Array.from({ length: Math.min(node.exhibits.length, 6) }, (_, i) => i),
    [node.exhibits.length],
  );

  const glowBase = dark ? 0.9 : 0.22;
  useFrame(() => {
    const t = performance.now() * 0.001;
    const k = env.bgLight; // fade milestones in with the chart, dim under the particle sun
    if (glowRef.current) {
      const pulse = reduced ? 1 : 1 + 0.06 * Math.sin(t * 1.4 + phase);
      const s = baseGlow * pulse * (hover ? 1.25 : 1);
      glowRef.current.scale.set(s, s, 1);
      (glowRef.current.material as THREE.SpriteMaterial).opacity = glowBase * k;
    }
    if (coreRef.current) {
      (coreRef.current.material as THREE.SpriteMaterial).opacity = k;
    }
    if (orbitRef.current && !reduced) orbitRef.current.rotation.z += 0.01;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    setHovered(node.m.id);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    setHover(false);
    setHovered(null);
    document.body.style.cursor = "auto";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    focus(node.m.id);
    setSelected(node);
  };

  const right = node.pos.x >= 0; // label points OUTWARD into the open field, away from the ring centre
  const showLabel = hover; // spiral is the secondary element now → labels on hover only

  return (
    <group position={node.pos}>
      <sprite ref={glowRef} scale={[baseGlow, baseGlow, 1]}>
        <spriteMaterial
          map={glow}
          color={color}
          blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
          transparent
          opacity={dark ? 0.9 : 0.22}
          depthWrite={false}
        />
      </sprite>
      {dark ? (
        <sprite ref={coreRef} scale={[node.size * 1.1, node.size * 1.1, 1]}>
          <spriteMaterial
            map={core}
            color="#ffffff"
            blending={THREE.AdditiveBlending}
            transparent
            opacity={1}
            depthWrite={false}
          />
        </sprite>
      ) : (
        <>
          <mesh>
            <circleGeometry args={[node.size * 0.5, 28]} />
            <meshBasicMaterial color="#C9A227" toneMapped={false} />
          </mesh>
          <mesh position={[node.size * -0.12, node.size * 0.12, 0.01]}>
            <circleGeometry args={[node.size * 0.2, 20]} />
            <meshBasicMaterial color="#f5ead0" toneMapped={false} />
          </mesh>
          <Line points={ringPts(node.size * 1.4)} color={color} lineWidth={1} transparent opacity={0.65} />
          {rays.map((r, i) => (
            <Line key={`ray${i}`} points={r} color="#b08a2e" lineWidth={0.8} transparent opacity={0.7} />
          ))}
        </>
      )}
      <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <sphereGeometry args={[Math.max(0.7, node.size * 1.5), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {isFocused && sats.length > 0 && (
        <group ref={orbitRef}>
          {sats.map((i) => {
            const a = (i / sats.length) * Math.PI * 2;
            const rr = node.size * 2.7;
            return (
              <sprite key={i} position={[Math.cos(a) * rr, Math.sin(a) * rr, 0]} scale={[0.5, 0.5, 1]}>
                <spriteMaterial
                  map={glow}
                  color={color}
                  blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
                  transparent
                  opacity={0.85}
                  depthWrite={false}
                />
              </sprite>
            );
          })}
        </group>
      )}
      <Html position={[right ? node.size * 1.1 : -node.size * 1.1, 0, 0]} style={{ pointerEvents: "none" }} zIndexRange={[16, 0]}>
        <div
          style={{
            display: "flex",
            flexDirection: right ? "row" : "row-reverse",
            alignItems: "center",
            gap: 8,
            transform: `translate(${right ? "0" : "-100%"}, -50%)`,
            opacity: showLabel ? 1 : 0,
            transition: "opacity 0.45s ease",
          }}
        >
          <span style={{ flexShrink: 0, width: hover ? 22 : 13, height: 1, background: color, transition: "width 0.3s" }} />
          <div style={{ textAlign: right ? "left" : "right", maxWidth: 150 }}>
            <div
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 15,
                lineHeight: 1.1,
                color: dark ? "#f4f1ff" : "#2a2417",
                textShadow: dark ? "0 1px 12px rgba(0,0,0,0.92)" : "none",
              }}
            >
              {node.m.title}
            </div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: dark ? "#9aa0ad" : "#6e6044",
                marginTop: 2,
              }}
            >
              {node.m.dates}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

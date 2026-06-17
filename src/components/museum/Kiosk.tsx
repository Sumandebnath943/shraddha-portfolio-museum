"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { KIOSK } from "@/lib/museum-layout";
import { playerPos, useMuseum } from "@/store/museum";

// Free-standing info kiosk (modelled after the reference): dark monolith with a
// base plate and an angled, glowing screen near the top. Proximity sets a store
// flag so the HTML download panel can appear.
function makeScreenTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101015";
  ctx.fillRect(0, 0, c.width, c.height);
  // subtle vertical sheen
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#c9a24b";
  ctx.font = "600 30px Georgia, serif";
  ctx.fillText("SHRADDHA SONEL", c.width / 2, 96);
  ctx.fillStyle = "#8b8678";
  ctx.font = "500 17px Helvetica, Arial, sans-serif";
  ctx.fillText("D O W N L O A D   C E N T R E", c.width / 2, 132);
  // two "buttons"
  const btn = (y: number, label: string) => {
    ctx.strokeStyle = "rgba(201,162,75,0.7)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(201,162,75,0.10)";
    ctx.beginPath();
    ctx.roundRect(56, y, c.width - 112, 70, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#efe9da";
    ctx.font = "600 26px Helvetica, Arial, sans-serif";
    ctx.fillText(label, c.width / 2, y + 45);
  };
  btn(230, "↓  Résumé");
  btn(326, "↓  Portfolio");
  ctx.fillStyle = "#6d6a60";
  ctx.font = "500 16px Helvetica, Arial, sans-serif";
  ctx.fillText("walk up &  press  E", c.width / 2, 456);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function Kiosk() {
  const screenTex = useMemo(makeScreenTexture, []);
  const setNearKiosk = useMuseum((s) => s.setNearKiosk);
  const kioskWorld = useRef(new THREE.Vector3(KIOSK.pos[0], 1, KIOSK.pos[2]));

  useFrame(() => {
    const d = Math.hypot(playerPos.x - KIOSK.pos[0], playerPos.z - KIOSK.pos[2]);
    setNearKiosk(d < 2.8);
  });

  const dark = "#16161b";
  return (
    <group position={KIOSK.pos} rotation={[0, KIOSK.rotationY, 0]}>
      {/* base plate */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.06, 0.5]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* slim upright body */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 1.12, 0.3]} />
        <meshStandardMaterial color={dark} roughness={0.42} metalness={0.55} />
      </mesh>
      {/* angled head holding the screen (tilted back ~16°) */}
      <group position={[0, 1.32, 0.02]} rotation={[-0.28, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.62, 0.1]} />
          <meshStandardMaterial color={dark} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* glowing screen on the front (+z) face */}
        <mesh position={[0, 0, 0.051]}>
          <planeGeometry args={[0.42, 0.54]} />
          <meshStandardMaterial
            map={screenTex ?? undefined}
            emissive="#ffffff"
            emissiveMap={screenTex ?? undefined}
            emissiveIntensity={0.85}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* soft glow the screen casts forward */}
      <pointLight position={[0, 1.32, 0.4]} intensity={2.2} distance={2.4} decay={2} color="#cdb98a" />
    </group>
  );
}

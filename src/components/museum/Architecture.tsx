"use client";

import { useEffect, useMemo } from "react";
import { MeshReflectorMaterial, Text } from "@react-three/drei";
import * as THREE from "three";
import {
  WALLS,
  WALL_H,
  WALL_T,
  FLOOR_BOUNDS,
  WING_SIGNS,
  BENCHES,
  CARPETS,
  type Seg,
} from "@/lib/museum-layout";
import { wingById } from "@/content";

// Subtle coffered-panel ceiling texture — light & architectural, never loud.
function makeCeilingTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d9d5cb";
  ctx.fillRect(0, 0, 256, 256);
  // recessed panel: soft inner shadow + a thin darker border groove
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 150);
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(120,112,98,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(10, 10, 236, 236);
  ctx.strokeStyle = "rgba(120,112,98,0.30)";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 244);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, 236, 236);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Shared transform for anything that runs along a wall segment.
function segTransform(seg: Seg) {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  return {
    len: Math.hypot(dx, dz) + WALL_T,
    cx: (seg.x1 + seg.x2) / 2,
    cz: (seg.z1 + seg.z2) / 2,
    rotY: -Math.atan2(dz, dx),
  };
}

function WallMesh({ seg }: { seg: Seg }) {
  const { len, cx, cz, rotY } = segTransform(seg);
  return (
    <mesh position={[cx, WALL_H / 2, cz]} rotation={[0, rotY, 0]} castShadow receiveShadow>
      <boxGeometry args={[len, WALL_H, WALL_T]} />
      <meshStandardMaterial color="#ece8de" roughness={0.95} metalness={0} />
    </mesh>
  );
}

// Ornamental crown molding (cornice) where every wall meets the ceiling — a
// stepped white profile, modelled after the reference. Runs along each wall on
// both faces, so all the room corners read as trimmed plaster cornice.
function CrownMolding({ seg }: { seg: Seg }) {
  const { len, cx, cz, rotY } = segTransform(seg);
  const white = "#f4f1ea";
  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {/* widest band right under the ceiling */}
      <mesh position={[0, WALL_H - 0.12, 0]} castShadow>
        <boxGeometry args={[len, 0.24, WALL_T + 0.26]} />
        <meshStandardMaterial color={white} roughness={0.85} metalness={0} />
      </mesh>
      {/* middle dentil-ish step */}
      <mesh position={[0, WALL_H - 0.34, 0]}>
        <boxGeometry args={[len, 0.14, WALL_T + 0.16]} />
        <meshStandardMaterial color="#eae6dc" roughness={0.9} metalness={0} />
      </mesh>
      {/* small bead at the bottom of the run */}
      <mesh position={[0, WALL_H - 0.46, 0]}>
        <boxGeometry args={[len, 0.07, WALL_T + 0.08]} />
        <meshStandardMaterial color={white} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

export default function Architecture() {
  const fw = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
  const fd = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;
  const fcx = (FLOOR_BOUNDS.x0 + FLOOR_BOUNDS.x1) / 2;
  const fcz = (FLOOR_BOUNDS.z0 + FLOOR_BOUNDS.z1) / 2;

  // ceiling light-cove strips down the nave + bays
  const coves = useMemo(
    () => [
      // nave runs
      ...Array.from({ length: 10 }, (_, i) => ({
        pos: [0, WALL_H - 0.06, 11 - i * 8] as [number, number, number],
        size: [1.7, 0.04, 0.55] as [number, number, number],
      })),
    ],
    [],
  );

  const ceilTex = useMemo(makeCeilingTexture, []);
  useEffect(() => {
    if (ceilTex) ceilTex.repeat.set(Math.max(1, Math.round(fw / 4.5)), Math.max(1, Math.round(fd / 4.5)));
  }, [ceilTex, fw, fd]);

  return (
    <group>
      {/* polished reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[fcx, 0, fcz]} receiveShadow>
        <planeGeometry args={[fw, fd]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1.2}
          mixStrength={2.4}
          blur={[300, 90]}
          roughness={0.68}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#42424a"
          metalness={0.52}
          mirror={0}
        />
      </mesh>

      {/* ceiling — subtle coffered texture */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[fcx, WALL_H, fcz]} receiveShadow>
        <planeGeometry args={[fw, fd]} />
        <meshStandardMaterial color="#ffffff" map={ceilTex ?? undefined} roughness={1} />
      </mesh>

      {/* floor rugs */}
      {CARPETS.map((c, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.pos[0], c.pos[1], c.pos[2]]} receiveShadow>
            <planeGeometry args={[c.size[0] + 0.45, c.size[1] + 0.45]} />
            <meshStandardMaterial color="#5f4e30" roughness={0.95} metalness={0} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.pos[0], c.pos[1] + 0.002, c.pos[2]]} receiveShadow>
            <planeGeometry args={c.size} />
            <meshStandardMaterial color="#2a211b" roughness={1} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* light coves (emissive strips) */}
      {coves.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <boxGeometry args={c.size} />
          <meshStandardMaterial
            color="#fff6e6"
            emissive="#ffe9c4"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* walls */}
      {WALLS.map((seg, i) => (
        <WallMesh key={i} seg={seg} />
      ))}

      {/* ornamental crown molding around every wall-to-ceiling corner */}
      {WALLS.map((seg, i) => (
        <CrownMolding key={`c${i}`} seg={seg} />
      ))}

      {/* minimal seating benches */}
      {BENCHES.map((b, i) => (
        <group key={i} position={b.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color="#26221d" roughness={0.55} metalness={0.1} />
          </mesh>
          <mesh position={[0, b.size[1] / 2 + 0.013, 0]} receiveShadow>
            <boxGeometry args={[b.size[0] + 0.06, 0.026, b.size[2] + 0.06]} />
            <meshStandardMaterial color="#3a342c" roughness={0.42} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* entrance: architectural typography on the title wall (z≈24).
          High-contrast dark lettering on the pale wall — the gallery-vinyl look,
          no muddy outline halo. Columns/statues/plants (Decor) fill the hall. */}
      <group position={[0, 0, 23.7]} rotation={[0, Math.PI, 0]}>
        <Text
          position={[0, 3.05, 0]}
          fontSize={0.86}
          letterSpacing={0.16}
          color="#1b1a17"
          anchorX="center"
          anchorY="middle"
        >
          SHRADDHA SONEL
        </Text>
        <mesh position={[0, 2.52, 0]}>
          <boxGeometry args={[6.6, 0.02, 0.02]} />
          <meshStandardMaterial color="#b9962f" metalness={0.7} roughness={0.35} emissive="#5e4a12" emissiveIntensity={0.25} />
        </mesh>
        <Text
          position={[0, 2.24, 0]}
          fontSize={0.205}
          letterSpacing={0.4}
          color="#4a443a"
          anchorX="center"
          anchorY="middle"
        >
          THE DESIGN MUSEUM · A MULTIDISCIPLINARY PRACTICE
        </Text>
      </group>

      {/* wing nameplates — large gallery-vinyl headers: solid dark serif title,
          thin gold rule, spaced caption. Readable from across the bay. */}
      {WING_SIGNS.map(({ wing, pos, rotationY }) => {
        const w = wingById[wing];
        return (
          <group key={wing} position={pos} rotation={[0, rotationY, 0]}>
            <Text
              position={[0, 0.26, 0.02]}
              fontSize={0.52}
              letterSpacing={0.02}
              color="#211f1a"
              anchorX="center"
              anchorY="middle"
              font={undefined}
            >
              {w.name}
            </Text>
            <mesh position={[0, -0.08, 0.02]}>
              <boxGeometry args={[Math.min(w.name.length * 0.34, 3.6), 0.015, 0.01]} />
              <meshStandardMaterial color="#b9962f" metalness={0.7} roughness={0.35} />
            </mesh>
            <Text
              position={[0, -0.34, 0.02]}
              fontSize={0.145}
              letterSpacing={0.26}
              color="#5a5346"
              anchorX="center"
              anchorY="middle"
            >
              {w.subtitle.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

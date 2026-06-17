"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { ASSISTANT } from "@/lib/museum-layout";
import { playerPos, useMuseum } from "@/store/museum";

export const ASSISTANT_URL = "/models/assistant.glb";
useGLTF.preload(ASSISTANT_URL);

// Roles we drive the avatar with, matched loosely against whatever the GLB's
// clips are actually named (Tripo/Mixamo exports vary: "Walk", "Armature|Walk",
// "Look around", etc.). First clip whose name contains the keyword wins.
const ROLE_KEYWORDS: Record<string, string[]> = {
  idle: ["idle"],
  walk: ["walk"],
  greet: ["greet", "wave", "hello"],
  bow: ["bow"],
  wait: ["wait", "stand"],
  look: ["look"],
};

type Mode = "patrol" | "pause" | "greet";

export default function Assistant() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ASSISTANT_URL);
  const { actions } = useAnimations(animations, group);

  // normalise the model: scale to ASSISTANT.height, drop base to y=0, centre x/z
  const norm = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = ASSISTANT.height / (size.y || 1);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false; // skinned bounds can be wrong → keep visible
      // Tripo ships KHR_materials_volume/transmission, which forces a per-frame
      // refraction pass (very expensive, stacks with the reflective floor).
      // Neutralise it — she renders opaque, no transmission pass.
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const pm = m as THREE.MeshPhysicalMaterial;
        if ("transmission" in pm) {
          pm.transmission = 0;
          pm.thickness = 0;
          pm.transparent = false;
          pm.needsUpdate = true;
        }
      }
    });
    return { s, offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s) };
  }, [scene]);

  // resolve role → clip name once
  const clips = useMemo(() => {
    const names = animations.map((a) => a.name);
    const map: Record<string, string | null> = {};
    for (const role in ROLE_KEYWORDS) {
      map[role] =
        names.find((n) => ROLE_KEYWORDS[role].some((k) => n.toLowerCase().includes(k))) ?? null;
    }
    return { names, map };
  }, [animations]);

  const hasAnims = clips.names.length > 0;
  const hasWalk = !!clips.map.walk;

  useEffect(() => {
    // one-time visibility into what the GLB actually shipped with
    console.info(
      `[Assistant] ${clips.names.length} clip(s):`,
      clips.names.length ? clips.names.join(", ") : "NONE (re-export from Tripo with animations)",
    );
  }, [clips]);

  // crossfade helper
  const current = useRef<string | null>(null);
  const play = (role: string, opts?: { once?: boolean }) => {
    const name = clips.map[role];
    if (!name || !actions[name] || current.current === name) return;
    const next = actions[name]!;
    const prev = current.current ? actions[current.current] : null;
    next.reset();
    if (opts?.once) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    next.fadeIn(0.3).play();
    prev?.fadeOut(0.3);
    current.current = name;
  };

  // navigation / behaviour state (refs to avoid per-frame React churn)
  const mode = useRef<Mode>("patrol");
  const target = useRef(1); // index into ASSISTANT.path
  const dir = useRef(1); // ping-pong direction
  const pauseUntil = useRef(0);
  const greeted = useRef(false);
  const bowed = useRef(false);
  const [posSet, setPosSet] = useState(false);

  useEffect(() => {
    if (group.current && !posSet) {
      group.current.position.set(...ASSISTANT.home);
      group.current.rotation.y = 0; // tuned below via FORWARD; faces the entrance
      setPosSet(true);
    }
  }, [posSet]);

  // start in idle/static
  useEffect(() => {
    if (hasAnims) play(clips.map.idle ? "idle" : Object.keys(ROLE_KEYWORDS)[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnims]);

  const tmpDir = useRef(new THREE.Vector3());
  const faceTowards = (g: THREE.Group, tx: number, tz: number, dt: number) => {
    const yaw = Math.atan2(tx - g.position.x, tz - g.position.z) + ASSISTANT_FORWARD;
    // shortest-arc lerp
    let d = yaw - g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.rotation.y += d * Math.min(1, dt * 6);
  };

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();
    const distToPlayer = Math.hypot(playerPos.x - g.position.x, playerPos.z - g.position.z);

    // ── greet when the visitor comes close ──
    if (distToPlayer < ASSISTANT.greetRange) {
      mode.current = "greet";
      faceTowards(g, playerPos.x, playerPos.z, dt);
      if (distToPlayer < ASSISTANT.bowRange && clips.map.bow) {
        if (!bowed.current) {
          play("bow", { once: true });
          bowed.current = true;
        }
      } else if (!greeted.current) {
        play(clips.map.greet ? "greet" : "idle", { once: !!clips.map.greet });
        greeted.current = true;
      } else if (current.current === clips.map.bow || current.current === clips.map.greet) {
        // after a one-shot, settle to idle
        const a = current.current ? actions[current.current] : null;
        if (a && !a.isRunning()) play("idle");
      }
      return;
    }
    greeted.current = false;
    bowed.current = false;

    // ── patrol (needs a Walk clip; otherwise stay home in idle) ──
    if (!hasWalk) {
      play("idle");
      return;
    }

    if (mode.current === "greet") mode.current = "patrol";

    if (mode.current === "pause") {
      if (now >= pauseUntil.current) {
        mode.current = "patrol";
      } else {
        play(clips.map.look ? "look" : "wait");
        return;
      }
    }

    const wp = ASSISTANT.path[target.current];
    tmpDir.current.set(wp[0] - g.position.x, 0, wp[2] - g.position.z);
    const dist = tmpDir.current.length();
    if (dist < 0.18) {
      // arrived → pause, then aim at the next waypoint (ping-pong at the ends)
      mode.current = "pause";
      pauseUntil.current = now + 2600 + Math.random() * 2200;
      let nextIdx = target.current + dir.current;
      if (nextIdx >= ASSISTANT.path.length) {
        dir.current = -1;
        nextIdx = target.current - 1;
      } else if (nextIdx < 0) {
        dir.current = 1;
        nextIdx = target.current + 1;
      }
      target.current = nextIdx;
      play(clips.map.look ? "look" : "wait");
      return;
    }

    // walk toward the waypoint
    play("walk");
    faceTowards(g, wp[0], wp[2], dt);
    tmpDir.current.normalize().multiplyScalar(ASSISTANT.walkSpeed * dt);
    g.position.x += tmpDir.current.x;
    g.position.z += tmpDir.current.z;
  });

  return (
    <group ref={group} dispose={null}>
      <group scale={norm.s} position={norm.offset.toArray()}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// Which way the model faces in its own space. Most Tripo/Mixamo bipeds face +Z;
// if she walks backwards, flip this to Math.PI. Tuned by eye in the preview.
const ASSISTANT_FORWARD = 0;

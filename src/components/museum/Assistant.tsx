"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { ASSISTANT, ASSISTANT_NAV, collide } from "@/lib/museum-layout";
import { playerPos, playerDir, assistantPos, useMuseum } from "@/store/museum";

export const ASSISTANT_URL = "/models/assistant.glb";
useGLTF.preload(ASSISTANT_URL);

// Which way the Mixamo mesh faces in its own space → world. Flip by ±PI/2 or PI
// if she walks/looks backwards (tuned by eye in the preview).
const FORWARD = 0;
const GREET_TEXT = "Welcome to Shraddha's museum. How can I help you today?";

// breadth-first path between two nav nodes (edges are collision-free by design)
function bfs(from: number, to: number): number[] {
  if (from === to) return [from];
  const prev: Record<number, number> = { [from]: -1 };
  const q = [from];
  while (q.length) {
    const n = q.shift()!;
    for (const m of ASSISTANT_NAV[n].to) {
      if (prev[m] === undefined) {
        prev[m] = n;
        if (m === to) {
          const path = [m];
          let c = n;
          while (c !== -1) {
            path.unshift(c);
            c = prev[c];
          }
          return path;
        }
        q.push(m);
      }
    }
  }
  return [from, to];
}
function nearestNode(x: number, z: number): number {
  let best = 0;
  let bd = Infinity;
  ASSISTANT_NAV.forEach((n, i) => {
    const d = (n.pos[0] - x) ** 2 + (n.pos[1] - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

export default function Assistant() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ASSISTANT_URL);
  const { actions } = useAnimations(animations, group);

  // normalise to human height, drop base to floor, neutralise any transmission
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
      mesh.frustumCulled = false;
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

  // behaviour state (refs → no per-frame React churn)
  const cur = useRef<string | null>(null);
  const node = useRef(0);
  const queue = useRef<number[]>([]);
  const pauseUntil = useRef(0);
  const oneShotUntil = useRef(0);
  const greetDone = useRef(false);
  const followUntil = useRef(0);
  const prevChat = useRef(false);
  const ready = useRef(false);

  useEffect(() => {
    if (group.current && !ready.current) {
      group.current.position.set(ASSISTANT.spawn[0], 0, ASSISTANT.spawn[2]);
      group.current.rotation.y = FORWARD;
      node.current = nearestNode(ASSISTANT.spawn[0], ASSISTANT.spawn[2]);
      ready.current = true;
    }
  }, []);

  const play = (name: string, once = false) => {
    if (cur.current === name) return;
    const next = actions[name];
    if (!next) return;
    const prev = cur.current ? actions[cur.current] : null;
    next.reset();
    if (once) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    next.fadeIn(0.3).play();
    prev?.fadeOut(0.3);
    cur.current = name;
  };

  const faceTo = (g: THREE.Group, tx: number, tz: number, dt: number, k = 4) => {
    const yaw = Math.atan2(tx - g.position.x, tz - g.position.z) + FORWARD;
    let d = yaw - g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.rotation.y += d * Math.min(1, dt * k);
  };
  // step toward (tx,tz); returns remaining distance after the step
  const moveTo = (g: THREE.Group, tx: number, tz: number, speed: number, dt: number) => {
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.001) {
      const s = Math.min(speed * dt, d);
      const [nx, nz] = collide(g.position.x + (dx / d) * s, g.position.z + (dz / d) * s, ASSISTANT.radius);
      g.position.x = nx;
      g.position.z = nz;
    }
    faceTo(g, tx, tz, dt);
    return Math.hypot(tx - g.position.x, tz - g.position.z);
  };

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g || !ready.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();
    const st = useMuseum.getState();
    assistantPos.copy(g.position);
    const px = playerPos.x;
    const pz = playerPos.z;
    const dist = Math.hypot(px - g.position.x, pz - g.position.z);

    // a chat that just closed → trail the visitor for a little while
    if (prevChat.current && !st.chatOpen) followUntil.current = now + 12000;
    prevChat.current = st.chatOpen;

    // not entered yet → idle at the entrance
    if (!st.entered) {
      st.setAssistantMode("idle");
      play("Idle");
      return;
    }

    // chat open → stay near the visitor; Talk while replying, else Idle
    if (st.chatOpen) {
      st.setAssistantMode("chat");
      if (dist > 2.6) {
        moveTo(g, px, pz, ASSISTANT.walkSpeed, dt);
        play("Walk");
      } else {
        faceTo(g, px, pz, dt, 6);
        play(st.speaking ? "Talk" : "Idle");
      }
      return;
    }

    // summoned → hurry over, then open the chat
    if (st.summoned) {
      st.setAssistantMode("summon");
      const d = moveTo(g, px, pz, ASSISTANT.hurrySpeed, dt);
      play(d < 2.2 ? "Idle" : "Walk");
      if (d < 2.2) {
        st.setSummoned(false);
        st.setChatOpen(true);
      }
      return;
    }

    // greet a freshly-arrived visitor (once) — approach, then stop a polite distance away
    if (!greetDone.current) {
      st.setAssistantMode("greet");
      if (dist > 2.4) {
        moveTo(g, px, pz, ASSISTANT.walkSpeed, dt);
        play("Walk");
      } else {
        faceTo(g, px, pz, dt, 6);
        if (oneShotUntil.current === 0) {
          play("Greet", true);
          st.setBubble(GREET_TEXT);
          oneShotUntil.current = now + (actions["Greet"]?.getClip().duration ?? 3) * 1000;
        } else if (now > oneShotUntil.current) {
          greetDone.current = true;
          oneShotUntil.current = 0;
          st.setBubble("");
          node.current = nearestNode(g.position.x, g.position.z);
          queue.current = [];
        }
      }
      return;
    }

    // brief follow window after a conversation
    if (now < followUntil.current && dist < ASSISTANT.followDrop) {
      st.setAssistantMode("follow");
      if (dist > ASSISTANT.followDist + 0.4) {
        moveTo(g, px, pz, ASSISTANT.walkSpeed, dt);
        play("Walk");
      } else {
        faceTo(g, px, pz, dt, 5);
        play("Idle");
      }
      return;
    }

    // attention: the visitor is looking at her or standing close
    const dirx = g.position.x - px;
    const dirz = g.position.z - pz;
    const dl = Math.hypot(dirx, dirz) || 1;
    const pdl = Math.hypot(playerDir.x, playerDir.z) || 1;
    const gaze = (playerDir.x * dirx + playerDir.z * dirz) / (dl * pdl);
    if (dist < ASSISTANT.engageRange || (dist < ASSISTANT.gazeRange && gaze > ASSISTANT.gazeDot)) {
      st.setAssistantMode("attention");
      faceTo(g, px, pz, dt, 5);
      play("Idle");
      return;
    }

    // roam: BFS to a random node, pausing to watch the art on arrival
    st.setAssistantMode("roam");
    if (queue.current.length === 0) {
      if (now < pauseUntil.current) {
        const lk = ASSISTANT_NAV[node.current].look;
        faceTo(g, lk[0], lk[1], dt, 2);
        return; // hold the paused pose (set on arrival)
      }
      let dest = node.current;
      while (dest === node.current) dest = Math.floor(Math.random() * ASSISTANT_NAV.length);
      queue.current = bfs(node.current, dest).slice(1);
      if (queue.current.length === 0) {
        pauseUntil.current = now + 3000;
        return;
      }
    }
    const next = ASSISTANT_NAV[queue.current[0]];
    const d = moveTo(g, next.pos[0], next.pos[1], ASSISTANT.walkSpeed, dt);
    play("Walk");
    if (d < 0.3) {
      node.current = queue.current.shift()!;
      if (queue.current.length === 0) {
        const r = Math.random();
        pauseUntil.current = now + 3500 + Math.random() * 3500;
        play(r < 0.1 ? "Dance" : r < 0.6 ? "LookAround" : "Idle");
      }
    }
  });

  return (
    <group ref={group} dispose={null}>
      <group scale={norm.s} position={norm.offset.toArray()}>
        <primitive object={scene} />
      </group>
      <Bubble />
    </group>
  );
}

// Floating thought bubble above her head (DOM overlay). Its own component so
// streaming text updates don't re-render the frame-loop component.
function Bubble() {
  const bubble = useMuseum((s) => s.bubble);
  const chatOpen = useMuseum((s) => s.chatOpen);
  if (!bubble || chatOpen) return null; // during chat, the panel shows her words
  return (
    <Html position={[0, 2.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          width: "max-content",
          maxWidth: 220,
          padding: "8px 12px",
          borderRadius: 14,
          background: "var(--bg-2, #1a1712)",
          color: "var(--ink, #ece7da)",
          border: "1px solid var(--hairline, rgba(255,255,255,0.12))",
          fontSize: 13,
          lineHeight: 1.45,
          textAlign: "center",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
          transform: "translateY(-6px)",
        }}
      >
        {bubble}
      </div>
    </Html>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { ASSISTANT, ASSISTANT_NAV, collide, EYE_H } from "@/lib/museum-layout";
import { playerPos, playerDir, assistantPos, useMuseum } from "@/store/museum";

export const ASSISTANT_URL = "/models/assistant.glb";
useGLTF.preload(ASSISTANT_URL);

// The Mixamo mesh faces +Z at rotation 0.
const FORWARD = 0;
const GREET_TEXT = "Welcome to Shraddha's museum. How can I help you today?";
// Roaming destinations worth standing at: entrance + each bay + the terminus
// (the in-between nodes 1/4/5/8 are nave junctions, only used to pass through).
const ART_NODES = [0, 2, 3, 6, 7, 9];
const ARRIVE = 0.5;

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

  // Scale + floor from the SKELETON (the skinned-mesh bounding box is unreliable
  // once posed). Put her head bone ≈ the player's eye height (so eyes line up)
  // and her feet on the floor; centre her on the hips.
  const norm = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const v = new THREE.Vector3();
    let footY = Infinity;
    let head: THREE.Object3D | null = null;
    let hips: THREE.Object3D | null = null;
    scene.traverse((o) => {
      if (o.name === "mixamorigHead") head = o;
      if (o.name === "mixamorigHips") hips = o;
      if ((o as THREE.Bone).isBone) {
        o.getWorldPosition(v);
        if (v.y < footY) footY = v.y;
      }
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
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
      }
    });
    let headY = footY + 1.6;
    if (head) {
      (head as THREE.Object3D).getWorldPosition(v);
      headY = v.y;
    }
    const s = (EYE_H + 0.05) / Math.max(0.1, headY - footY); // head bone → ~eye level
    let cx = 0;
    let cz = 0;
    if (hips) {
      (hips as THREE.Object3D).getWorldPosition(v);
      cx = v.x;
      cz = v.z;
    }
    return { s, offset: new THREE.Vector3(-cx * s, -footY * s, -cz * s) };
  }, [scene]);

  // behaviour state
  const cur = useRef<string | null>(null);
  const idleClip = useRef("Idle");
  const idleSwitchAt = useRef(0);
  const queue = useRef<number[]>([]);
  const goalNode = useRef(-2);
  const roamDest = useRef(-1);
  const pauseUntil = useRef(0);
  const danceUntil = useRef(0);
  const greetDone = useRef(false);
  const greetUntil = useRef(0);
  const followUntil = useRef(0);
  const prevChat = useRef(false);
  const ready = useRef(false);

  useEffect(() => {
    if (group.current && !ready.current) {
      group.current.position.set(ASSISTANT.spawn[0], 0, ASSISTANT.spawn[2]);
      group.current.rotation.y = FORWARD;
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

  // candid idle: alternate Idle ↔ LookAround every few seconds
  const idleAnim = (now: number) => {
    if (now > idleSwitchAt.current) {
      idleSwitchAt.current = now + 4500 + Math.random() * 4500;
      idleClip.current = Math.random() < 0.5 ? "Idle" : "LookAround";
    }
    return idleClip.current;
  };

  const faceTo = (g: THREE.Group, tx: number, tz: number, dt: number, k = 4) => {
    const yaw = Math.atan2(tx - g.position.x, tz - g.position.z) + FORWARD;
    let d = yaw - g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.rotation.y += d * Math.min(1, dt * k);
  };
  const moveTo = (g: THREE.Group, tx: number, tz: number, speed: number, dt: number) => {
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.001) {
      const step = Math.min(speed * dt, d);
      const [nx, nz] = collide(g.position.x + (dx / d) * step, g.position.z + (dz / d) * step, ASSISTANT.radius);
      g.position.x = nx;
      g.position.z = nz;
    }
    faceTo(g, tx, tz, dt);
    return Math.hypot(tx - g.position.x, tz - g.position.z);
  };

  // Navigate to (tx,tz) ALONG the collision-free graph: hop node→node until she
  // shares the target's nearest-node cell, then beeline the short last stretch.
  // Returns true once she's within ARRIVE of the exact target.
  const navTo = (g: THREE.Group, tx: number, tz: number, speed: number, dt: number) => {
    const dest = nearestNode(tx, tz);
    const from = nearestNode(g.position.x, g.position.z);
    if (from === dest) {
      const d = moveTo(g, tx, tz, speed, dt);
      if (d > ARRIVE) {
        play("Walk");
        return false;
      }
      return true;
    }
    if (goalNode.current !== dest || queue.current.length === 0) {
      goalNode.current = dest;
      queue.current = bfs(from, dest).slice(1);
    }
    const nextIdx = queue.current[0] ?? dest;
    const n = ASSISTANT_NAV[nextIdx];
    const d = moveTo(g, n.pos[0], n.pos[1], speed, dt);
    if (d < 0.5 && queue.current.length) queue.current.shift();
    play("Walk");
    return false;
  };

  const tmpF = useRef(new THREE.Vector3());

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

    if (prevChat.current && !st.chatOpen) followUntil.current = now + 12000;
    prevChat.current = st.chatOpen;

    if (!st.entered) {
      st.setAssistantMode("idle");
      play(idleAnim(now));
      return;
    }

    // ── chat open → hurry to a spot front-LEFT of the player (clear of the
    //    bottom-right panel), then face them; Talk while replying ──
    if (st.chatOpen) {
      st.setAssistantMode("chat");
      const f = tmpF.current.set(playerDir.x, 0, playerDir.z);
      const fl = f.length() || 1;
      f.multiplyScalar(1 / fl);
      const spotX = px + f.x * 2.2 + f.z * 1.4; // + player's-left offset
      const spotZ = pz + f.z * 2.2 - f.x * 1.4;
      if (Math.hypot(spotX - g.position.x, spotZ - g.position.z) > 0.8) {
        navTo(g, spotX, spotZ, ASSISTANT.hurrySpeed, dt);
      } else {
        faceTo(g, px, pz, dt, 8);
        play(st.speaking ? "Talk" : idleAnim(now));
      }
      return;
    }

    // ── greet a freshly-arrived visitor (once) ──
    if (!greetDone.current) {
      st.setAssistantMode("greet");
      if (dist > 2.4) {
        navTo(g, px, pz, ASSISTANT.walkSpeed, dt);
      } else {
        faceTo(g, px, pz, dt, 6);
        if (greetUntil.current === 0) {
          play("Greet", true);
          st.setBubble(GREET_TEXT);
          greetUntil.current = now + (actions["Greet"]?.getClip().duration ?? 3) * 1000;
        } else if (now > greetUntil.current) {
          greetDone.current = true;
          st.setBubble("");
        }
      }
      return;
    }

    // ── brief follow after a conversation ──
    if (now < followUntil.current && dist < ASSISTANT.followDrop) {
      st.setAssistantMode("follow");
      if (dist > ASSISTANT.followDist + 0.4) navTo(g, px, pz, ASSISTANT.walkSpeed, dt);
      else {
        faceTo(g, px, pz, dt, 5);
        play(idleAnim(now));
      }
      return;
    }

    // ── attention: she notices a gaze or a close approach ──
    const dirx = g.position.x - px;
    const dirz = g.position.z - pz;
    const dl = Math.hypot(dirx, dirz) || 1;
    const pdl = Math.hypot(playerDir.x, playerDir.z) || 1;
    const gaze = (playerDir.x * dirx + playerDir.z * dirz) / (dl * pdl);
    if (dist < ASSISTANT.engageRange || (dist < ASSISTANT.gazeRange && gaze > ASSISTANT.gazeDot)) {
      st.setAssistantMode("attention");
      faceTo(g, px, pz, dt, 5);
      play(idleAnim(now));
      return;
    }

    // ── roam: linger at art, sometimes near the visitor ──
    st.setAssistantMode("roam");
    if (now < pauseUntil.current && roamDest.current >= 0) {
      const lk = ASSISTANT_NAV[roamDest.current].look;
      faceTo(g, lk[0], lk[1], dt, 2);
      play(now < danceUntil.current ? "Dance" : idleAnim(now));
      return;
    }
    if (pauseUntil.current !== 0) {
      pauseUntil.current = 0;
      roamDest.current = -1; // re-pick after a pause
    }
    if (roamDest.current < 0) {
      roamDest.current =
        Math.random() < 0.35
          ? nearestNode(px, pz) // hang out near the visitor
          : ART_NODES[Math.floor(Math.random() * ART_NODES.length)];
    }
    const dst = ASSISTANT_NAV[roamDest.current];
    if (navTo(g, dst.pos[0], dst.pos[1], ASSISTANT.walkSpeed, dt)) {
      pauseUntil.current = now + 4000 + Math.random() * 3500;
      if (Math.random() < 0.12)
        danceUntil.current = now + (actions["Dance"]?.getClip().duration ?? 3) * 1000;
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

// Thought bubble, anchored ABOVE her head (grows upward so it never covers her).
function Bubble() {
  const bubble = useMuseum((s) => s.bubble);
  const chatOpen = useMuseum((s) => s.chatOpen);
  if (!bubble || chatOpen) return null; // during chat, the panel shows her words
  return (
    <Html position={[0, 2.35, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
      <div
        style={{
          transform: "translate(-50%, -100%)",
          width: "max-content",
          maxWidth: 200,
          padding: "8px 12px",
          borderRadius: 14,
          background: "var(--bg-2, #1a1712)",
          color: "var(--ink, #ece7da)",
          border: "1px solid var(--hairline, rgba(255,255,255,0.14))",
          fontSize: 13,
          lineHeight: 1.4,
          textAlign: "center",
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        }}
      >
        {bubble}
      </div>
    </Html>
  );
}

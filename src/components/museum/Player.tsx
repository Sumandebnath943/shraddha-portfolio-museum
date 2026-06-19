"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { collide, EYE_H, SPAWN, SEATS } from "@/lib/museum-layout";
import { playerPos, playerDir, assistantPos, useMuseum } from "@/store/museum";

const SPEED = 3.6;
const ACCEL = 9;
const LOOK_RATE = 2.0; // rad/sec at full cursor deflection (no-pointer-lock free-look)
const SIT_RANGE = 1.7; // how close to a bench before "Press E to sit" shows
const IDLE_MS = 4000; // seated stillness before the view starts panning itself
const PAN_SPEED = 0.32; // auto-pan angular speed
const PAN_AMP = 0.62; // auto-pan sweep amplitude (radians, each side)
const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export default function Player() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const selected = useMuseum((s) => s.selected);

  // seated state (read in the frame loop via refs to avoid re-subscribes)
  const seatedRef = useRef<number | null>(null);
  const baseYaw = useRef(0);
  const basePitch = useRef(0);
  const panPhase = useRef(0);
  const lastInput = useRef(0);

  // free-look (pointer-lock unavailable): steer by cursor position
  const mouse = useRef({ x: 0, y: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const lookInit = useRef(false);

  useEffect(() => {
    camera.rotation.order = "YXZ"; // so reading rotation.y gives a clean yaw
    camera.position.set(SPAWN.x, EYE_H, SPAWN.z);
    camera.lookAt(SPAWN.x, EYE_H, SPAWN.z - 6); // face north, into the galleries
  }, [camera]);

  // sit on the nearest bench / stand back up
  const sit = (i: number) => {
    const seat = SEATS[i];
    seatedRef.current = i;
    useMuseum.getState().setSeated(i);
    camera.position.set(seat.pos[0], seat.pos[1], seat.pos[2]);
    camera.lookAt(seat.look[0], seat.pos[1], seat.look[1]);
    baseYaw.current = camera.rotation.y;
    basePitch.current = camera.rotation.x;
    lastInput.current = performance.now();
    playerPos.set(seat.pos[0], seat.pos[1], seat.pos[2]);
  };
  const stand = () => {
    if (seatedRef.current === null) return;
    seatedRef.current = null;
    useMuseum.getState().setSeated(null);
    useMuseum.getState().setAutoPanning(false);
    camera.position.y = EYE_H;
    basePitch.current = 0;
    lookInit.current = false; // re-sync free-look heading to wherever we stood up facing
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      lastInput.current = performance.now();
      const st = useMuseum.getState();
      if (e.code === "KeyE") {
        // kiosk takes priority over sitting; the modal is opened in Museum
        if (st.kioskOpen || st.selected || st.nearKiosk) return;
        if (seatedRef.current !== null) stand();
        else if (st.seatIndex !== null) sit(st.seatIndex);
        return;
      }
      // any walk key while seated → stand up (GTA-style)
      if (seatedRef.current !== null && MOVE_KEYS.includes(e.code)) stand();
    };
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const move = (e: MouseEvent) => {
      lastInput.current = performance.now();
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  const fwd = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useMuseum.getState();
    camera.getWorldDirection(playerDir); // for the guide's gaze sensing

    // ─── seated: lock position, run idle auto-pan ───
    if (seatedRef.current !== null) {
      const seat = SEATS[seatedRef.current];
      camera.position.set(seat.pos[0], seat.pos[1], seat.pos[2]);
      playerPos.set(seat.pos[0], seat.pos[1], seat.pos[2]);
      const idle =
        performance.now() - lastInput.current > IDLE_MS && !st.selected && !st.kioskOpen;
      if (idle) {
        if (!st.autoPanning) st.setAutoPanning(true);
        panPhase.current += dt * PAN_SPEED;
        const yaw = baseYaw.current + Math.sin(panPhase.current) * PAN_AMP;
        const pitch = THREE.MathUtils.lerp(basePitch.current, 0, 0.04); // settle level
        basePitch.current = pitch;
        camera.rotation.set(pitch, yaw, 0);
      } else {
        if (st.autoPanning) st.setAutoPanning(false);
        // track the visitor's manual heading so panning resumes around it
        baseYaw.current = camera.rotation.y;
        basePitch.current = camera.rotation.x;
      }
      return;
    }

    // ─── standing: free walk ───
    const k = keys.current;
    const frozen = st.selected !== null || st.kioskOpen || st.chatOpen;

    // no-pointer-lock fallback: steer the view with the cursor (centre = still,
    // toward the edges = turn). Runs ONLY when free-look is engaged AND the pointer
    // is NOT actually locked — otherwise it would fight PointerLockControls and
    // freeze the view (the regression).
    if (st.freeLook && !frozen && document.pointerLockElement === null) {
      if (!lookInit.current) {
        yaw.current = camera.rotation.y;
        pitch.current = camera.rotation.x;
        lookInit.current = true;
      }
      const dz = 0.12;
      const defl = (v: number) => {
        const a = Math.abs(v);
        return a < dz ? 0 : Math.sign(v) * ((a - dz) / (1 - dz));
      };
      yaw.current -= defl(mouse.current.x) * LOOK_RATE * dt;
      pitch.current -= defl(mouse.current.y) * LOOK_RATE * dt;
      pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current));
      camera.rotation.set(pitch.current, yaw.current, 0);
    }

    const f =
      (!frozen && (k["KeyW"] || k["ArrowUp"]) ? 1 : 0) -
      (!frozen && (k["KeyS"] || k["ArrowDown"]) ? 1 : 0);
    const s =
      (!frozen && (k["KeyD"] || k["ArrowRight"]) ? 1 : 0) -
      (!frozen && (k["KeyA"] || k["ArrowLeft"]) ? 1 : 0);

    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();
    right.current.crossVectors(fwd.current, camera.up).normalize();

    desired.current
      .set(0, 0, 0)
      .addScaledVector(fwd.current, f)
      .addScaledVector(right.current, s);
    if (desired.current.lengthSq() > 0) desired.current.normalize().multiplyScalar(SPEED);

    vel.current.x = THREE.MathUtils.lerp(vel.current.x, desired.current.x, 1 - Math.exp(-ACCEL * dt));
    vel.current.z = THREE.MathUtils.lerp(vel.current.z, desired.current.z, 1 - Math.exp(-ACCEL * dt));

    let nx = camera.position.x + vel.current.x * dt;
    let nz = camera.position.z + vel.current.z * dt;
    [nx, nz] = collide(nx, nz);

    // don't walk through the guide — push out of her personal radius
    const adx = nx - assistantPos.x;
    const adz = nz - assistantPos.z;
    const ad = Math.hypot(adx, adz);
    const PERSONAL = 0.7;
    if (ad < PERSONAL && ad > 1e-4) {
      nx = assistantPos.x + (adx / ad) * PERSONAL;
      nz = assistantPos.z + (adz / ad) * PERSONAL;
    }

    camera.position.set(nx, EYE_H, nz);
    playerPos.set(nx, EYE_H, nz);

    // nearest bench within range → drives the "Press E to sit" prompt
    if (!st.nearKiosk) {
      let best: number | null = null;
      let bestD = SIT_RANGE;
      for (let i = 0; i < SEATS.length; i++) {
        const d = Math.hypot(nx - SEATS[i].pos[0], nz - SEATS[i].pos[2]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      st.setSeatIndex(best);
    } else if (st.seatIndex !== null) {
      st.setSeatIndex(null);
    }
  });

  return null;
}

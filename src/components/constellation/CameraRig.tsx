"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getConstellation, getBounds } from "@/lib/constellation-layout";
import { useConstellation } from "@/store/constellation";

export default function CameraRig() {
  const { camera, gl } = useThree();
  const nodes = useMemo(getConstellation, []);
  const bounds = useMemo(getBounds, []);
  const overviewDist = bounds.radius * 2.6 + 6;
  // in the landing state the spiral lives on the RIGHT half (the particle face
  // owns the left), so we look left of centre and pull back a touch.
  const offsetX = overviewDist * 0.42;
  const landingDist = overviewDist * 1.18;

  const focus = useRef(new THREE.Vector3(bounds.center.x - offsetX, bounds.center.y, 0));
  const dist = useRef(landingDist * 2.1); // start far for the intro pull-back
  const exploreTarget = useRef(new THREE.Vector3(bounds.center.x - offsetX, bounds.center.y, 0));
  const exploreDist = useRef(landingDist);
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef({ active: false, x: 0, y: 0 });
  const start = useRef(performance.now());

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (drag.current.active) {
        const st = useConstellation.getState();
        if (st.mode !== "explore") {
          st.setMode("explore");
          exploreTarget.current.copy(focus.current);
          exploreDist.current = dist.current;
        }
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
        const k = exploreDist.current * 0.0016;
        exploreTarget.current.x -= dx * k;
        exploreTarget.current.y += dy * k;
      }
    };
    const down = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY };
    };
    const up = () => {
      drag.current.active = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = useConstellation.getState();
      if (st.mode !== "explore") {
        st.setMode("explore");
        exploreTarget.current.copy(focus.current);
        exploreDist.current = dist.current;
      }
      exploreDist.current = THREE.MathUtils.clamp(
        exploreDist.current * Math.exp(e.deltaY * 0.0012),
        4,
        overviewDist * 2.2,
      );
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, overviewDist]);

  const desF = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const st = useConstellation.getState();
    let desD = overviewDist;

    if (st.warping) {
      desF.copy(nodes[nodes.length - 1].pos);
      desD = Math.max(0.5, dist.current - dt * 42);
    } else if (st.mode === "intro") {
      desF.copy(bounds.center);
      desF.x -= offsetX;
      const t = Math.min(1, (performance.now() - start.current) / 2600);
      const e = 1 - Math.pow(1 - t, 3);
      desD = THREE.MathUtils.lerp(landingDist * 2.1, landingDist, e);
    } else if (st.mode === "tour") {
      const n = nodes[Math.max(0, Math.min(nodes.length - 1, st.tourIndex))];
      desF.copy(n.pos);
      desD = n.size * 3 + 7;
    } else if (st.mode === "focus" && st.focusedId) {
      const n = nodes.find((x) => x.m.id === st.focusedId) ?? nodes[0];
      desF.copy(n.pos);
      desD = n.size * 2.4 + 4.8;
    } else {
      desF.copy(exploreTarget.current);
      desD = exploreDist.current;
    }

    const ease = st.warping ? 0.5 : Math.min(1, dt * 2.2);
    focus.current.lerp(desF, ease);
    dist.current += (desD - dist.current) * ease;

    const par = st.reducedMotion ? 0 : 1;
    const px = pointer.current.x * dist.current * 0.04 * par;
    const py = -pointer.current.y * dist.current * 0.04 * par;
    camera.position.set(focus.current.x + px, focus.current.y + py, focus.current.z + dist.current);
    camera.lookAt(focus.current);
  });

  return null;
}

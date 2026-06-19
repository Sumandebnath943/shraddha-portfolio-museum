"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import Backdrop from "./Backdrop";
import Spine from "./Spine";
import StarNode from "./StarNode";
import CameraRig from "./CameraRig";
import ParticleField from "@/components/particles/ParticleField";
import { getConstellation, SKIN } from "@/lib/constellation-layout";
import { useConstellation, env } from "@/store/constellation";

// Eases the global "chart light": 0 while only the particle organism shows,
// ~0.4 once the portrait has formed (chart dimmed, particles are the sun),
// 1 when the particles fly off on Play and the sky blooms to full.
function EnvController() {
  useFrame((_, delta) => {
    const st = useConstellation.getState();
    // warp = everything but the particles vanishes (chart fades to black so the
    // sun/portal owns the screen); Play blooms the sky to full; otherwise the
    // chart stays dim under the particle sun.
    const target = st.warping ? 0 : st.playing ? 1 : st.faceFormed ? 0.5 : 0;
    const rate = st.warping ? 3.5 : 1.5;
    env.bgLight += (target - env.bgLight) * Math.min(1, delta * rate);
  });
  return null;
}

export default function Scene() {
  const skin = useConstellation((s) => s.skin);
  const reduced = useConstellation((s) => s.reducedMotion);
  const nodes = useMemo(getConstellation, []);
  const pal = SKIN[skin];
  const count = useMemo(() => {
    if (typeof window === "undefined") return 190000;
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
    return coarse ? 60000 : 150000;
  }, []);

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.fog, 60, 165]} />
      <Backdrop skin={skin} reduced={reduced} />
      <Spine skin={skin} reduced={reduced} />
      {nodes.map((n) => (
        <StarNode key={n.m.id} node={n} skin={skin} reduced={reduced} />
      ))}
      <CameraRig />
      <EnvController />
      <ParticleField count={count} skin={skin} reduced={reduced} />
      {skin === "dark" && (
        <EffectComposer>
          <Bloom intensity={0.34} luminanceThreshold={0.58} luminanceSmoothing={0.68} mipmapBlur />
          <Vignette eskil={false} offset={0.32} darkness={0.62} />
        </EffectComposer>
      )}
    </>
  );
}

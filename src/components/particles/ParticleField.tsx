"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConstellation } from "@/store/constellation";
import {
  makeLayout,
  genScatter,
  genExplode,
  genSeed,
  genSun,
  genSky,
  fillHalo,
  genButterfly,
  genLightbulb,
  genBezier,
  genSwatches,
  genBauhaus,
  genAmpersand,
  genFrame,
  loadBakedFace,
  fillFaceFromPool,
} from "@/lib/particle-shapes";
import type { Layout } from "@/lib/particle-shapes";
import type { SkinName } from "@/lib/constellation-layout";

const D = 40;

// uShape ids used by the morph shader for per-shape hold animations.
const ID: Record<string, number> = {
  scatter: 0,
  face: 1,
  butterfly: 2,
  lightbulb: 3,
  bezier: 4,
  swatches: 5,
  bauhaus: 6,
  ampersand: 7,
  frame: 8,
  explode: 9,
  seed: 10,
  sun: 11,
};

// the "design coming to life" sequence, with her face as the recurring heartbeat
const PLAYLIST = ["lightbulb", "bezier", "swatches", "face", "bauhaus", "ampersand", "face", "frame", "butterfly", "face"];

// fraction of the MORPH pool each shape actually uses — the rest become its halo.
// The face is the hero (sparse line-portrait look); line shapes need far fewer
// points than filled silhouettes, so their density reads correctly instead of
// blowing out. Leftover = soft living halo around the form.
const SHAPE_FRAC: Record<string, number> = {
  face: 0.56,
  lightbulb: 0.34,
  bezier: 0.17,
  swatches: 0.22,
  bauhaus: 0.32,
  ampersand: 0.26,
  frame: 0.2,
  butterfly: 0.32,
};

const SKY_FRAC = 0.3; // share of the pool that becomes the persistent starfield

const TRANSITION = 2400;
const HOLD_FACE = 6000;
const HOLD_OTHER = 4400;

// calm, cinematic intro (~7.5s to the face): dot → sun → spread left → face.
const SEED_HOLD = 650;
const INTRO: { name: string; dur: number; hold: number }[] = [
  { name: "sun", dur: 1300, hold: 1750 },
  { name: "scatter", dur: 1500, hold: 550 },
  { name: "face", dur: 2000, hold: HOLD_FACE },
];

const COLORS = {
  dark: { dim: "#b88f3e", bright: "#ffeec6", opacity: 0.82 },
  light: { dim: "#3a2c12", bright: "#9c7a2a", opacity: 0.9 },
};

// ── morphing field shader (the organism / shapes / sun / portal) ────────────
const VS = `
attribute vec3 aPosA; attribute vec3 aPosB;
attribute float aShadeA; attribute float aShadeB; attribute float aSize; attribute float aSeed;
uniform float uBlend; uniform float uTime; uniform float uDrift; uniform float uPx;
uniform float uShape; uniform float uHold; uniform vec2 uCenter; uniform float uWarp;
uniform vec3 uDim; uniform vec3 uBright;
varying vec3 vColor;
void main(){
  vec3 p = mix(aPosA, aPosB, uBlend);
  float h = uHold;
  if (h > 0.001) {
    if (uShape > 1.5 && uShape < 2.5) {           // butterfly wing-flap
      float dx = p.x - uCenter.x;
      float ang = sin(uTime * 1.7) * 0.55 * h;
      p.x = uCenter.x + dx * cos(ang);
      p.z += dx * sin(ang);
    } else if ((uShape > 0.5 && uShape < 1.5) || (uShape > 6.5 && uShape < 7.5)) {  // face / ampersand breathe
      p.xy = uCenter + (p.xy - uCenter) * (1.0 + 0.012 * sin(uTime * 0.6) * h);
    }
  }
  if (uWarp > 0.001) {                            // vortex → portal into the museum
    vec2 d = p.xy - uCenter;
    float r = length(d);
    float a = atan(d.y, d.x) + uWarp * (6.0 + 9.0 / (r * 0.08 + 1.0));
    r *= (1.0 - uWarp * 0.9);
    p.xy = uCenter + vec2(cos(a), sin(a)) * r;
    p.z += uWarp * (44.0 + 30.0 * sin(aSeed * 6.2831)); // rush toward camera (tunnel)
  }
  vec3 drift = vec3(sin(p.y*0.18+uTime*0.5), cos(p.x*0.18+uTime*0.45), sin((p.x+p.y)*0.13+uTime*0.3)) * uDrift;
  drift += vec3(sin(uTime*1.3+aSeed*6.2831), cos(uTime*1.1+aSeed*5.0), 0.0) * 0.12;
  p += drift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPx * (30.0 / max(1.0, -mv.z));
  float sh = mix(aShadeA, aShadeB, uBlend);
  float glint = 0.0;
  if (h > 0.001) {
    if (abs(uShape-3.0) < 0.5) {                         // lightbulb: warm glow pulse
      glint = (0.25 + 0.3 * (0.5 + 0.5 * sin(uTime * 1.6))) * h;
    } else if (abs(uShape-4.0) < 0.5 || abs(uShape-8.0) < 0.5) {  // bezier / frame: glint sweep
      float coord = (abs(uShape-4.0) < 0.5) ? (p.x - uCenter.x) : (p.y - uCenter.y);
      float band = sin(uTime * 1.0) * 16.0;
      glint = smoothstep(4.0, 0.0, abs(coord - band)) * 0.5 * h;
    }
  }
  vColor = mix(uDim, uBright, clamp(sh + glint, 0.0, 1.0));
}
`;

const FS = `
precision mediump float;
uniform float uOpacity;
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.42, d); // hard, crisp dot so edge structure survives
  gl_FragColor = vec4(vColor, a * uOpacity);
}
`;

// ── persistent twinkling starfield shader ───────────────────────────────────
const VS_SKY = `
attribute vec3 aPosA; attribute vec3 aPosB;
attribute float aShade; attribute float aSize; attribute float aSeed;
uniform float uBlend; uniform float uTime; uniform float uPx; uniform float uWarp; uniform vec2 uCenter;
uniform vec3 uDim; uniform vec3 uBright;
varying vec3 vColor; varying float vTw;
void main(){
  vec3 p = mix(aPosA, aPosB, uBlend);
  if (uWarp > 0.001) {                            // get drawn into the portal too
    vec2 d = p.xy - uCenter;
    float r = length(d);
    float a = atan(d.y, d.x) + uWarp * 4.0;
    r *= (1.0 - uWarp * 0.55);
    p.xy = uCenter + vec2(cos(a), sin(a)) * r;
    p.z += uWarp * 30.0;
  }
  p.x += sin(uTime * 0.2 + aSeed * 6.2831) * 0.6; // slow individual drift
  p.y += cos(uTime * 0.17 + aSeed * 5.0) * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.32 + 0.68 * pow(0.5 + 0.5 * sin(uTime * (1.1 + aSeed * 2.4) + aSeed * 30.0), 2.0);
  vTw = tw;
  gl_PointSize = aSize * uPx * (30.0 / max(1.0, -mv.z)) * (0.55 + 0.85 * tw);
  vColor = mix(uDim, uBright, clamp(aShade * (0.6 + 0.5 * tw), 0.0, 1.0));
}
`;

const FS_SKY = `
precision mediump float;
uniform float uOpacity;
varying vec3 vColor; varying float vTw;
void main(){
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d); // soft round star
  gl_FragColor = vec4(vColor, a * uOpacity * (0.45 + 0.7 * vTw));
}
`;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function ParticleField({
  count,
  skin,
  reduced,
}: {
  count: number;
  skin: SkinName;
  reduced: boolean;
}) {
  const { camera, size, gl } = useThree();
  const track = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const matSkyRef = useRef<THREE.ShaderMaterial>(null);

  // split the pool: a persistent twinkling sky + the morphing organism.
  const SKY = useMemo(() => Math.round(count * SKY_FRAC), [count]);
  const MORPH = count - SKY;

  const shapes = useRef<Record<string, { pos: Float32Array; shade: Float32Array }>>({});
  const skyTargets = useRef<{ seed: Float32Array; sun: Float32Array; star: Float32Array; shade: Float32Array } | null>(null);
  const built = useRef(false);
  const faceFlag = useRef(false);

  const state = useRef({
    blend: 0,
    shown: "A" as "A" | "B",
    cur: "seed",
    ready: false,
    holdUntil: Infinity,
    nextHold: SEED_HOLD,
    step: 0,
    introDone: false,
    pl: -1,
    anim: { on: false, t: 0, dur: 2.4, from: 0, to: 0, slot: "A" as "A" | "B" },
  });
  const sky = useRef({
    ready: false,
    start: 0,
    phase: 0, // 0: seed→sun, 1: holding sun, 2: sun→stars, 3: done (twinkle)
    blend: 0,
    anim: { on: false, t: 0, dur: 1.3, from: 0, to: 1 },
  });

  // ── geometry: morph field ──
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const sz = new Float32Array(MORPH);
    const sd = new Float32Array(MORPH);
    for (let i = 0; i < MORPH; i++) {
      sz[i] = 1.0 + Math.random() * 1.3;
      sd[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MORPH * 3), 3));
    g.setAttribute("aPosA", new THREE.BufferAttribute(new Float32Array(MORPH * 3), 3));
    g.setAttribute("aPosB", new THREE.BufferAttribute(new Float32Array(MORPH * 3), 3));
    g.setAttribute("aShadeA", new THREE.BufferAttribute(new Float32Array(MORPH), 1));
    g.setAttribute("aShadeB", new THREE.BufferAttribute(new Float32Array(MORPH), 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    return g;
  }, [MORPH]);

  // ── geometry: sky field ──
  const skyGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const sz = new Float32Array(SKY);
    const sd = new Float32Array(SKY);
    for (let i = 0; i < SKY; i++) {
      sz[i] = 0.8 + Math.random() * 1.7;
      sd[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SKY * 3), 3));
    g.setAttribute("aPosA", new THREE.BufferAttribute(new Float32Array(SKY * 3), 3));
    g.setAttribute("aPosB", new THREE.BufferAttribute(new Float32Array(SKY * 3), 3));
    g.setAttribute("aShade", new THREE.BufferAttribute(new Float32Array(SKY), 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    return g;
  }, [SKY]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBlend: { value: 0 },
      uDrift: { value: 1.6 },
      uPx: { value: 1 },
      uOpacity: { value: 0.95 },
      uShape: { value: 0 },
      uHold: { value: 0 },
      uWarp: { value: 0 },
      uCenter: { value: new THREE.Vector2() },
      uDim: { value: new THREE.Color(COLORS.dark.dim) },
      uBright: { value: new THREE.Color(COLORS.dark.bright) },
    }),
    [],
  );
  const skyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBlend: { value: 0 },
      uPx: { value: 1 },
      uOpacity: { value: 0.9 },
      uWarp: { value: 0 },
      uCenter: { value: new THREE.Vector2() },
      uDim: { value: new THREE.Color(COLORS.dark.dim) },
      uBright: { value: new THREE.Color(COLORS.dark.bright) },
    }),
    [],
  );

  useEffect(() => {
    const c = COLORS[skin];
    uniforms.uDim.value.set(c.dim);
    uniforms.uBright.value.set(c.bright);
    uniforms.uOpacity.value = c.opacity;
    skyUniforms.uDim.value.set(c.dim);
    skyUniforms.uBright.value.set(c.bright);
    skyUniforms.uOpacity.value = c.opacity;
  }, [skin, uniforms, skyUniforms]);

  const setM = (name: string, src: Float32Array) => {
    const attr = geom.attributes[name] as THREE.BufferAttribute;
    (attr.array as Float32Array).set(src);
    attr.needsUpdate = true;
  };
  const setS = (name: string, src: Float32Array) => {
    const attr = skyGeom.attributes[name] as THREE.BufferAttribute;
    (attr.array as Float32Array).set(src);
    attr.needsUpdate = true;
  };

  // build a morph shape: `frac` of the pool forms the shape, the rest is its halo.
  const buildShape = (
    fill: (p: Float32Array, s: Float32Array, n: number, L: Layout) => void,
    frac: number,
    L: Layout,
    rx: number,
    ry: number,
  ) => {
    const pos = new Float32Array(MORPH * 3);
    const sh = new Float32Array(MORPH);
    const budget = Math.round(MORPH * frac);
    fill(pos, sh, budget, L);
    fillHalo(pos, sh, budget, MORPH, L, rx, ry);
    return { pos, shade: sh };
  };

  useEffect(() => {
    if (built.current || !size.width) return;
    built.current = true;
    const fov = ((camera as THREE.PerspectiveCamera).fov ?? 55) * (Math.PI / 180);
    const H = D * Math.tan(fov / 2);
    const L = makeLayout(size.width / size.height, H);
    uniforms.uCenter.value.set(L.fcx, L.fcy);
    // the warp portal forms at SCREEN centre (the sun), not the face box.
    // (uCenter doubles as shape-breathe centre = face box; that's fine — the warp
    //  pulls toward the sun which we re-aim below by swapping center on warp.)

    const full = (fn: (p: Float32Array, s: Float32Array, c: number, l: Layout) => void) => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      fn(pos, sh, MORPH, L);
      return { pos, shade: sh };
    };

    // formless states use the whole morph pool
    shapes.current.seed = (() => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      genSeed(pos, sh, MORPH);
      return { pos, shade: sh };
    })();
    shapes.current.sun = (() => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      genSun(pos, sh, MORPH);
      return { pos, shade: sh };
    })();
    shapes.current.scatter = full(genScatter);
    shapes.current.explode = full(genExplode);

    // vector shapes — square-ish halo box around the left face column
    const vr = L.fhw * 1.05;
    shapes.current.butterfly = buildShape(genButterfly, SHAPE_FRAC.butterfly, L, vr, vr);
    shapes.current.lightbulb = buildShape(genLightbulb, SHAPE_FRAC.lightbulb, L, vr, vr);
    shapes.current.bezier = buildShape(genBezier, SHAPE_FRAC.bezier, L, vr, vr);
    shapes.current.swatches = buildShape(genSwatches, SHAPE_FRAC.swatches, L, vr, vr);
    shapes.current.bauhaus = buildShape(genBauhaus, SHAPE_FRAC.bauhaus, L, vr, vr);
    shapes.current.ampersand = buildShape(genAmpersand, SHAPE_FRAC.ampersand, L, vr, vr);
    shapes.current.frame = buildShape(genFrame, SHAPE_FRAC.frame, L, vr, vr);

    // sky targets: born from the sun, dispersed to a wide starfield
    const skySeed = new Float32Array(SKY * 3);
    const skySun = new Float32Array(SKY * 3);
    const skyStar = new Float32Array(SKY * 3);
    const skyShade = new Float32Array(SKY);
    genSeed(skySeed, skyShade, SKY);
    genSun(skySun, skyShade, SKY);
    genSky(skyStar, skyShade, SKY, L);
    skyTargets.current = { seed: skySeed, sun: skySun, star: skyStar, shade: skyShade };
    setS("aPosA", skySeed);
    setS("aPosB", skySun);
    setS("aShade", skyShade);

    // start the morph field on the seed dot
    setM("aPosA", shapes.current.seed.pos);
    setM("aPosB", shapes.current.seed.pos);
    setM("aShadeA", shapes.current.seed.shade);
    setM("aShadeB", shapes.current.seed.shade);

    loadBakedFace().then((baked) => {
      if (baked) {
        const pos = new Float32Array(MORPH * 3);
        const sh = new Float32Array(MORPH);
        const budget = Math.round(MORPH * SHAPE_FRAC.face);
        fillFaceFromPool(baked.pool, baked.aspect, pos, sh, budget, L);
        fillHalo(pos, sh, budget, MORPH, L, L.fhw * 0.82, L.fhw * baked.aspect * 0.82);
        shapes.current.face = { pos, shade: sh };
      } else {
        const pos = new Float32Array(MORPH * 3);
        const sh = new Float32Array(MORPH);
        const budget = Math.round(MORPH * SHAPE_FRAC.face);
        for (let i = 0; i < budget; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random());
          pos[i * 3] = L.fcx + Math.cos(a) * r * L.fhw * 0.6;
          pos[i * 3 + 1] = L.fcy + Math.sin(a) * r * L.fhh * 0.8;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
          sh[i] = 0.5 + Math.random() * 0.3;
        }
        fillHalo(pos, sh, budget, MORPH, L, L.fhw * 0.82, L.fhh * 0.82);
        shapes.current.face = { pos, shade: sh };
      }
      const now = performance.now();
      state.current.ready = true;
      state.current.holdUntil = now + SEED_HOLD;
      sky.current.ready = true;
      sky.current.start = now;
      // kick the sky: seed → sun (in sync with the morph field)
      sky.current.anim = { on: true, t: 0, dur: INTRO[0].dur / 1000, from: 0, to: 1 };
    });
  }, [size.width, size.height, MORPH, SKY, camera, geom, skyGeom, uniforms]); // eslint-disable-line react-hooks/exhaustive-deps

  const morphTo = (name: string, durMs: number, holdMs: number) => {
    const shp = shapes.current[name];
    if (!shp) return;
    const s = state.current;
    const hidden: "A" | "B" = s.shown === "A" ? "B" : "A";
    setM("aPos" + hidden, shp.pos);
    setM("aShade" + hidden, shp.shade);
    s.anim = { on: true, t: 0, dur: durMs / 1000, from: s.blend, to: hidden === "B" ? 1 : 0, slot: hidden };
    s.cur = name;
    s.nextHold = holdMs;
  };

  useFrame((_, delta) => {
    if (track.current) {
      track.current.position.copy(camera.position);
      track.current.quaternion.copy(camera.quaternion);
    }
    const m = matRef.current;
    const ms = matSkyRef.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const s = state.current;
    const cs = useConstellation.getState();

    m.uniforms.uTime.value += dt;
    m.uniforms.uPx.value = gl.getPixelRatio();
    m.uniforms.uShape.value = ID[s.cur] ?? 0;
    if (ms) {
      ms.uniforms.uTime.value += dt;
      ms.uniforms.uPx.value = gl.getPixelRatio();
    }

    // glow stays ON (additive) for dark skin always — density is what makes the
    // shapes read, not reduced glow.
    const loose = s.cur === "scatter" || s.cur === "explode" || s.cur === "seed" || s.cur === "sun" || s.anim.on;
    const holding = !s.anim.on && !loose;
    m.uniforms.uHold.value += ((holding ? 1 : 0) - m.uniforms.uHold.value) * Math.min(1, dt * 2.5);
    m.uniforms.uDrift.value += ((loose ? 1.6 : 0.42) - m.uniforms.uDrift.value) * Math.min(1, dt * 2);

    // warp portal: pull toward SCREEN centre (the sun), so re-aim uCenter on warp.
    const warpTarget = cs.warping ? 1 : 0;
    m.uniforms.uWarp.value += (warpTarget - m.uniforms.uWarp.value) * Math.min(1, dt * 1.4);
    if (ms) ms.uniforms.uWarp.value = m.uniforms.uWarp.value;
    if (cs.warping) {
      m.uniforms.uCenter.value.lerp(new THREE.Vector2(0, 0), Math.min(1, dt * 3));
      if (ms) ms.uniforms.uCenter.value.set(0, 0);
    }

    // ── sky timeline (independent of the morph field) ──
    if (ms && sky.current.ready && skyTargets.current) {
      const k = sky.current;
      if (k.anim.on) {
        k.anim.t += dt / k.anim.dur;
        const e = easeInOut(Math.min(1, k.anim.t));
        k.blend = k.anim.from + (k.anim.to - k.anim.from) * e;
        ms.uniforms.uBlend.value = k.blend;
        if (k.anim.t >= 1) {
          k.anim.on = false;
          k.phase += 1;
        }
      } else if (k.phase === 1 && now - k.start > INTRO[0].dur + INTRO[0].hold) {
        // sun → starfield, dispersing as the morph field heads left
        setS("aPosA", skyTargets.current.sun);
        setS("aPosB", skyTargets.current.star);
        k.blend = 0;
        ms.uniforms.uBlend.value = 0;
        k.anim = { on: true, t: 0, dur: 1.9, from: 0, to: 1 };
        k.phase = 2;
      }
    }

    if (!s.ready) return;

    // ── morph field timeline ──
    if (s.anim.on) {
      s.anim.t += dt / s.anim.dur;
      const e = easeInOut(Math.min(1, s.anim.t));
      s.blend = s.anim.from + (s.anim.to - s.anim.from) * e;
      m.uniforms.uBlend.value = s.blend;
      if (s.anim.t >= 1) {
        s.anim.on = false;
        s.shown = s.anim.slot;
        s.holdUntil = now + s.nextHold;
        if (s.cur === "face" && !faceFlag.current) {
          faceFlag.current = true;
          useConstellation.getState().setFaceFormed(true);
        }
      }
      return;
    }

    // museum warp: gather the morph field into the sun, then it swirls into the portal
    if (cs.warping) {
      if (s.cur !== "sun") morphTo("sun", 700, 1e9);
      return;
    }

    // intro script: seed → sun → scatter → face
    if (!s.introDone) {
      if (now > s.holdUntil) {
        if (s.step < INTRO.length) {
          const stp = INTRO[s.step++];
          morphTo(stp.name, stp.dur, stp.hold);
        } else {
          s.introDone = true;
          s.pl = -1; // PLAYLIST[0] = lightbulb plays next
        }
      }
      return;
    }

    // tour Play flocks the field away; restore the face when paused
    if (cs.playing && s.cur !== "explode") {
      morphTo("explode", TRANSITION, HOLD_OTHER);
    } else if (!cs.playing && s.cur === "explode") {
      morphTo("face", TRANSITION, HOLD_FACE);
    } else if (!cs.playing && now > s.holdUntil && s.cur !== "explode") {
      s.pl = (s.pl + 1) % PLAYLIST.length;
      const name = PLAYLIST[s.pl];
      morphTo(name, TRANSITION, name === "face" ? HOLD_FACE : HOLD_OTHER);
    }
  });

  void reduced;

  const darkBlend = skin === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending;

  return (
    <group ref={track}>
      <points geometry={skyGeom} position={[0, 0, -D]} frustumCulled={false} renderOrder={9}>
        <shaderMaterial
          ref={matSkyRef}
          uniforms={skyUniforms}
          vertexShader={VS_SKY}
          fragmentShader={FS_SKY}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={darkBlend}
        />
      </points>
      <points geometry={geom} position={[0, 0, -D]} frustumCulled={false} renderOrder={10}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VS}
          fragmentShader={FS}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={darkBlend}
        />
      </points>
    </group>
  );
}

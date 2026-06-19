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
  genOrb,
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
const ORIGIN2 = new THREE.Vector2(0, 0);

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
  orb: 12,
};

// the "design coming to life" sequence, with her face as the recurring heartbeat
const PLAYLIST = ["lightbulb", "bezier", "swatches", "face", "bauhaus", "ampersand", "face", "frame", "butterfly", "face"];

// fraction of the TOTAL pool each shape actually uses (so counts stay stable
// regardless of the sky split). The face is the hero (sparse line-portrait look);
// line shapes need far fewer points than filled silhouettes. Leftover beyond the
// shape becomes a small halo + faint deep dust (see fillHalo) — NOT a wide wash.
const SHAPE_FRAC: Record<string, number> = {
  face: 0.48,
  lightbulb: 0.26,
  bezier: 0.13,
  swatches: 0.17,
  bauhaus: 0.24,
  ampersand: 0.19,
  frame: 0.15,
  butterfly: 0.24,
};

const HALO_FRAC = 0.12; // small dim aura hugging each shape (fraction of total)
const SKY_FRAC = 0.16; // subtle persistent starfield (fraction of total)

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
attribute float aShadeA; attribute float aShadeB; attribute float aAlphaA; attribute float aAlphaB;
attribute float aSize; attribute float aSeed;
uniform float uBlend; uniform float uTime; uniform float uDrift; uniform float uPx;
uniform float uShape; uniform float uHold; uniform vec2 uCenter; uniform float uWarp; uniform float uToB;
uniform float uOrb; uniform float uGlow; uniform float uSolid; uniform float uBurst;
uniform vec3 uDim; uniform vec3 uBright;
varying vec3 vColor; varying float vAlpha; varying float vStar;
void main(){
  // ── per-particle STAGGERED progress: the swarm reassembles in a flowing wave,
  //    not a rigid uniform crossfade — so it reads as ONE living organism. ──
  float raw = uToB > 0.5 ? uBlend : (1.0 - uBlend);     // 0..1 toward destination
  float STG = 0.42;                                      // spread of the wave
  float local = clamp((raw - aSeed * STG) / (1.0 - STG), 0.0, 1.0);
  local = local * local * (3.0 - 2.0 * local);          // ease this particle's own arc
  float pm = uToB > 0.5 ? local : (1.0 - local);
  vec3 p = mix(aPosA, aPosB, pm);

  // ── opacity: each particle stays faint while travelling and ignites only as IT
  //    arrives, so the form lights up organically, particle by particle. ──
  float src = uToB > 0.5 ? aAlphaA : aAlphaB;
  float dst = uToB > 0.5 ? aAlphaB : aAlphaA;
  float ramp = dst >= src ? smoothstep(0.8, 1.0, local)  // brighten only at the end
                          : smoothstep(0.0, 0.2, local); // leaving → dim quickly
  float al = mix(src, dst, ramp);

  // role from the DESTINATION: 0 = shape, 1 = halo, 2 = background star
  float role = dst > 0.7 ? 0.0 : (dst > 0.31 ? 1.0 : 2.0);
  float isShape = role < 0.5 ? 1.0 : 0.0;
  float driftScale = role < 0.5 ? 1.0 : (role < 1.5 ? 0.32 : 0.0); // halo less; stars none
  vStar = role > 1.5 ? 1.0 : 0.0;

  float h = uHold;
  float cx = uCenter.x; float cy = uCenter.y; float T = uTime;

  // ── distinct per-shape motion — active shape particles only ──
  if (h > 0.001 && isShape > 0.5) {
    if (abs(uShape-2.0) < 0.5) {            // butterfly: soft flutter + gentle figure-8 drift
      float dx = p.x - cx;
      float ang = sin(T * 2.0) * 0.4 * h;
      p.x = cx + dx * cos(ang);
      p.z += dx * sin(ang);
      p.y += sin(T * 2.0) * 0.45 * h;
      p.x += sin(T * 0.6) * 0.5 * h;
    } else if (abs(uShape-1.0) < 0.5) {     // face: slow, living sway (no breathing pulse)
      p.x += sin(T * 0.32) * 0.28 * h;
      p.y += sin(T * 0.24 + 1.3) * 0.2 * h;
    } else if (abs(uShape-3.0) < 0.5) {     // lightbulb: fine electric hum / filament jitter
      p.x += sin(T * 9.0 + aSeed * 31.0) * 0.11 * h;
      p.y += cos(T * 8.0 + aSeed * 21.0) * 0.11 * h;
    } else if (abs(uShape-4.0) < 0.5) {     // bezier: a wave ripples along the curve
      p.y += sin(p.x * 0.26 - T * 2.0) * 0.7 * h;
    } else if (abs(uShape-5.0) < 0.5) {     // swatches: gentle rocking shuffle
      float a = sin(T * 0.9) * 0.07 * h;
      float ddx = p.x - cx; float ddy = p.y - cy;
      p.x = cx + ddx * cos(a) - ddy * sin(a);
      p.y = cy + ddx * sin(a) + ddy * cos(a);
    } else if (abs(uShape-6.0) < 0.5) {     // bauhaus: slow oscillating tilt
      float a = sin(T * 0.5) * 0.12 * h;
      float ddx = p.x - cx; float ddy = p.y - cy;
      p.x = cx + ddx * cos(a) - ddy * sin(a);
      p.y = cy + ddx * sin(a) + ddy * cos(a);
    } else if (abs(uShape-7.0) < 0.5) {     // ampersand: calligraphic italic sway (shear)
      p.x += (p.y - cy) * sin(T * 0.9) * 0.07 * h;
    } else if (abs(uShape-8.0) < 0.5) {     // frame: slow rotational drift
      float a = sin(T * 0.4) * 0.05 * h;
      float ddx = p.x - cx; float ddy = p.y - cy;
      p.x = cx + ddx * cos(a) - ddy * sin(a);
      p.y = cy + ddx * sin(a) + ddy * cos(a);
    }
  }

  // ── the sun is alive: a gentle churn + slow breathing (around screen centre) ──
  if (abs(uShape - 11.0) < 0.5) {
    vec2 cc = vec2(0.0);
    vec2 d = p.xy - cc;
    float r = length(d);
    float ang = atan(d.y, d.x);
    ang += T * 0.12 + (1.0 / (r * 0.16 + 1.0)) * 0.22 * sin(T * 0.5); // gentle swirl
    float pulse = 1.0 + 0.035 * sin(T * 0.8 + r * 0.15);              // slow breathing
    r *= pulse;
    p.xy = cc + vec2(cos(ang), sin(ang)) * r;
    p.z += sin(T * 1.0 + aSeed * 15.0) * 0.35;                        // subtle depth churn
  }

  // ── coherent FLOW while travelling: a smooth, position-based field so neighbours
  //    move TOGETHER (fluid, like smoke/a murmuration), enveloped to zero at each
  //    particle's own start & end. This is what makes it feel like one organism. ──
  float env = sin(3.14159265 * local);
  vec3 flow = vec3(
    sin(p.y * 0.13 + T * 0.5) + cos(p.z * 0.11 - T * 0.4),
    sin(p.z * 0.12 - T * 0.45) + cos(p.x * 0.10 + T * 0.5),
    sin(p.x * 0.11 + p.y * 0.09 + T * 0.35)
  );
  p += flow * env * 1.25;
  // faint travellers also drift gently downward, like falling stars
  float far = length(aPosB - aPosA);
  p.y -= env * min(far, 24.0) * 0.10 * (1.0 - al);

  // ── museum entry: alien living orb → solid light → shatter to white ──
  if (uOrb > 0.001) {
    vec3 rel = p;                       // orb is gathered at the origin (screen centre)
    float ca = cos(T * 0.4), sa = sin(T * 0.4);
    rel.xz = mat2(ca, sa, -sa, ca) * rel.xz;     // slow rotation about the vertical axis
    float rad = length(rel) + 1e-4;
    vec3 dir = rel / rad;
    // pronounced, multi-frequency alien writhe — several lobes drift over the surface
    float w1 = sin(dir.x * 3.0 + T * 1.1) + sin(dir.y * 3.7 - T * 0.9) + sin(dir.z * 3.2 + T * 0.7);
    float w2 = sin(dir.x * 6.0 - T * 0.5) * sin(dir.z * 5.0 + T * 0.6);   // turbulent detail
    float calm = 1.0 - uSolid;                    // surface smooths into a solid sphere near the peak
    float writhe = (w1 + w2 * 1.6) * 2.4 * calm;
    float pulse = 1.0 + 0.08 * sin(T * 1.4) * calm;
    p = mix(p, rel * pulse + dir * writhe, uOrb);
  }
  if (uBurst > 0.001) {                  // shatter into a million pieces, each its own way
    vec3 dir = normalize(p + vec3(1e-4));
    vec3 jit = vec3(sin(aSeed * 12.0), cos(aSeed * 23.0), sin(aSeed * 7.0 + 2.0));
    vec3 rdir = normalize(dir + jit * 0.7);
    // shards linger on-screen (big + white) so the blast itself floods to white
    p += rdir * uBurst * uBurst * 95.0;
  }

  vec3 drift = vec3(sin(p.y*0.18+T*0.5), cos(p.x*0.18+T*0.45), sin((p.x+p.y)*0.13+T*0.3)) * uDrift;
  drift += vec3(sin(T*1.3+aSeed*6.2831), cos(T*1.1+aSeed*5.0), 0.0) * 0.12;
  p += drift * driftScale;

  // per-star async twinkle — sharpened so it scintillates like the night sky
  float tw = 0.5 + 0.5 * sin(T * (0.7 + aSeed * 1.6) + aSeed * 40.0);
  tw = tw * tw;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float ptw = vStar > 0.5 ? (0.7 + 0.5 * tw) : 1.0; // subtle size sparkle for stars
  // grow as the orb solidifies so particles merge into one solid source of light
  gl_PointSize = aSize * uPx * (30.0 / max(1.0, -mv.z)) * ptw * (1.0 + uGlow * 1.7);

  float sh = mix(aShadeA, aShadeB, uBlend);
  vec3 baseCol = mix(uDim, uBright, clamp(sh + uOrb * 0.25, 0.0, 1.0));
  // gradual glow drives the orb to a solid white light, then full white on the burst
  vColor = mix(baseCol, vec3(1.0), clamp(uGlow * 0.9 + uBurst, 0.0, 1.0));
  // stars twinkle by dimming from their set opacity (peak stays at the set value)
  float starFade = vStar > 0.5 ? (0.55 + 0.45 * tw) : 1.0;
  vAlpha = al * starFade;
}
`;

const FS = `
precision mediump float;
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha; varying float vStar;
void main(){
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  // crisp dot for shape structure; soft round dot for background stars
  float a = vStar > 0.5 ? smoothstep(0.5, 0.0, d) : smoothstep(0.5, 0.42, d);
  gl_FragColor = vec4(vColor, a * uOpacity * vAlpha);
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
  if (uWarp > 0.001) {                            // rush to centre to join the orb, then fade
    vec2 d = p.xy - uCenter;
    float r = length(d);
    float a = atan(d.y, d.x) + uWarp * 5.0;
    r *= (1.0 - uWarp * 0.98);
    p.xy = uCenter + vec2(cos(a), sin(a)) * r;
  }
  // background stars twinkle in place — NO positional drift
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 1.6) + aSeed * 40.0);
  tw = tw * tw; // sharpen → scintillation
  vTw = tw;
  gl_PointSize = aSize * uPx * (30.0 / max(1.0, -mv.z)) * (0.55 + 0.5 * tw);
  vColor = mix(uDim, uBright, clamp(aShade * (0.7 + 0.3 * tw), 0.0, 1.0)) * (1.0 - uWarp); // fade into the burst
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
  // twinkle by dimming; peak stays at the same ~20% set opacity, not raised
  gl_FragColor = vec4(vColor, a * uOpacity * (0.10 + 0.16 * vTw));
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

  const shapes = useRef<Record<string, { pos: Float32Array; shade: Float32Array; alpha: Float32Array }>>({});
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
    warpT: 0,
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
    g.setAttribute("aAlphaA", new THREE.BufferAttribute(new Float32Array(MORPH).fill(1), 1));
    g.setAttribute("aAlphaB", new THREE.BufferAttribute(new Float32Array(MORPH).fill(1), 1));
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
      sz[i] = 0.55 + Math.random() * 1.05;
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
      uOrb: { value: 0 },
      uGlow: { value: 0 },
      uSolid: { value: 0 },
      uBurst: { value: 0 },
      uToB: { value: 1 },
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

  // build a morph shape: `frac`·count forms the shape (full opacity), a small halo
  // hugs it (dim), the rest become full-screen background stars (20%).
  const buildShape = (
    fill: (p: Float32Array, s: Float32Array, n: number, L: Layout) => void,
    frac: number,
    L: Layout,
    rx: number,
    ry: number,
    homePos: Float32Array,
    homeShade: Float32Array,
  ) => {
    const pos = new Float32Array(MORPH * 3);
    const sh = new Float32Array(MORPH);
    const al = new Float32Array(MORPH);
    const budget = Math.min(MORPH, Math.round(count * frac));
    const halo = Math.round(count * HALO_FRAC);
    fill(pos, sh, budget, L);
    for (let i = 0; i < budget; i++) al[i] = 1; // active shape particles → full glow
    fillHalo(pos, sh, al, budget, halo, MORPH, L, rx, ry, homePos, homeShade);
    return { pos, shade: sh, alpha: al };
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

    // each particle's PERMANENT background-star home (full-screen), shared by every
    // shape so stars stay put across morphs (only role-changers travel).
    const homePos = new Float32Array(MORPH * 3);
    const homeShade = new Float32Array(MORPH);
    genSky(homePos, homeShade, MORPH, L);

    const ones = () => new Float32Array(MORPH).fill(1);
    // formless states (seed/sun/scatter/explode) are all full glow — no halo/stars
    const full = (fn: (p: Float32Array, s: Float32Array, c: number, l: Layout) => void) => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      fn(pos, sh, MORPH, L);
      return { pos, shade: sh, alpha: ones() };
    };

    shapes.current.seed = (() => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      genSeed(pos, sh, MORPH);
      return { pos, shade: sh, alpha: ones() };
    })();
    shapes.current.sun = (() => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      genSun(pos, sh, MORPH);
      return { pos, shade: sh, alpha: ones() };
    })();
    shapes.current.orb = (() => {
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      genOrb(pos, sh, MORPH);
      return { pos, shade: sh, alpha: ones() };
    })();
    shapes.current.scatter = full(genScatter);
    shapes.current.explode = full(genExplode);

    // vector shapes — square-ish halo box around the left face column
    const vr = L.fhw * 1.05;
    shapes.current.butterfly = buildShape(genButterfly, SHAPE_FRAC.butterfly, L, vr, vr, homePos, homeShade);
    shapes.current.lightbulb = buildShape(genLightbulb, SHAPE_FRAC.lightbulb, L, vr, vr, homePos, homeShade);
    shapes.current.bezier = buildShape(genBezier, SHAPE_FRAC.bezier, L, vr, vr, homePos, homeShade);
    shapes.current.swatches = buildShape(genSwatches, SHAPE_FRAC.swatches, L, vr, vr, homePos, homeShade);
    shapes.current.bauhaus = buildShape(genBauhaus, SHAPE_FRAC.bauhaus, L, vr, vr, homePos, homeShade);
    shapes.current.ampersand = buildShape(genAmpersand, SHAPE_FRAC.ampersand, L, vr, vr, homePos, homeShade);
    shapes.current.frame = buildShape(genFrame, SHAPE_FRAC.frame, L, vr, vr, homePos, homeShade);

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
    setM("aAlphaA", shapes.current.seed.alpha);
    setM("aAlphaB", shapes.current.seed.alpha);

    loadBakedFace().then((baked) => {
      const halo = Math.round(count * HALO_FRAC);
      const pos = new Float32Array(MORPH * 3);
      const sh = new Float32Array(MORPH);
      const al = new Float32Array(MORPH);
      const budget = Math.min(MORPH, Math.round(count * SHAPE_FRAC.face));
      if (baked) {
        fillFaceFromPool(baked.pool, baked.aspect, pos, sh, budget, L);
        for (let i = 0; i < budget; i++) al[i] = 1;
        fillHalo(pos, sh, al, budget, halo, MORPH, L, L.fhw * 0.8, L.fhw * baked.aspect * 0.8, homePos, homeShade);
      } else {
        for (let i = 0; i < budget; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random());
          pos[i * 3] = L.fcx + Math.cos(a) * r * L.fhw * 0.6;
          pos[i * 3 + 1] = L.fcy + Math.sin(a) * r * L.fhh * 0.8;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
          sh[i] = 0.5 + Math.random() * 0.3;
          al[i] = 1;
        }
        fillHalo(pos, sh, al, budget, halo, MORPH, L, L.fhw * 0.8, L.fhh * 0.8, homePos, homeShade);
      }
      shapes.current.face = { pos, shade: sh, alpha: al };
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
    setM("aAlpha" + hidden, shp.alpha);
    if (matRef.current) matRef.current.uniforms.uToB.value = hidden === "B" ? 1 : 0;
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
    // calmer base drift once a shape is formed, so its own designed motion reads
    m.uniforms.uDrift.value += ((loose ? 1.6 : 0.22) - m.uniforms.uDrift.value) * Math.min(1, dt * 2);

    // ── museum entry sequence (runs even while the gather morph is animating) ──
    //   0.0–2.0s  particles slowly gather into the orb
    //   1.4–2.8s  it comes alive — an alien, writhing organism
    //   2.8–4.7s  it glows, gradually, into a solid source of light
    //   4.0–4.8s  the surface calms; it's now a solid, blinding orb
    //   4.9–5.7s  it shatters into a million pieces; the screen blows to white
    if (cs.warping) {
      s.warpT += dt;
      const wt = s.warpT;
      const cl = (x: number) => Math.max(0, Math.min(1, x));
      m.uniforms.uWarp.value += (1 - m.uniforms.uWarp.value) * Math.min(1, dt * 1.6);
      m.uniforms.uCenter.value.lerp(ORIGIN2, Math.min(1, dt * 3));
      m.uniforms.uOrb.value = cl((wt - 1.4) / 1.4);
      m.uniforms.uGlow.value = cl((wt - 2.8) / 1.9);
      m.uniforms.uSolid.value = cl((wt - 4.0) / 0.8);
      m.uniforms.uBurst.value = cl((wt - 4.9) / 1.0); // shatter over a full second, in view
      if (ms) {
        ms.uniforms.uWarp.value = m.uniforms.uWarp.value;
        ms.uniforms.uCenter.value.set(0, 0);
      }
    } else {
      s.warpT = 0;
      m.uniforms.uWarp.value += (0 - m.uniforms.uWarp.value) * Math.min(1, dt * 1.4);
      m.uniforms.uOrb.value = 0;
      m.uniforms.uGlow.value = 0;
      m.uniforms.uSolid.value = 0;
      m.uniforms.uBurst.value = 0;
      if (ms) ms.uniforms.uWarp.value = m.uniforms.uWarp.value;
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

    // museum entry: slowly gather the whole field into the living orb (then it bursts)
    if (cs.warping) {
      if (s.cur !== "orb") morphTo("orb", 2000, 1e9);
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

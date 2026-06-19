import * as THREE from "three";
import { milestones } from "@/data/timeline";
import { getExhibits } from "@/content";
import type { CareerPhase, Exhibit, Milestone } from "@/data/types";
import { PHASE_HUE, PHASE_LABEL } from "@/lib/timeline-layout";

export { PHASE_HUE, PHASE_LABEL };

// Muted, gilded phase tints for the light "Antique Atlas" skin (the dark skin
// uses the vivid PHASE_HUE above).
export const PHASE_HUE_LIGHT: Record<CareerPhase, string> = {
  foundation: "#6a6f8a",
  production: "#9c6b2e",
  identity: "#9c7a2a",
  integrated: "#3f7d6f",
};

// Two complete palettes. `dark` = Deep Cosmos (default), `light` = Antique Atlas.
export const SKIN = {
  dark: {
    bg: "#06060e",
    fog: "#06060e",
    star: "#ffffff",
    spine: "#c9a227",
    spineLit: "#f0d488",
    ink: "#ece9e0",
    dim: "#9aa0ad",
    bloom: 1.1,
  },
  light: {
    bg: "#ece2cd",
    fog: "#e6dcc4",
    star: "#5c4f37",
    spine: "#4a3f2b",
    spineLit: "#b08a2e",
    ink: "#2a2417",
    dim: "#6e6044",
    bloom: 0.0,
  },
} as const;

export type SkinName = keyof typeof SKIN;

export interface StarNode {
  m: Milestone;
  pos: THREE.Vector3;
  size: number;
  hue: string; // vivid phase hue (dark skin)
  hueLight: string; // muted phase hue (light skin)
  exhibits: Exhibit[];
  // 2D-compat fields so the existing MilestonePlacard can render this node
  x: number;
  y: number;
  r: number;
}

// Career as a spiral: earliest milestone near a quiet core, the present blooming
// at the outer arm. Angle advances and radius grows continuously with career
// order, so the shape itself reads as the journey. Both the nodes and the spine
// sample the SAME parametric spiral, so the path is perfectly smooth (no kinks).
const A = 2.4; // core radius
const B = 1.28; // radius growth per milestone
const STEP = 1.12; // angle advance per milestone (radians) → ~1.25 turns over 8
const START = -1.9; // starting angle
const Y_SQUASH = 0.9; // gently flatten so it frames in a 16:9 viewport

// The continuous spiral, parameterised in node-index space (u may be fractional).
export function spiralPoint(u: number): THREE.Vector3 {
  const theta = START + u * STEP;
  const radius = A + u * B;
  return new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius * Y_SQUASH, 0);
}

function significance(m: Milestone, exhibitCount: number): number {
  let s = 0.52;
  s += 0.07 * exhibitCount;
  if (m.kind === "role") s += 0.14;
  if (m.phase === "integrated") s += 0.42;
  return Math.min(1.7, s);
}

let cache: StarNode[] | null = null;

export function getConstellation(): StarNode[] {
  if (cache) return cache;
  const all = getExhibits();
  cache = [...milestones]
    .sort((a, b) => a.order - b.order)
    .map((m, i) => {
      const pos = spiralPoint(i);
      const exhibits = m.exhibitSlugs
        .map((s) => all.find((e) => e.slug === s))
        .filter(Boolean) as Exhibit[];
      const size = significance(m, exhibits.length);
      return {
        m,
        pos,
        size,
        hue: PHASE_HUE[m.phase],
        hueLight: PHASE_HUE_LIGHT[m.phase],
        exhibits,
        x: pos.x,
        y: pos.y,
        r: size,
      } satisfies StarNode;
    });
  return cache;
}

// Smooth spiral curve threading the milestones — sampled directly from the
// parametric spiral (so it never kinks), extended slightly past either end.
export function getSpineCurve(): THREE.CatmullRomCurve3 {
  const n = getConstellation().length;
  const pts: THREE.Vector3[] = [];
  const u0 = -0.45;
  const u1 = n - 1 + 0.55;
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    pts.push(spiralPoint(u0 + ((u1 - u0) * i) / steps));
  }
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
}

// Overview framing: distance the camera needs to see the whole spiral.
export function getBounds(): { center: THREE.Vector3; radius: number } {
  const nodes = getConstellation();
  const box = new THREE.Box3();
  nodes.forEach((n) => box.expandByPoint(n.pos));
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  return { center, radius: Math.max(size.x, size.y) * 0.5 + 3 };
}

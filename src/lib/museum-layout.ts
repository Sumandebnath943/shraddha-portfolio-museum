import { getExhibitsByWing, wings } from "@/content";
import type { Exhibit, WingId } from "@/data/types";

// ───────────────────────── Grand Spine floorplan ─────────────────────────
// Units = metres. Floor at y=0, ceiling at WALL_H. A long central nave runs
// south(+z, entrance) → north(−z), with discipline bays opening off it.
export const WALL_H = 5;
export const WALL_T = 0.3;
export const EYE_H = 1.65;
export const ART_CENTER_Y = 1.72;

export interface Seg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

// Walkable rectangles (overlap at openings → one connected space).
export const ROOMS: Record<string, Rect> = {
  entrance: { x0: -12, x1: 12, z0: 13, z1: 24 },
  nave: { x0: -4, x1: 4, z0: -52, z1: 13 },
  identity: { x0: -20, x1: -4, z0: -1, z1: 13 }, // left near
  print: { x0: 4, x1: 20, z0: -1, z1: 13 }, // right near
  social: { x0: -20, x1: -4, z0: -31, z1: -17 }, // left far
  marketing: { x0: 4, x1: 20, z0: -31, z1: -17 }, // right far
  information: { x0: -12, x1: 12, z0: -66, z1: -52 }, // north terminus
};

export const FLOOR_BOUNDS = { x0: -21, x1: 21, z0: -67, z1: 25 };

// Solid wall segments (collision + rendering). Openings are simply omitted.
export const WALLS: Seg[] = [
  // entrance hall
  { x1: -12, z1: 24, x2: 12, z2: 24 }, // south title wall
  { x1: -12, z1: 13, x2: -12, z2: 24 }, // west
  { x1: 12, z1: 13, x2: 12, z2: 24 }, // east
  { x1: -12, z1: 13, x2: -4, z2: 13 }, // north-left (opening x:-4..4)
  { x1: 4, z1: 13, x2: 12, z2: 13 }, // north-right

  // nave west wall (x=-4) — gaps at identity (z-1..13) & social (z-17..-31)
  { x1: -4, z1: -1, x2: -4, z2: -17 },
  { x1: -4, z1: -31, x2: -4, z2: -52 },
  // nave east wall (x=4) — gaps at print & marketing
  { x1: 4, z1: -1, x2: 4, z2: -17 },
  { x1: 4, z1: -31, x2: 4, z2: -52 },

  // identity bay (left near)
  { x1: -20, z1: -1, x2: -20, z2: 13 }, // far wall
  { x1: -20, z1: 13, x2: -4, z2: 13 }, // back (entrance side)
  { x1: -20, z1: -1, x2: -4, z2: -1 }, // front

  // print bay (right near)
  { x1: 20, z1: -1, x2: 20, z2: 13 },
  { x1: 4, z1: 13, x2: 20, z2: 13 },
  { x1: 4, z1: -1, x2: 20, z2: -1 },

  // social bay (left far)
  { x1: -20, z1: -31, x2: -20, z2: -17 },
  { x1: -20, z1: -17, x2: -4, z2: -17 },
  { x1: -20, z1: -31, x2: -4, z2: -31 },

  // marketing bay (right far)
  { x1: 20, z1: -31, x2: 20, z2: -17 },
  { x1: 4, z1: -17, x2: 20, z2: -17 },
  { x1: 4, z1: -31, x2: 20, z2: -31 },

  // information terminus (north) — opening to nave at x:-4..4, z=-52
  { x1: -12, z1: -52, x2: -4, z2: -52 },
  { x1: 4, z1: -52, x2: 12, z2: -52 },
  { x1: -12, z1: -66, x2: -12, z2: -52 },
  { x1: 12, z1: -66, x2: 12, z2: -52 },
  { x1: -12, z1: -66, x2: 12, z2: -66 }, // north back wall
];

// A wall "run" on which exhibits are hung. normal points into the room.
// `cap` = max well-spaced slots on this run (≈ 1 per 4.5 m).
interface Run {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  nx: number;
  nz: number;
  cap: number;
}

// Each wing uses its bay's far wall + both side walls (ordered: far first, then
// sides), so fronts face the nave and pieces stay well-spaced (no dense rows).
// Exhibits fill far walls first, then spill onto the side walls.
const WING_RUNS: Record<WingId, Run[]> = {
  identity: [
    { x1: -19.78, z1: 11.4, x2: -19.78, z2: 0.4, nx: 1, nz: 0, cap: 3 }, // far x=-20
    { x1: -18.5, z1: -0.8, x2: -5.5, z2: -0.8, nx: 0, nz: 1, cap: 3 }, // south z=-1
    { x1: -18.5, z1: 12.8, x2: -5.5, z2: 12.8, nx: 0, nz: -1, cap: 3 }, // north z=13
  ],
  print: [
    { x1: 19.78, z1: 11.4, x2: 19.78, z2: 0.4, nx: -1, nz: 0, cap: 3 }, // far x=20
    { x1: 5.5, z1: -0.8, x2: 18.5, z2: -0.8, nx: 0, nz: 1, cap: 3 }, // south z=-1
    { x1: 5.5, z1: 12.8, x2: 18.5, z2: 12.8, nx: 0, nz: -1, cap: 3 }, // north z=13
  ],
  social: [
    { x1: -19.78, z1: -18.4, x2: -19.78, z2: -29.6, nx: 1, nz: 0, cap: 3 }, // far x=-20
    { x1: -18.5, z1: -30.8, x2: -5.5, z2: -30.8, nx: 0, nz: 1, cap: 3 }, // south z=-31
    { x1: -18.5, z1: -17.2, x2: -5.5, z2: -17.2, nx: 0, nz: -1, cap: 3 }, // north z=-17
  ],
  marketing: [
    { x1: 19.78, z1: -18.4, x2: 19.78, z2: -29.6, nx: -1, nz: 0, cap: 3 }, // far x=20
    { x1: 5.5, z1: -30.8, x2: 18.5, z2: -30.8, nx: 0, nz: 1, cap: 3 }, // south z=-31
    { x1: 5.5, z1: -17.2, x2: 18.5, z2: -17.2, nx: 0, nz: -1, cap: 3 }, // north z=-17
  ],
  infographics: [
    { x1: -10.5, z1: -65.78, x2: 10.5, z2: -65.78, nx: 0, nz: 1, cap: 5 }, // north feature
    { x1: 11.78, z1: -53.5, x2: 11.78, z2: -64.5, nx: -1, nz: 0, cap: 3 }, // east x=12
    { x1: -11.78, z1: -53.5, x2: -11.78, z2: -64.5, nx: 1, nz: 0, cap: 3 }, // west x=-12
  ],
};

export interface ExhibitPlacement {
  exhibit: Exhibit;
  pos: [number, number, number];
  rotationY: number;
  normal: [number, number];
  accent: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Fill a wing's runs in order (far wall first), capped per run, spacing the
// pieces evenly for whatever count actually lands on each run.
export function getPlacements(): ExhibitPlacement[] {
  const out: ExhibitPlacement[] = [];
  for (const wing of wings) {
    const list = getExhibitsByWing(wing.id);
    const runs = WING_RUNS[wing.id];
    let idx = 0;
    for (const r of runs) {
      const take = Math.min(r.cap, list.length - idx);
      for (let k = 0; k < take; k++) {
        const t = (k + 1) / (take + 1);
        out.push({
          exhibit: list[idx],
          pos: [lerp(r.x1, r.x2, t), ART_CENTER_Y, lerp(r.z1, r.z2, t)],
          rotationY: Math.atan2(r.nx, r.nz),
          normal: [r.nx, r.nz],
          accent: wing.accent,
        });
        idx++;
      }
      if (idx >= list.length) break;
    }
  }
  return out;
}

// Total well-spaced slots across every wing wall, vs. how many are filled now.
export function getCapacityInfo() {
  const capacity = Object.values(WING_RUNS)
    .flat()
    .reduce((sum, r) => sum + r.cap, 0);
  const filled = getPlacements().length;
  const perWing = wings.map((w) => ({
    wing: w.name,
    cap: WING_RUNS[w.id].reduce((s, r) => s + r.cap, 0),
    filled: getExhibitsByWing(w.id).length,
  }));
  return { capacity, filled, perWing };
}

// Minimal seating: a low plinth bench in each bay + nave, for viewing the art.
export interface Bench {
  pos: [number, number, number];
  size: [number, number, number];
}
export const BENCHES: Bench[] = [
  { pos: [-12, 0.21, 6], size: [0.62, 0.42, 1.9] }, // identity bay
  { pos: [12, 0.21, 6], size: [0.62, 0.42, 1.9] }, // print bay
  { pos: [-12, 0.21, -24], size: [0.62, 0.42, 1.9] }, // social bay
  { pos: [12, 0.21, -24], size: [0.62, 0.42, 1.9] }, // marketing bay
  { pos: [0, 0.21, -58], size: [2.4, 0.42, 0.62] }, // information terminus
  // nave benches, on the runner (you walk around them)
  { pos: [0, 0.21, 4], size: [0.6, 0.42, 1.8] },
  { pos: [0, 0.21, -16], size: [0.6, 0.42, 1.8] },
  { pos: [0, 0.21, -34], size: [0.6, 0.42, 1.8] },
];

// Seated eye height when a visitor sits on a bench (vs. EYE_H standing).
export const SEAT_EYE_H = 1.15;

// One sit-spot per bench: where the camera parks when seated, and the point it
// initially faces (the art that bench is meant for). When idle, the view slowly
// pans around this heading. `yaw` is the world heading toward `look`.
export interface Seat {
  pos: [number, number, number]; // seated eye position
  look: [number, number]; // x,z the visitor faces when they sit
}
export const SEATS: Seat[] = [
  { pos: [-11.2, SEAT_EYE_H, 6], look: [-20, 6] }, // identity bay → far wall
  { pos: [11.2, SEAT_EYE_H, 6], look: [20, 6] }, // print bay
  { pos: [-11.2, SEAT_EYE_H, -24], look: [-20, -24] }, // social bay
  { pos: [11.2, SEAT_EYE_H, -24], look: [20, -24] }, // marketing bay
  { pos: [0, SEAT_EYE_H, -57.3], look: [0, -66] }, // information terminus → feature
  { pos: [0, SEAT_EYE_H, 4], look: [-20, 4] }, // nave benches sweep the side bays
  { pos: [0, SEAT_EYE_H, -16], look: [20, -16] },
  { pos: [0, SEAT_EYE_H, -34], look: [-20, -34] },
];

// Soft floor rugs — warm anchors that break up the polished floor.
export interface Carpet {
  pos: [number, number, number];
  size: [number, number];
}
export const CARPETS: Carpet[] = [
  { pos: [0, 0.012, -19.5], size: [3.0, 63] }, // nave runner (z ≈ 12 → −51)
  { pos: [-12, 0.012, 6], size: [7, 7] }, // identity bay
  { pos: [12, 0.012, 6], size: [7, 7] }, // print bay
  { pos: [-12, 0.012, -24], size: [7, 7] }, // social bay
  { pos: [12, 0.012, -24], size: [7, 7] }, // marketing bay
  { pos: [0, 0.012, -58], size: [10, 7] }, // information terminus
];

// ───────────────────────── Download kiosk ─────────────────────────
// A free-standing info kiosk in the middle of the nave, halfway down the hall.
// Visitors walking up to it can download the résumé or the portfolio.
export const KIOSK: { pos: [number, number, number]; rotationY: number; radius: number } = {
  pos: [0, 0, -20],
  rotationY: 0, // screen faces south (+z), toward visitors walking up the nave
  radius: 0.6,
};

// ───────────────────────── Decorative models ─────────────────────────
// CC0 GLB props (see src/lib/decor-credits.ts). `height` normalises each model
// to a real-world size (the loader scales by bounding box). `onPedestal` stands
// the prop on a plinth. Kept sparse so the museum reads furnished, not cluttered.
export type DecorSlug =
  | "monstera"
  | "monstera-large"
  | "snake-plant"
  | "houseplant"
  | "fern"
  | "palm"
  | "tree"
  | "horse-statue"
  | "stag-statue";

export interface DecorItem {
  slug: DecorSlug;
  pos: [number, number, number]; // floor position (y is the base height, usually 0)
  height: number; // target world height in metres
  rotationY?: number;
  onPedestal?: boolean; // place a plinth under it (its base sits on the plinth top)
  radius?: number; // collision footprint (0 = walk-through, e.g. small plants)
}

const PEDESTAL_H = 0.9;

export const DECOR: DecorItem[] = [
  // — Entrance hall (z 13–24): grand, gallery-like welcome (no artworks here).
  //   Columns here are procedural (see Architecture) — these are statues + big foliage. —
  { slug: "horse-statue", pos: [-7.6, PEDESTAL_H, 17.5], height: 1.1, rotationY: Math.PI / 2, onPedestal: true, radius: 0.55 },
  { slug: "stag-statue", pos: [7.6, PEDESTAL_H, 17.5], height: 1.2, rotationY: -Math.PI / 2, onPedestal: true, radius: 0.55 },
  { slug: "tree", pos: [-10.6, 0, 14.8], height: 3.0, radius: 0.5 }, // big indoor tree
  { slug: "tree", pos: [10.6, 0, 14.8], height: 3.0, radius: 0.5 },
  { slug: "monstera-large", pos: [-10.6, 0, 20.5], height: 2.0, radius: 0.4 },
  { slug: "monstera-large", pos: [10.6, 0, 20.5], height: 2.0, radius: 0.4 },

  // — Bay corners: a tall plant in each, tucked by the far wall to frame the art —
  { slug: "palm", pos: [-18.7, 0, 0.7], height: 2.6, radius: 0 },
  { slug: "palm", pos: [18.7, 0, 0.7], height: 2.6, radius: 0 },
  { slug: "monstera-large", pos: [-18.7, 0, 12.2], height: 2.0, radius: 0 },
  { slug: "monstera-large", pos: [18.7, 0, 12.2], height: 2.0, radius: 0 },
  { slug: "palm", pos: [-18.7, 0, -30.4], height: 2.6, radius: 0 },
  { slug: "snake-plant", pos: [18.7, 0, -30.4], height: 1.5, radius: 0 },
  { slug: "fern", pos: [-18.7, 0, -18.0], height: 1.2, radius: 0 },
  { slug: "monstera", pos: [18.7, 0, -18.0], height: 1.4, radius: 0 },

  // — Information terminus: big foliage flanking the feature wall —
  { slug: "tree", pos: [-10.9, 0, -64.4], height: 3.0, radius: 0 },
  { slug: "tree", pos: [10.9, 0, -64.4], height: 3.0, radius: 0 },
  { slug: "snake-plant", pos: [-7.5, 0, -53.6], height: 1.5, radius: 0 },
  { slug: "snake-plant", pos: [7.5, 0, -53.6], height: 1.5, radius: 0 },

  // — Nave: ferns softening the long walk near the kiosk —
  { slug: "fern", pos: [-3.4, 0, -45], height: 1.1, radius: 0 },
  { slug: "fern", pos: [3.4, 0, -45], height: 1.1, radius: 0 },
  { slug: "monstera", pos: [-3.4, 0, -8], height: 1.4, radius: 0 },
  { slug: "monstera", pos: [3.4, 0, -8], height: 1.4, radius: 0 },
];

// ───────────────────────── Avatar guide ─────────────────────────
// Shraddha's guide-avatar (public/models/assistant.glb). She idles/greets at a
// home spot near the entrance and, when animations are present, patrols a route
// down the right side of the nave (kept clear of the centre benches + kiosk).
export const ASSISTANT = {
  home: [2.4, 0, 16.5] as [number, number, number], // greeter spot just inside the doors
  height: 1.7, // normalised world height (metres)
  greetRange: 4.0, // player distance that triggers a greeting
  bowRange: 2.0, // closer still → a bow
  walkSpeed: 1.1, // m/s while patrolling
  // patrol waypoints (x kept ~2.4 to clear the nave benches at x=0 and the kiosk)
  path: [
    [2.4, 0, 16.5],
    [2.4, 0, 6],
    [2.4, 0, -10],
    [2.4, 0, -30],
    [2.4, 0, -44],
  ] as [number, number, number][],
};

// Procedural marble columns flanking the entrance title wall (rendered in
// Architecture, not from a GLB — the GLB column read as a cheap baluster).
export const COLUMNS: { pos: [number, number, number]; height: number }[] = [
  { pos: [-7.4, 0, 21.8], height: 4.0 },
  { pos: [7.4, 0, 21.8], height: 4.0 },
];

// Wing nameplate signage positions (on the far/feature wall of each bay).
export const WING_SIGNS: { wing: WingId; pos: [number, number, number]; rotationY: number }[] = [
  { wing: "identity", pos: [-19.5, 3.5, 6], rotationY: Math.PI / 2 },
  { wing: "print", pos: [19.5, 3.5, 6], rotationY: -Math.PI / 2 },
  { wing: "social", pos: [-19.5, 3.5, -24], rotationY: Math.PI / 2 },
  { wing: "marketing", pos: [19.5, 3.5, -24], rotationY: -Math.PI / 2 },
  { wing: "infographics", pos: [0, 3.6, -65.5], rotationY: 0 },
];

// Player spawn: just inside the entrance hall, facing north up the nave.
export const SPAWN = { x: 0, z: 20, heading: Math.PI };

// Bench footprints as collision segments (so you walk around the seating).
const BENCH_SEGS: Seg[] = BENCHES.flatMap((b) => {
  const hw = b.size[0] / 2;
  const hd = b.size[2] / 2;
  const [cx, , cz] = b.pos;
  return [
    { x1: cx - hw, z1: cz - hd, x2: cx + hw, z2: cz - hd },
    { x1: cx + hw, z1: cz - hd, x2: cx + hw, z2: cz + hd },
    { x1: cx + hw, z1: cz + hd, x2: cx - hw, z2: cz + hd },
    { x1: cx - hw, z1: cz + hd, x2: cx - hw, z2: cz - hd },
  ];
});

// Square footprints for solid props (kiosk + decor with a collision radius), so
// visitors walk around statues, planters and the kiosk instead of through them.
function footprint(cx: number, cz: number, r: number): Seg[] {
  return [
    { x1: cx - r, z1: cz - r, x2: cx + r, z2: cz - r },
    { x1: cx + r, z1: cz - r, x2: cx + r, z2: cz + r },
    { x1: cx + r, z1: cz + r, x2: cx - r, z2: cz + r },
    { x1: cx - r, z1: cz + r, x2: cx - r, z2: cz - r },
  ];
}
const PROP_SEGS: Seg[] = [
  ...footprint(KIOSK.pos[0], KIOSK.pos[2], KIOSK.radius),
  ...DECOR.filter((d) => (d.radius ?? 0) > 0).flatMap((d) => footprint(d.pos[0], d.pos[2], d.radius!)),
  ...COLUMNS.flatMap((c) => footprint(c.pos[0], c.pos[2], 0.45)),
];

const COLLIDERS: Seg[] = [...WALLS, ...BENCH_SEGS, ...PROP_SEGS];

// ── collision: keep a radius-r disc clear of every wall + bench segment ──
export function collide(px: number, pz: number, radius = 0.45): [number, number] {
  let x = px;
  let z = pz;
  for (const w of COLLIDERS) {
    const ax = w.x1;
    const az = w.z1;
    const bx = w.x2;
    const bz = w.z2;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t;
    const cz = az + dz * t;
    const ox = x - cx;
    const oz = z - cz;
    const dist = Math.hypot(ox, oz);
    if (dist < radius) {
      const push = (radius - dist) || radius;
      const nx = dist > 1e-4 ? ox / dist : 1;
      const nz = dist > 1e-4 ? oz / dist : 0;
      x += nx * push;
      z += nz * push;
    }
  }
  return [x, z];
}

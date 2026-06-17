import { milestones } from "@/data/timeline";
import { getExhibits } from "@/content";
import type { CareerPhase } from "@/data/types";

// Hand-tuned constellation positions (world units, centred on 0,0).
// Chronological left→right with organic vertical drift so the career reads as
// a star map rather than a straight line. Node radius encodes significance.
const POS: Record<string, { x: number; y: number; r: number }> = {
  "visual-communication-design": { x: -1380, y: -120, r: 22 },
  "spatial-planning": { x: -940, y: 200, r: 18 },
  "msw-social-insight": { x: -860, y: -280, r: 18 },
  "software-training": { x: -520, y: 40, r: 16 },
  "print-production": { x: -300, y: -210, r: 20 },
  "branding-packaging": { x: 140, y: 200, r: 24 },
  "integrated-brand-communication": { x: 760, y: -70, r: 34 },
  "multidisciplinary-practice": { x: 1320, y: 150, r: 26 },
};

// The continuous spine threading the nodes in career order.
const SPINE_ORDER = [
  "visual-communication-design",
  "spatial-planning",
  "msw-social-insight",
  "software-training",
  "print-production",
  "branding-packaging",
  "integrated-brand-communication",
  "multidisciplinary-practice",
];

export const PHASE_HUE: Record<CareerPhase, string> = {
  foundation: "#6f8cff",
  production: "#d8973f",
  identity: "#c9a227",
  integrated: "#4fb39a",
};

export const PHASE_LABEL: Record<CareerPhase, string> = {
  foundation: "Foundation",
  production: "Production",
  identity: "Identity",
  integrated: "Integrated Practice",
};

export interface PositionedMilestone {
  m: (typeof milestones)[number];
  x: number;
  y: number;
  r: number;
  hue: string;
  /** Representative exhibits (with images) for this milestone. */
  exhibits: ReturnType<typeof getExhibits>;
}

export function getPositionedMilestones(): PositionedMilestone[] {
  const all = getExhibits();
  return milestones.map((m) => {
    const p = POS[m.id] ?? { x: 0, y: 0, r: 20 };
    return {
      m,
      x: p.x,
      y: p.y,
      r: p.r,
      hue: PHASE_HUE[m.phase],
      exhibits: m.exhibitSlugs
        .map((s) => all.find((e) => e.slug === s))
        .filter(Boolean) as ReturnType<typeof getExhibits>,
    };
  });
}

export function getSpineSegments(): { ax: number; ay: number; bx: number; by: number }[] {
  const segs: { ax: number; ay: number; bx: number; by: number }[] = [];
  for (let i = 0; i < SPINE_ORDER.length - 1; i++) {
    const a = POS[SPINE_ORDER[i]];
    const b = POS[SPINE_ORDER[i + 1]];
    if (a && b) segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
  }
  return segs;
}

// World bounds used to frame the "zoom-to-fit" overview.
export const WORLD = { minX: -1500, maxX: 1450, minY: -360, maxY: 320 };

// Year axis ticks for the faded chronological baseline.
export const YEAR_TICKS = [2014, 2016, 2018, 2020, 2022, 2024, 2025];
export function yearToX(year: number): number {
  // Maps the 2014..2025 span across the populated x-range.
  const t = (year - 2014) / (2025 - 2014);
  return -1380 + t * (1320 - -1380);
}

// Canonical content types for the Shraddha Sonel design museum.
// These are the source of truth the timeline + 3D museum + placards read from.
// At build time, scripts/optimize-images.mjs augments exhibits with generated
// image variants, and scripts/ingest.mjs can enrich placard copy via Groq + Neon.

export type CareerPhase =
  | "foundation" // education / early training
  | "production" // print, signage, packaging hands-on
  | "identity" // branding & packaging
  | "integrated"; // integrated brand communication / present

export interface Milestone {
  id: string;
  /** Chronological order, 0 = earliest. */
  order: number;
  title: string;
  organization: string;
  location: string;
  /** Display string e.g. "2019 – Present". */
  dates: string;
  startYear: number;
  /** undefined === present. */
  endYear?: number;
  phase: CareerPhase;
  kind: "education" | "training" | "role";
  /** One-line summary shown on the node. */
  tagline: string;
  responsibilities: string[];
  skills: string[];
  /** Design disciplines learned/sharpened in this period. */
  disciplines: string[];
  achievements: string[];
  /** Longer generated-style narrative shown on the placard. */
  narrative: string;
  /** Exhibit slugs representative of this period. */
  exhibitSlugs: string[];
  /** Position on the constellation canvas (normalized -1..1, set in timeline layout). */
}

export type WingId =
  | "identity"
  | "print"
  | "social"
  | "marketing"
  | "infographics";

export interface Wing {
  id: WingId;
  name: string;
  /** Short museum-signage subtitle. */
  subtitle: string;
  /** Curatorial intro shown at the wing entrance. */
  intro: string;
  /** Accent color for signage + spotlights (hex). */
  accent: string;
}

export interface Exhibit {
  slug: string;
  /** Original file name in /design assets. */
  source: string;
  title: string;
  /** Human category label (matches the sheet caption). */
  category: string;
  wing: WingId;
  client?: string;
  /** Display string e.g. "2019 – 2025". */
  year: string;
  /** Used for timeline filtering. */
  startYear: number;
  endYear: number;
  phase: CareerPhase;
  /** Skills/tools tags for filtering. */
  tags: string[];
  /** What the piece visibly is — grounds generated copy; not shown verbatim. */
  brief: string;
  // --- Placard copy (hand-authored fallback; Groq may overwrite at ingest) ---
  overview: string;
  challenge: string;
  solution: string;
  outcomes: string[];
  insight: string;
  /** Set by optimize-images.mjs. */
  image?: {
    full: string; // /exhibits/<slug>.webp
    thumb: string; // /exhibits/<slug>.thumb.webp
    width: number;
    height: number;
    aspect: number;
    /** Tiny blurred placeholder data URI for LQIP. */
    blur: string;
  };
}

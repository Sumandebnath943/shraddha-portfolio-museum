import { exhibits as seed } from "@/data/exhibits";
import { milestones } from "@/data/timeline";
import { wings, wingById } from "@/data/wings";
import type { Exhibit } from "@/data/types";
import images from "./images.json";
import copy from "./copy.json";

type ImageMap = Record<string, NonNullable<Exhibit["image"]>>;
type CopyMap = Record<
  string,
  Partial<Pick<Exhibit, "overview" | "challenge" | "solution" | "outcomes" | "insight">>
>;

// Merge the typed seed content with build-time generated image metadata
// (scripts/build-content.ts) and optional AI-generated copy
// (scripts/ingest-ai.ts). Either generated file may be empty {}.
export function getExhibits(): Exhibit[] {
  const img = images as ImageMap;
  const cp = copy as CopyMap;
  return seed.map((e) => ({
    ...e,
    ...(cp[e.slug] ?? {}),
    image: img[e.slug] ?? e.image,
  }));
}

export function getExhibitsByWing(wing: Exhibit["wing"]): Exhibit[] {
  return getExhibits().filter((e) => e.wing === wing);
}

export { milestones, wings, wingById };
export type { Exhibit };

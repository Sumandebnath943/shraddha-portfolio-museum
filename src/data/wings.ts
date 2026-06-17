import type { Wing } from "./types";

// Five galleries, grouped by discipline rather than client (most work is for
// RamanByte / PIBM). Order here is the suggested walking order through the museum.
export const wings: Wing[] = [
  {
    id: "identity",
    name: "Identity & Brand",
    subtitle: "Logos · Event Identity · Campaign Branding",
    intro:
      "A brand is not a logo but a coherent world. This gallery gathers Shraddha's identity work — from standalone logomarks to full event identity systems built to scale across every surface.",
    accent: "#C9A227",
  },
  {
    id: "print",
    name: "Print & Editorial",
    subtitle: "Brochures · Prospectuses · Invitations",
    intro:
      "Designed for the press and the hand. Multi-page editorial systems and invitations where grid, typography, and production craft meet physical paper.",
    accent: "#B07A52",
  },
  {
    id: "social",
    name: "Social & Digital",
    subtitle: "Posts · Carousels · Banners · Covers",
    intro:
      "The brand at platform speed. Platform-specific social systems — static posts, multi-slide carousels, blog banners and covers — tuned for clarity in the feed.",
    accent: "#5B7CFA",
  },
  {
    id: "marketing",
    name: "Marketing & Campaigns",
    subtitle: "Ads · Promotions · Corporate Creative",
    intro:
      "Design with a target. Performance-minded advertising, event promotions, and corporate announcement creative built to move audiences and meet campaign goals.",
    accent: "#C0492F",
  },
  {
    id: "infographics",
    name: "Information Design",
    subtitle: "Infographics · Explainers",
    intro:
      "Complex narratives made legible. Information design that turns dense subject matter — programmes, awareness drives, study guides — into clear, navigable visual systems.",
    accent: "#2F8F83",
  },
];

export const wingById = Object.fromEntries(wings.map((w) => [w.id, w])) as Record<
  Wing["id"],
  Wing
>;

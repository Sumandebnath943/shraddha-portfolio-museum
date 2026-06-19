import { create } from "zustand";
import type { SkinName, StarNode } from "@/lib/constellation-layout";

export type Mode = "intro" | "tour" | "explore" | "focus";

// Non-reactive, eased every frame: how bright the chart/background is. The
// glowing particles are the "sun" — while they're present the chart is dimmed
// (low value); when they fly off on Play it blooms back to full (1).
export const env = { bgLight: 0 };

interface ConstellationState {
  skin: SkinName;
  mode: Mode;
  tourIndex: number; // which milestone the tour is on
  playing: boolean; // tour auto-advancing
  focusedId: string | null; // milestone the camera is diving on
  selected: StarNode | null; // milestone whose full story panel is open
  hoveredId: string | null;
  soundOn: boolean;
  warping: boolean; // hyperspace transition into the museum
  reducedMotion: boolean;
  faceFormed: boolean; // the portrait has assembled → reveal name + chart

  setSkin: (s: SkinName) => void;
  toggleSkin: () => void;
  setMode: (m: Mode) => void;
  play: () => void;
  pause: () => void;
  setTourIndex: (i: number) => void;
  focus: (id: string | null) => void;
  setSelected: (n: StarNode | null) => void;
  setHovered: (id: string | null) => void;
  setSoundOn: (b: boolean) => void;
  setWarping: (b: boolean) => void;
  setReducedMotion: (b: boolean) => void;
  setFaceFormed: (b: boolean) => void;
}

export const useConstellation = create<ConstellationState>((set) => ({
  skin: "dark",
  mode: "intro",
  tourIndex: 0,
  playing: false,
  focusedId: null,
  selected: null,
  hoveredId: null,
  soundOn: false,
  warping: false,
  reducedMotion: false,
  faceFormed: false,

  setSkin: (skin) => set({ skin }),
  toggleSkin: () => set((s) => ({ skin: s.skin === "dark" ? "light" : "dark" })),
  setMode: (mode) => set({ mode }),
  play: () => set({ playing: true, mode: "tour" }),
  // stop/pause returns to the landing framing (not stuck zoomed on a node)
  pause: () => set({ playing: false, mode: "explore", focusedId: null }),
  setTourIndex: (tourIndex) => set({ tourIndex }),
  focus: (focusedId) => set({ focusedId, mode: focusedId ? "focus" : "explore" }),
  setSelected: (selected) => set({ selected }),
  setHovered: (hoveredId) => set((s) => (s.hoveredId === hoveredId ? s : { hoveredId })),
  setSoundOn: (soundOn) => set({ soundOn }),
  setWarping: (warping) => set({ warping }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setFaceFormed: (faceFormed) => set({ faceFormed }),
}));

import { create } from "zustand";
import * as THREE from "three";
import { SPAWN, EYE_H } from "@/lib/museum-layout";
import type { WingId } from "@/data/types";

// Non-reactive, mutated every frame by the player controller and read by
// exhibits/HUD in their own frame loops (avoids React re-renders per frame).
export const playerPos = new THREE.Vector3(SPAWN.x, EYE_H, SPAWN.z);
export const playerDir = new THREE.Vector3(0, 0, -1); // camera forward (for gaze sensing)
export const assistantPos = new THREE.Vector3(); // guide's world position

// Registry of clickable exhibit meshes for centre-screen raycasting.
export const interactables = new Map<string, THREE.Object3D>();

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface MuseumState {
  selected: string | null; // exhibit slug whose placard is open
  nearby: string | null; // exhibit currently under the crosshair / in range
  entered: boolean; // has the visitor clicked "Enter"
  freeLook: boolean; // pointer-lock unavailable → look by steering the cursor instead
  nearKiosk: boolean; // standing close to the download kiosk
  kioskOpen: boolean; // the résumé/portfolio download panel is open
  seatIndex: number | null; // nearest bench in sit range (for the "Press E" prompt)
  seated: number | null; // index of the bench the visitor is currently sitting on
  autoPanning: boolean; // seated + idle → the view is slowly panning on its own
  // guide assistant
  chatOpen: boolean; // the chat panel is open
  summoned: boolean; // "Talk to Assistant" pressed → she comes to the visitor
  speaking: boolean; // she is mid-reply → drives the Talk animation + bubble
  bubble: string; // short line shown above her head (greeting / current reply)
  assistantMode: string; // current behaviour state (debug / UI)
  messages: ChatMsg[]; // chat transcript
  // guided tour
  guideMenuOpen: boolean; // the "where would you like to go?" wing chips are up
  guideTarget: WingId | null; // wing she is currently escorting the visitor to
  voiceOn: boolean; // speak her replies aloud (Web Speech API)
  listening: boolean; // mic is capturing the visitor's spoken question
  setSelected: (s: string | null) => void;
  setNearby: (s: string | null) => void;
  setEntered: (b: boolean) => void;
  setFreeLook: (b: boolean) => void;
  setNearKiosk: (b: boolean) => void;
  setKioskOpen: (b: boolean) => void;
  setSeatIndex: (i: number | null) => void;
  setSeated: (i: number | null) => void;
  setAutoPanning: (b: boolean) => void;
  setChatOpen: (b: boolean) => void;
  setSummoned: (b: boolean) => void;
  setSpeaking: (b: boolean) => void;
  setBubble: (s: string) => void;
  setAssistantMode: (s: string) => void;
  setGuideMenuOpen: (b: boolean) => void;
  setGuideTarget: (w: WingId | null) => void;
  setVoiceOn: (b: boolean) => void;
  setListening: (b: boolean) => void;
  addMessage: (m: ChatMsg) => void;
  appendToLast: (chunk: string) => void; // stream tokens into the last message
  clearMessages: () => void;
}

export const useMuseum = create<MuseumState>((set) => ({
  selected: null,
  nearby: null,
  entered: false,
  freeLook: false,
  nearKiosk: false,
  kioskOpen: false,
  seatIndex: null,
  seated: null,
  autoPanning: false,
  chatOpen: false,
  summoned: false,
  speaking: false,
  bubble: "",
  assistantMode: "spawn",
  messages: [],
  guideMenuOpen: false,
  guideTarget: null,
  voiceOn: true,
  listening: false,
  setSelected: (selected) => set({ selected }),
  setNearby: (nearby) => set((s) => (s.nearby === nearby ? s : { nearby })),
  setEntered: (entered) => set({ entered }),
  setFreeLook: (freeLook) => set((s) => (s.freeLook === freeLook ? s : { freeLook })),
  setNearKiosk: (nearKiosk) => set((s) => (s.nearKiosk === nearKiosk ? s : { nearKiosk })),
  setKioskOpen: (kioskOpen) => set({ kioskOpen }),
  setSeatIndex: (seatIndex) => set((s) => (s.seatIndex === seatIndex ? s : { seatIndex })),
  setSeated: (seated) => set({ seated }),
  setAutoPanning: (autoPanning) => set((s) => (s.autoPanning === autoPanning ? s : { autoPanning })),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setSummoned: (summoned) => set({ summoned }),
  setSpeaking: (speaking) => set((s) => (s.speaking === speaking ? s : { speaking })),
  setBubble: (bubble) => set((s) => (s.bubble === bubble ? s : { bubble })),
  setAssistantMode: (assistantMode) =>
    set((s) => (s.assistantMode === assistantMode ? s : { assistantMode })),
  setGuideMenuOpen: (guideMenuOpen) => set({ guideMenuOpen }),
  setGuideTarget: (guideTarget) => set({ guideTarget }),
  setVoiceOn: (voiceOn) => set({ voiceOn }),
  setListening: (listening) => set((s) => (s.listening === listening ? s : { listening })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  appendToLast: (chunk) =>
    set((s) => {
      if (!s.messages.length) return s;
      const messages = s.messages.slice();
      const last = messages[messages.length - 1];
      messages[messages.length - 1] = { ...last, content: last.content + chunk };
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
}));

import { create } from "zustand";
import * as THREE from "three";
import { SPAWN, EYE_H } from "@/lib/museum-layout";

// Non-reactive, mutated every frame by the player controller and read by
// exhibits/HUD in their own frame loops (avoids React re-renders per frame).
export const playerPos = new THREE.Vector3(SPAWN.x, EYE_H, SPAWN.z);

// Registry of clickable exhibit meshes for centre-screen raycasting.
export const interactables = new Map<string, THREE.Object3D>();

interface MuseumState {
  selected: string | null; // exhibit slug whose placard is open
  nearby: string | null; // exhibit currently under the crosshair / in range
  entered: boolean; // has the visitor clicked "Enter"
  nearKiosk: boolean; // standing close to the download kiosk
  kioskOpen: boolean; // the résumé/portfolio download panel is open
  seatIndex: number | null; // nearest bench in sit range (for the "Press E" prompt)
  seated: number | null; // index of the bench the visitor is currently sitting on
  autoPanning: boolean; // seated + idle → the view is slowly panning on its own
  setSelected: (s: string | null) => void;
  setNearby: (s: string | null) => void;
  setEntered: (b: boolean) => void;
  setNearKiosk: (b: boolean) => void;
  setKioskOpen: (b: boolean) => void;
  setSeatIndex: (i: number | null) => void;
  setSeated: (i: number | null) => void;
  setAutoPanning: (b: boolean) => void;
}

export const useMuseum = create<MuseumState>((set) => ({
  selected: null,
  nearby: null,
  entered: false,
  nearKiosk: false,
  kioskOpen: false,
  seatIndex: null,
  seated: null,
  autoPanning: false,
  setSelected: (selected) => set({ selected }),
  setNearby: (nearby) => set((s) => (s.nearby === nearby ? s : { nearby })),
  setEntered: (entered) => set({ entered }),
  setNearKiosk: (nearKiosk) => set((s) => (s.nearKiosk === nearKiosk ? s : { nearKiosk })),
  setKioskOpen: (kioskOpen) => set({ kioskOpen }),
  setSeatIndex: (seatIndex) => set((s) => (s.seatIndex === seatIndex ? s : { seatIndex })),
  setSeated: (seated) => set({ seated }),
  setAutoPanning: (autoPanning) => set((s) => (s.autoPanning === autoPanning ? s : { autoPanning })),
}));

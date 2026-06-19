import * as THREE from "three";

// Canvas-generated textures so the build needs no image assets. All cached.

let glowCache: THREE.CanvasTexture | null = null;
export function glowTexture(): THREE.CanvasTexture {
  if (glowCache) return glowCache;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  glowCache = new THREE.CanvasTexture(c);
  glowCache.colorSpace = THREE.SRGBColorSpace;
  return glowCache;
}

let coreCache: THREE.CanvasTexture | null = null;
export function coreTexture(): THREE.CanvasTexture {
  if (coreCache) return coreCache;
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.95)");
  g.addColorStop(0.8, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  coreCache = new THREE.CanvasTexture(c);
  coreCache.colorSpace = THREE.SRGBColorSpace;
  return coreCache;
}

const nebulaCache: Record<string, THREE.CanvasTexture> = {};
export function nebulaTexture(color: string): THREE.CanvasTexture {
  if (nebulaCache[color]) return nebulaCache[color];
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.5, color.replace("rgb", "rgba").replace(")", ",0.25)"));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  nebulaCache[color] = tex;
  return tex;
}

let parchmentCache: THREE.CanvasTexture | null = null;
export function parchmentTexture(): THREE.CanvasTexture {
  if (parchmentCache) return parchmentCache;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ece2cd";
  ctx.fillRect(0, 0, s, s);
  // subtle warm mottling
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = Math.random() * 2.2 + 0.4;
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(120,96,60,${a})` : `rgba(255,250,238,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft vignette toward the edges
  const v = ctx.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(80,64,40,0.22)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, s, s);
  parchmentCache = new THREE.CanvasTexture(c);
  parchmentCache.colorSpace = THREE.SRGBColorSpace;
  return parchmentCache;
}

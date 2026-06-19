// Offline "bake" of the portrait into a particle target. Reads public/portrait.jpg,
// crops to the head, computes Sobel edges + tone, samples a weighted point pool
// (edges → features/contours, so it reads as HER), and writes:
//   public/face.bin        Float32 [nx, ny, shade] * POOL   (nx,ny in -1..1)
//   public/face.meta.json  { count, aspect }
//   public/face-preview.png  a gold-on-black render so we can eyeball it
//
// Run: node scripts/bake-portrait.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const SRC = "public/portrait.jpg";
const POOL = 260000;

// crop fractions of the source (head + shoulders). Tune these to frame her face.
const CROP = { left: 0.28, top: 0.03, width: 0.44, height: 0.93 };
const GW = 260; // grid width the photo is reduced to for sampling

const meta = await sharp(SRC).metadata();
const L = Math.round(meta.width * CROP.left);
const T = Math.round(meta.height * CROP.top);
const W0 = Math.round(meta.width * CROP.width);
const H0 = Math.round(meta.height * CROP.height);
const GH = Math.round((GW * H0) / W0);

const { data } = await sharp(SRC)
  .extract({ left: L, top: T, width: W0, height: H0 })
  .resize(GW, GH)
  .grayscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = GW;
const H = GH;
const lum = (x, y) => data[y * W + x] / 255;

function sobel(x, y) {
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return 0;
  const gx =
    lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1) -
    (lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1));
  const gy =
    lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1) -
    (lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1));
  return Math.hypot(gx, gy);
}

// weight: features (edges) dominate; a little tonal fill in the mid/dark subject;
// the bright sky background is suppressed so particles land on HER.
const wgt = new Float32Array(W * H);
let total = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const l = lum(x, y);
    const e = sobel(x, y);
    let w = Math.pow(e, 1.25) * 1.0 + (l < 0.42 ? (0.42 - l) * 0.1 : 0); // edge-dominant line portrait
    if (l > 0.8) w *= 0.03; // sky / blown highlights
    wgt[y * W + x] = w;
    total += w;
  }
}

// prefix sum for weighted sampling
const cdf = new Float32Array(W * H);
let acc = 0;
for (let i = 0; i < W * H; i++) {
  acc += wgt[i];
  cdf[i] = acc;
}
function pick() {
  const r = Math.random() * total;
  let lo = 0;
  let hi = W * H - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < r) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const aspect = H / W;
const out = new Float32Array(POOL * 3);
for (let i = 0; i < POOL; i++) {
  const idx = pick();
  const px = (idx % W) + Math.random();
  const py = ((idx / W) | 0) + Math.random();
  const nx = (px / W) * 2 - 1;
  const ny = (1 - py / H) * 2 - 1; // -1..1, * aspect applied at runtime
  out[i * 3] = nx;
  out[i * 3 + 1] = ny;
  out[i * 3 + 2] = Math.max(0.12, Math.min(1, (lum((px | 0) % W, (py | 0) % H) - 0.06) / 0.7));
}

writeFileSync("public/face.bin", Buffer.from(out.buffer));
writeFileSync("public/face.meta.json", JSON.stringify({ count: POOL, aspect }));

// preview render (gold on black) so we can confirm it looks like her
const PW = 320;
const PH = Math.round(PW * aspect);
const img = new Uint8ClampedArray(PW * PH * 4);
for (let i = 0; i < PW * PH; i++) img[i * 4 + 3] = 255;
for (let i = 0; i < POOL; i++) {
  const nx = out[i * 3];
  const ny = out[i * 3 + 1];
  const sh = out[i * 3 + 2];
  const px = Math.round(((nx + 1) / 2) * (PW - 1));
  const py = Math.round(((1 - (ny + 1) / 2)) * (PH - 1));
  const o = (py * PW + px) * 4;
  img[o] = Math.min(255, img[o] + 60 * (0.5 + sh));
  img[o + 1] = Math.min(255, img[o + 1] + 48 * (0.5 + sh));
  img[o + 2] = Math.min(255, img[o + 2] + 26 * (0.5 + sh));
}
await sharp(Buffer.from(img.buffer), { raw: { width: PW, height: PH, channels: 4 } })
  .png()
  .toFile("public/face-preview.png");

console.log(`baked ${POOL} pts · grid ${W}x${H} · aspect ${aspect.toFixed(3)} → public/face.bin + face-preview.png`);

// Target shapes for the particle field. Every generator fills WORLD-space
// positions (count*3) and a per-particle shade (0..1, drives the gold tone).
// Subject shapes share the same left-of-screen box so they morph in place;
// the face is sampled from the photo, the art shapes from hand-drawn vector
// silhouettes (rasterised + sampled) so they read as accurate objects.

export interface Layout {
  ex: number;
  ey: number;
  fcx: number;
  fcy: number;
  fhw: number;
  fhh: number;
}

export function makeLayout(aspect: number, H = 50): Layout {
  const ex = H * aspect;
  const ey = H;
  return { ex, ey, fcx: -ex * 0.42, fcy: ey * 0.16, fhw: ex * 0.3, fhh: ey * 0.52 };
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function place(
  pos: Float32Array,
  shade: Float32Array,
  i: number,
  nx: number,
  ny: number,
  s: number,
  L: Layout,
  scale = 0.92,
  square = false,
) {
  pos[i * 3] = L.fcx + nx * L.fhw * scale;
  pos[i * 3 + 1] = L.fcy + ny * (square ? L.fhw : L.fhh) * scale;
  pos[i * 3 + 2] = rand(-2.5, 2.5);
  shade[i] = s;
}

// contained, soft cloud centre-left — the "living organism" before it forms
export function genScatter(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  for (let i = 0; i < count; i++) {
    const gx = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const gy = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    pos[i * 3] = L.fcx + gx * L.fhw * 1.8;
    pos[i * 3 + 1] = L.fcy + gy * L.fhh * 1.5;
    pos[i * 3 + 2] = rand(-7, 7);
    shade[i] = rand(0.3, 0.85);
  }
}

export function genExplode(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  const R = Math.max(L.ex, L.ey);
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const r = rand(1.15, 1.9) * R;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = rand(-10, 10);
    shade[i] = rand(0.2, 0.6);
  }
}

// ── intro sequence ─────────────────────────────────────────────────────────
// Stage 1: a single tight, bright seed at SCREEN CENTRE (origin, not the left
// face box) — the "dot" the whole field is born from.
export function genSeed(pos: Float32Array, shade: Float32Array, count: number) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.pow(Math.random(), 0.5) * 0.45;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = rand(-0.4, 0.4);
    shade[i] = rand(0.75, 1.0);
  }
}

// Stage 2: a glowing sun at screen centre — a dense, brilliant core wrapped in a
// softer corona. This is "the star" the user means: an actual sun.
export function genSun(pos: Float32Array, shade: Float32Array, count: number, R = 12) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const core = Math.random() < 0.8;
    const r = core
      ? Math.pow(Math.random(), 0.62) * R * 0.62
      : R * 0.62 + Math.pow(Math.random(), 1.6) * R * 1.25;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = (Math.random() - 0.5) * R * (core ? 0.5 : 0.2);
    shade[i] = core ? 0.82 + 0.18 * Math.random() : 0.16 + 0.34 * Math.random();
  }
}

// A persistent twinkling starfield spread across the whole sky, parked behind the
// subject. Seeded once from the sun, then it stays put and only twinkles — these
// particles never morph into a shape again.
export function genSky(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rand(-L.ex * 1.35, L.ex * 1.35);
    pos[i * 3 + 1] = rand(-L.ey * 1.3, L.ey * 1.3);
    pos[i * 3 + 2] = rand(-34, -6);
    shade[i] = rand(0.25, 0.95);
  }
}

// The morph particles a shape doesn't need become a soft living halo framing it —
// a dim, slowly drifting aura. Ring-biased (radius starts just outside the shape)
// so it surrounds the form instead of filling and blowing it out.
export function fillHalo(
  pos: Float32Array,
  shade: Float32Array,
  from: number,
  to: number,
  L: Layout,
  rx: number,
  ry: number,
) {
  for (let i = from; i < to; i++) {
    const a = rand(0, Math.PI * 2);
    const g = Math.abs((Math.random() + Math.random() + Math.random() - 1.5) / 1.5);
    const rr = 0.95 + g * 1.55;
    pos[i * 3] = L.fcx + Math.cos(a) * rx * rr;
    pos[i * 3 + 1] = L.fcy + Math.sin(a) * ry * rr;
    pos[i * 3 + 2] = rand(-9, 9);
    shade[i] = rand(0.05, 0.2); // faint → glows softly under additive, never crowds
  }
}

// ── vector silhouette sampler ──────────────────────────────────────────────
type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

function rasterInto(
  pos: Float32Array,
  shade: Float32Array,
  count: number,
  L: Layout,
  draw: DrawFn,
  scale: number,
) {
  const cw = 320;
  const cv = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const ctx = cv?.getContext("2d");
  if (!cv || !ctx) {
    for (let i = 0; i < count; i++) place(pos, shade, i, rand(-0.5, 0.5), rand(-0.5, 0.5), 0.5, L, scale, true);
    return;
  }
  cv.width = cw;
  cv.height = cw;
  ctx.clearRect(0, 0, cw, cw);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  draw(ctx, cw);
  const data = ctx.getImageData(0, 0, cw, cw).data;
  let i = 0;
  let att = 0;
  const max = count * 120;
  while (i < count && att < max) {
    att++;
    const px = (Math.random() * cw) | 0;
    const py = (Math.random() * cw) | 0;
    if (data[(py * cw + px) * 4 + 3] < 50) continue;
    const nx = (px / cw) * 2 - 1;
    const ny = 1 - (py / cw) * 2;
    place(pos, shade, i, nx, ny, 0.55 + 0.4 * Math.random(), L, scale, true);
    i++;
  }
  for (; i < count; i++) place(pos, shade, i, rand(-0.4, 0.4), rand(-0.4, 0.4), 0.4, L, scale, true);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawButterfly(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2;
  const cy = s * 0.52;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.016, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.2, s * 0.022, 0, Math.PI * 2);
  ctx.fill();
  const wing = (sx: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, 1);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.06);
    ctx.bezierCurveTo(s * 0.12, -s * 0.3, s * 0.34, -s * 0.24, s * 0.3, -s * 0.04);
    ctx.bezierCurveTo(s * 0.28, s * 0.04, s * 0.12, s * 0.01, 0, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.01);
    ctx.bezierCurveTo(s * 0.08, s * 0.12, s * 0.24, s * 0.26, s * 0.19, s * 0.07);
    ctx.bezierCurveTo(s * 0.17, s * 0.03, s * 0.07, s * 0.02, 0, s * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  wing(1);
  wing(-1);
  ctx.lineWidth = s * 0.009;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.22);
  ctx.quadraticCurveTo(cx + s * 0.07, cy - s * 0.34, cx + s * 0.12, cy - s * 0.3);
  ctx.moveTo(cx, cy - s * 0.22);
  ctx.quadraticCurveTo(cx - s * 0.07, cy - s * 0.34, cx - s * 0.12, cy - s * 0.3);
  ctx.stroke();
}

export function drawLightbulb(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2;
  const cy = s * 0.42;
  const r = s * 0.21;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.86);
  ctx.lineTo(cx + r * 0.5, cy + r * 0.86);
  ctx.lineTo(cx + r * 0.4, cy + r * 1.2);
  ctx.lineTo(cx - r * 0.4, cy + r * 1.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - r * 0.4, cy + r * 1.2, r * 0.8, r * 0.55);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = s * 0.012;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy + r * (1.3 + 0.14 * k));
    ctx.lineTo(cx + r * 0.4, cy + r * (1.3 + 0.14 * k));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.lineWidth = s * 0.014;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.34, cy + r * 0.28);
  ctx.lineTo(cx - r * 0.14, cy - r * 0.18);
  ctx.lineTo(cx, cy + r * 0.12);
  ctx.lineTo(cx + r * 0.14, cy - r * 0.18);
  ctx.lineTo(cx + r * 0.34, cy + r * 0.28);
  ctx.stroke();
}

export function drawBezier(ctx: CanvasRenderingContext2D, s: number) {
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s * 0.2, s * 0.68);
  ctx.bezierCurveTo(s * 0.32, s * 0.16, s * 0.7, s * 0.86, s * 0.82, s * 0.32);
  ctx.stroke();
  ctx.lineWidth = s * 0.011;
  const anchor = (ax: number, ay: number, hx: number, hy: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.026, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(ax - s * 0.032, ay - s * 0.032, s * 0.064, s * 0.064);
  };
  anchor(s * 0.2, s * 0.68, s * 0.34, s * 0.36);
  anchor(s * 0.82, s * 0.32, s * 0.66, s * 0.62);
}

export function drawSwatches(ctx: CanvasRenderingContext2D, s: number) {
  ctx.lineWidth = s * 0.016;
  const w = s * 0.34;
  const h = s * 0.44;
  const n = 5;
  for (let k = n - 1; k >= 0; k--) {
    const ox = s * 0.5 + (k - (n - 1) / 2) * s * 0.055 - w / 2;
    const oy = s * 0.5 + (k - (n - 1) / 2) * s * 0.05 - h / 2;
    roundRect(ctx, ox, oy, w, h, s * 0.04);
    ctx.stroke();
  }
}

export function drawBauhaus(ctx: CanvasRenderingContext2D, s: number) {
  const cx = s / 2;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.02, s * 0.15);
  ctx.lineTo(cx + s * 0.22, s * 0.5);
  ctx.lineTo(cx - s * 0.18, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 0.05, s * 0.42, s * 0.3, s * 0.3);
  ctx.beginPath();
  ctx.arc(cx - s * 0.14, s * 0.62, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

export function drawAmpersand(ctx: CanvasRenderingContext2D, s: number) {
  ctx.font = `bold ${Math.round(s * 0.74)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("&", s / 2, s * 0.54);
}

export function drawFrame(ctx: CanvasRenderingContext2D, s: number) {
  ctx.lineWidth = s * 0.02;
  const m = s * 0.14;
  roundRect(ctx, m, m, s - 2 * m, s - 2 * m, s * 0.012);
  ctx.stroke();
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 3.6; t += 0.08) {
    const rr = s * 0.035 * Math.exp(0.205 * t);
    const px = s * 0.46 + Math.cos(t) * rr;
    const py = s * 0.5 + Math.sin(t) * rr;
    if (t === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

export function genButterfly(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawButterfly, 1.5);
}
export function genLightbulb(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawLightbulb, 1.45);
}
export function genBezier(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawBezier, 1.5);
}
export function genSwatches(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawSwatches, 1.4);
}
export function genBauhaus(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawBauhaus, 1.45);
}
export function genAmpersand(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawAmpersand, 1.4);
}
export function genFrame(pos: Float32Array, shade: Float32Array, count: number, L: Layout) {
  rasterInto(pos, shade, count, L, drawFrame, 1.5);
}

// The face is pre-baked offline (scripts/bake-portrait.mjs → public/face.bin) with
// edge + tone weighting so it reads as HER. Load the point pool once at runtime.
export async function loadBakedFace(): Promise<{ pool: Float32Array; aspect: number } | null> {
  try {
    const [binRes, metaRes] = await Promise.all([fetch("/face.bin"), fetch("/face.meta.json")]);
    if (!binRes.ok || !metaRes.ok) return null;
    const buf = await binRes.arrayBuffer();
    const meta = (await metaRes.json()) as { aspect: number };
    return { pool: new Float32Array(buf), aspect: meta.aspect };
  } catch {
    return null;
  }
}

// Subsample `count` points from the baked pool into the face box, preserving the
// portrait's true proportions (width = fhw, height = fhw * photo-aspect).
export function fillFaceFromPool(
  pool: Float32Array,
  aspect: number,
  pos: Float32Array,
  shade: Float32Array,
  count: number,
  L: Layout,
  scale = 0.72,
) {
  const P = (pool.length / 3) | 0;
  for (let i = 0; i < count; i++) {
    const j = (Math.random() * P) | 0;
    pos[i * 3] = L.fcx + pool[j * 3] * L.fhw * scale;
    pos[i * 3 + 1] = L.fcy + pool[j * 3 + 1] * L.fhw * aspect * scale;
    pos[i * 3 + 2] = rand(-2.5, 2.5);
    // compress the tonal range so EVERY feature-edge stays visible (otherwise
    // bright skin blooms out and dark hair/feature edges vanish → blob).
    shade[i] = 0.62 + 0.32 * pool[j * 3 + 2];
  }
}

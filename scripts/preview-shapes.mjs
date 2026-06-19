// Dev tool: render every particle art silhouette to a contact sheet so we can
// eyeball recognizability before wiring. Run: npx tsx scripts/preview-shapes.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import * as shapes from "../src/lib/particle-shapes.ts";

try {
  GlobalFonts.loadSystemFonts();
} catch {
  /* fonts optional */
}

const draws = [
  ["butterfly", shapes.drawButterfly],
  ["lightbulb", shapes.drawLightbulb],
  ["bezier", shapes.drawBezier],
  ["swatches", shapes.drawSwatches],
  ["bauhaus", shapes.drawBauhaus],
  ["ampersand", shapes.drawAmpersand],
  ["frame", shapes.drawFrame],
];

const cell = 300;
const cols = 4;
const rows = Math.ceil(draws.length / cols);
const cv = createCanvas(cols * cell, rows * cell);
const ctx = cv.getContext("2d");
ctx.fillStyle = "#0a0a0f";
ctx.fillRect(0, 0, cv.width, cv.height);

draws.forEach(([name, fn], i) => {
  const ox = (i % cols) * cell;
  const oy = Math.floor(i / cols) * cell;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = "#e8c45a";
  ctx.strokeStyle = "#e8c45a";
  fn(ctx, cell);
  ctx.fillStyle = "#7a7a85";
  ctx.font = "15px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, 10, cell - 10);
  ctx.restore();
});

writeFileSync("public/shapes-preview.png", cv.toBuffer("image/png"));
console.log("wrote public/shapes-preview.png");

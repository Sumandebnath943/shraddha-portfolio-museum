// Builds public/models/assistant.glb — the guide avatar — from the 6 Mixamo FBX
// source clips in raw-anim/ (gitignored). FBX2glTF converts each (it preserves
// the Mixamo skin + clip + textures); we then merge the 5 extra clips onto the
// Idle base by bone name (all six share the mixamorig skeleton), strip the
// Walk clip's root locomotion, resize the textures, and write one small GLB.
//
// Usage: npm run build:assistant

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, weld, simplify } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { loadImage, createCanvas } from "@napi-rs/canvas";

// Downscale every texture to fit within MAX px, re-encoded as JPEG. (sharp's
// native binary won't load on this Node, so we use @napi-rs/canvas.)
async function resizeTextures(doc, max = 1024) {
  for (const tex of doc.getRoot().listTextures()) {
    const data = tex.getImage();
    if (!data) continue;
    const img = await loadImage(Buffer.from(data));
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale >= 1) continue;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const cv = createCanvas(w, h);
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    tex.setImage(new Uint8Array(cv.toBuffer("image/jpeg", 0.85))).setMimeType("image/jpeg");
    console.log(`  texture ${img.width}x${img.height} → ${w}x${h}`);
  }
}

const RAW = "raw-anim";
const TMP = "tmp_conv";
const OUT = "public/models/assistant.glb";

// role name (used in-app) → source FBX file
const CLIPS = [
  ["Idle", "Idle.fbx"],
  ["Walk", "Walk.fbx"],
  ["Greet", "Greet.fbx"],
  ["Talk", "Talk.fbx"],
  ["LookAround", "Look Around.fbx"],
  ["Dance", "Hip Hop Dancing.fbx"],
];

const BIN = { win32: "Windows_NT/FBX2glTF.exe", darwin: "Darwin/FBX2glTF", linux: "Linux/FBX2glTF" }[
  process.platform
];
const EXE = `node_modules/fbx2gltf/bin/${BIN}`;

function convert(fbx, outBase) {
  execFileSync(EXE, ["-i", fbx, "-o", outBase, "-b"], { stdio: "ignore" });
  return `${outBase}.glb`;
}

mkdirSync(TMP, { recursive: true });
const io = new NodeIO();

// ── base = Idle (keeps the mesh, skin, textures + its own clip) ──
console.log("converting Idle (base)…");
const base = await io.read(convert(`${RAW}/Idle.fbx`, `${TMP}/Idle`));
const root = base.getRoot();
const buffer = root.listBuffers()[0];
const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
root.listAnimations().forEach((a, i) => a.setName(i === 0 ? "Idle" : `_extra${i}`));

function addClip(role, srcDoc) {
  const srcAnim = srcDoc.getRoot().listAnimations()[0];
  if (!srcAnim) return console.warn(`  ! ${role}: no animation`);
  const anim = base.createAnimation(role);
  for (const ch of srcAnim.listChannels()) {
    const tn = ch.getTargetNode();
    const target = tn && nodesByName.get(tn.getName());
    if (!target) continue;
    const s = ch.getSampler();
    const inArr = Float32Array.from(s.getInput().getArray());
    const outArr = Float32Array.from(s.getOutput().getArray());
    const path = ch.getTargetPath();
    // strip Walk locomotion so code drives position (keep vertical bob)
    if (role === "Walk" && path === "translation" && target.getName().toLowerCase().includes("hips")) {
      for (let i = 0; i < outArr.length; i += 3) {
        outArr[i] = 0;
        outArr[i + 2] = 0;
      }
    }
    const input = base.createAccessor().setType("SCALAR").setArray(inArr).setBuffer(buffer);
    const output = base
      .createAccessor()
      .setType(s.getOutput().getType())
      .setArray(outArr)
      .setBuffer(buffer);
    const sampler = base
      .createAnimationSampler()
      .setInput(input)
      .setOutput(output)
      .setInterpolation(s.getInterpolation());
    const channel = base
      .createAnimationChannel()
      .setTargetNode(target)
      .setTargetPath(path)
      .setSampler(sampler);
    anim.addSampler(sampler).addChannel(channel);
  }
  console.log(`  + ${role}: ${anim.listChannels().length} channels`);
}

for (const [role, file] of CLIPS) {
  if (role === "Idle") continue;
  console.log(`converting ${role}…`);
  addClip(role, await io.read(convert(`${RAW}/${file}`, `${TMP}/${role}`)));
}

console.log("optimizing (weld, simplify, textures→1024)…");
await MeshoptSimplifier.ready;
await base.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.2, error: 0.005 }),
  dedup(),
  prune(),
);
await resizeTextures(base, 1024);

await io.write(OUT, base);
console.log(`✓ wrote ${OUT}`);
console.log("clips:", base.getRoot().listAnimations().map((a) => a.getName()).join(", "));

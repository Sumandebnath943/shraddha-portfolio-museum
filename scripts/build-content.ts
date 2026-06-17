/**
 * Image pipeline. Reads each exhibit's source sheet from /design assets,
 * produces optimized WebP variants (full + thumb) and a tiny LQIP blur,
 * and writes src/content/images.json consumed by the app.
 *
 * Run: npm run content
 */
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { exhibits } from "../src/data/exhibits";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "design assets");
const OUT_DIR = path.join(ROOT, "public", "exhibits");
const MANIFEST = path.join(ROOT, "src", "content", "images.json");

const FULL_MAX = 1600; // longest edge for the framed full-res view
const THUMB_MAX = 640; // longest edge for in-world textures / LOD

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const out: Record<string, unknown> = {};
  let ok = 0;
  let missing = 0;

  for (const e of exhibits) {
    const srcPath = path.join(SRC_DIR, e.source);
    if (!(await exists(srcPath))) {
      console.warn(`! missing source for ${e.slug}: ${e.source}`);
      missing++;
      continue;
    }

    const fullName = `${e.slug}.webp`;
    const thumbName = `${e.slug}.thumb.webp`;

    await sharp(srcPath)
      .rotate()
      .resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(OUT_DIR, fullName));

    await sharp(srcPath)
      .rotate()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(path.join(OUT_DIR, thumbName));

    const blurBuf = await sharp(srcPath)
      .rotate()
      .resize(24, 24, { fit: "inside" })
      .webp({ quality: 40 })
      .toBuffer();
    const blur = `data:image/webp;base64,${blurBuf.toString("base64")}`;

    const fullMeta = await sharp(path.join(OUT_DIR, fullName)).metadata();
    const w = fullMeta.width ?? 1600;
    const h = fullMeta.height ?? 1200;

    out[e.slug] = {
      full: `/exhibits/${fullName}`,
      thumb: `/exhibits/${thumbName}`,
      width: w,
      height: h,
      aspect: w / h,
      blur,
    };
    ok++;
    console.log(`✓ ${e.slug} (${w}×${h})`);
  }

  await writeFile(MANIFEST, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${MANIFEST}`);
  console.log(`Done: ${ok} optimized, ${missing} missing.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

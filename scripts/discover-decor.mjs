// One-off discovery helper (not shipped/imported by the app).
// Scrapes poly.pizza search pages for candidate decor models, then visits each
// model page to read its title, creator, license, and direct .glb URL.
// Prints a JSON array so we can hand-pick CC0 models for the museum.
//
// Usage: node scripts/discover-decor.mjs > scripts/decor-candidates.json

const TERMS = [
  "potted plant",
  "monstera",
  "fern",
  "snake plant",
  "statue",
  "bust",
  "sculpture",
  "vase",
  "urn",
  "pedestal column",
  "bonsai",
  "olive tree",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function pick(re, html) {
  const m = html.match(re);
  return m ? m[1] : null;
}

async function modelMeta(id) {
  const html = await text(`https://poly.pizza/m/${id}`);
  const glb = pick(/(https:\/\/static\.poly\.pizza\/[a-f0-9-]+\.glb)\b/, html);
  const title = pick(/property="og:title" content="([^"]*?)(?: - Free Model[^"]*)?"/, html);
  const creator = pick(/"Creator":\{"Username":"([^"]*)"/, html);
  // license text appears verbatim in the page ("CC0", "CC-BY 3.0", etc.)
  const license = pick(/\b(CC0|CC-BY(?:-SA)? ?[0-9.]*)\b/, html);
  return { id, title, creator, license, glb };
}

const seen = new Set();
const out = [];
for (const term of TERMS) {
  try {
    const html = await text(`https://poly.pizza/search/${encodeURIComponent(term)}`);
    const ids = [...new Set([...html.matchAll(/\/m\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]))].slice(0, 6);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      try {
        const meta = await modelMeta(id);
        if (meta.glb) out.push({ term, ...meta });
      } catch (e) {
        // skip individual model failures
      }
      await sleep(120);
    }
  } catch (e) {
    process.stderr.write(`search failed: ${term} — ${e.message}\n`);
  }
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
process.stderr.write(`\n${out.length} candidates (${out.filter((m) => m.license === "CC0").length} CC0)\n`);

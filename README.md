# Shraddha Sonel — The Design Museum

An interactive 3D "design museum" portfolio for multidisciplinary graphic designer
**Shraddha Sonel**. Two experiences, both running in the browser:

1. **The Timeline** (`/`) — a zoomable, filterable constellation of her creative career.
2. **The Museum** (`/museum`) — a first-person, walkable 3D gallery of her work.

Built with Next.js 16 (App Router), React Three Fiber + drei + postprocessing, Tailwind v4,
and Motion. Content is authored in TypeScript, optionally enriched at ingest by **Groq** (free
LLM) and persisted to **Neon Postgres**, and baked into static JSON the browser consumes.

## Run it

```bash
npm install
npm run content   # optimize /design assets → /public/exhibits + src/content/images.json
npm run dev       # http://localhost:3000
```

`npm run content` must be run once (and after adding/changing assets) to generate the
optimized WebP variants and blur placeholders. It has already been run; re-run only on changes.

## Add the portrait

Drop a portrait photo at **`public/portrait.jpg`**. It appears in the timeline placards and
the museum entrance. Until then, an elegant "SS" monogram is shown automatically.

## Add / change project assets

1. Put image(s) (PNG / JPG / WEBP) in `design assets/`.
2. Add an entry to `src/data/exhibits.ts` (slug, `source` filename, category, `wing`, year,
   tags, and the placard copy). Wings are defined in `src/data/wings.ts`.
3. `npm run content` to optimize the new image(s).

The timeline milestones live in `src/data/timeline.ts`.

## Optional: AI copy (Groq) + database (Neon)

Both are optional — the app ships with hand-authored placard copy. To enable generation:

1. Copy `.env.local.example` → `.env.local` and fill in:
   - `DATABASE_URL` — a free Neon Postgres connection string.
   - `GROQ_API_KEY` — a free key from https://console.groq.com/keys
2. `npm run ingest` — generates case-study copy with Groq, upserts it into Neon, and writes
   `src/content/copy.json`, which the app prefers over the hand-authored fallback.

Secrets live only in `.env.local` (git-ignored) and are never printed or committed.

## Controls

- **Timeline** — scroll / pinch to zoom, drag to pan, click a milestone for its placard,
  filter by phase / category / skill, search.
- **Museum** — **WASD** to move, **mouse** to look, **click** an artwork to read its placard,
  **Esc** to release the cursor. Desktop only (uses Pointer Lock); the timeline is touch-friendly.

## Project structure

```
design assets/            source design sheets (input)
public/exhibits/          generated optimized WebP (output of `npm run content`)
src/data/                 typed content: types, timeline, wings, exhibits
src/content/              content loader + generated images.json / copy.json
src/lib/                  timeline + museum layout, db + groq clients
src/components/timeline/  the constellation timeline
src/components/museum/    the walkable 3D museum
scripts/                  build-content.ts (images), ingest-ai.ts (Groq + Neon)
```

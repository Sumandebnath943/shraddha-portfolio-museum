# Project Handoff — Shraddha Sonel Design Museum

> A living context document so any new chat session (or developer) can pick up
> with full context. Keep it updated when the project state changes materially.

- **Last updated:** 2026-06-20
- **Current HEAD:** `a29d258` (branch `main`)
- **Repo:** https://github.com/Sumandebnath943/shraddha-portfolio-museum
- **Local path:** `D:\project\shraddha-portfolio-2 - Copy`
- **Owner:** Suman Debnath (suman.debnath@pibm.in) — building this portfolio museum for designer **Shraddha Sonel**.

---

## 1. What this is

An interactive portfolio for multidisciplinary graphic designer **Shraddha Sonel**, built as two connected experiences:

1. **Landing (`/`)** — a cinematic **particle constellation**. ~150k GPU points form a glowing "living organism" that morphs through her face and her art forms (lightbulb, bezier pen path, swatches, bauhaus, ampersand, frame, butterfly), over a spiral **career constellation** (timeline). Clicking **Enter the Museum** plays an orb→shatter→white sequence and transitions to the museum.
2. **Museum (`/museum`)** — a **walkable first-person 3D gallery** (pointer-lock FPS controls) with exhibits on the walls, an **AI-driven guide avatar** (a robot host who greets, leads, comments, and chats), a kiosk for résumé/portfolio downloads, and benches.

Aesthetic: "Deep Cosmos" gold-on-dark for the landing; a warm, bright, marble gallery for the museum. The museum cover page is light/parchment; the walkable interior is still dark (planned to go light later).

---

## 2. Tech stack

- **Next.js 16.2.9** (App Router) + **React 19** + **TypeScript**.
  - ⚠️ See `AGENTS.md`: *"This is NOT the Next.js you know."* APIs/conventions may differ from older Next. **Read `node_modules/next/dist/docs/` before writing Next-specific code.**
- **react-three-fiber 9** + **drei 10** + **three 0.184** + **@react-three/postprocessing** — all 3D.
- **zustand 5** — state (`src/store/constellation.ts`, `src/store/museum.ts`); non-reactive per-frame values via plain module objects.
- **motion** (Framer Motion successor) — small UI animations.
- **Groq SDK** (`llama-3.3-70b-versatile`) — AI guide chat + build-time copy generation.
- **@neondatabase/serverless** (Neon Postgres) — persists AI-generated placard copy at ingest time.
- **Tailwind CSS v4**.
- Asset tooling (dev only): `sharp`, `@napi-rs/canvas`, `@gltf-transform/*`, `meshoptimizer`, `fbx2gltf`.

---

## 3. Run / build / scripts

```bash
npm run dev        # next dev (localhost:3000)
npm run build      # next build
npm run start      # next start (after build)
npm run lint       # eslint
npm run content    # tsx scripts/build-content.ts  → regenerates src/content/*.json
npm run ingest     # AI copy-gen (Groq) → Neon  (needs .env.local)
npm run build:assistant  # process the guide GLB
```

### Environment variables (`.env.local`, gitignored — see `.env.local.example`)
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (placard copy persistence). |
| `GROQ_API_KEY` | Groq key for the live chat **and** ingest copy-gen. If absent, chat returns a graceful fallback message. |
| `GROQ_MODEL` | Chat/ingest model (default `llama-3.3-70b-versatile`). |
| `NEXT_PUBLIC_CONTACT_HINT` | Optional override for how the guide points visitors to Shraddha (defaults to her email + "résumé at the kiosk"). |

---

## 4. File map (the important bits)

```
src/
  app/
    page.tsx                  → renders <Constellation/> (the landing)
    museum/page.tsx           → dynamic import of <Museum/> (ssr:false; WHITE loading fallback)
    api/chat/route.ts         → AI guide chat endpoint (Groq stream) + SECURITY (see §7)
    layout.tsx, globals.css
  components/
    constellation/            → the landing 3D scene
      Constellation.tsx       → top-level: Canvas + overlay chrome + Enter-Museum + warp/flash + landing reset
      Scene.tsx               → lights, fog, bloom, particle COUNT, EnvController (bgLight)
      CameraRig.tsx           → intro pull-back + drag/zoom + parallax
      Backdrop, Spine, StarNode, textures
    particles/
      ParticleField.tsx       → ★ the whole particle system: shapes, budgets, intro, morphs, orb/burst warp
      ParticleLayer.tsx       → deprecated no-op
    museum/
      Museum.tsx              → ★ Canvas, lights (incl. hero name light), PointerLockControls, gate/cover, HUD, all input handlers
      Player.tsx              → WASD movement, seated/auto-pan, free-look fallback, player↔guide collision
      Assistant.tsx           → ★ AI guide avatar behaviour state machine (greet/menu/lead/follow/roam/attention/dance/chat)
      AssistantChat.tsx       → chat panel UI, suggested chips, Web Speech TTS + STT (voice)
      GuideMenu.tsx           → "where would you like to go?" wing chips (auto-dismiss 10s)
      Exhibit.tsx             → exhibit frames + the dynamic SpotlightPool (exhibit spotlights)
      Architecture.tsx        → floor/walls/ceiling/columns/benches/light-coves/signage
      Decor.tsx, Kiosk.tsx, MuseumPlacard.tsx
    timeline/                 → 2D timeline components (FilterBar, Timeline, MilestonePlacard, Starfield)
  data/                       → SOURCE OF TRUTH content (currently partly DUMMY — see §10)
    types.ts                  → Milestone, Wing, Exhibit interfaces
    timeline.ts               → career milestones
    exhibits.ts               → exhibit catalogue
    wings.ts                  → the 5 gallery wings (identity/print/social/marketing/infographics)
  content/
    index.ts                  → getExhibits(), milestones, wings, wingById ...
    copy.json, images.json    → BUILD-TIME generated (npm run content / ingest)
  lib/
    particle-shapes.ts        → ★ all particle target generators (face, art shapes, seed/sun/orb/sky, halo)
    constellation-layout.ts   → spiral career layout, SKIN palettes (dark/light)
    museum-layout.ts          → museum geometry, nav graph, ASSISTANT config, collide(), SPAWN, SEATS
    groq.ts, db.ts, timeline-layout.ts, constellation-audio.ts, decor-credits.ts
  store/
    constellation.ts          → landing state (mode, warping, faceFormed, skin, env.bgLight)
    museum.ts                 → museum state (entered, locked, freeLook, chatOpen, nearby, selected, guide flags, playerPos/dir/assistantPos)
public/
  face.bin, face.meta.json    → baked portrait point cloud (from scripts/bake-portrait.mjs)
  portrait.jpg, models/assistant.glb, resume.pdf, portfolio.pdf, decor GLBs
scripts/                      → bake-portrait, build-content, ingest-ai, build-assistant, fetch/discover-decor, make-placeholder-pdfs, preview-shapes
```

---

## 5. The landing / particle system (deep notes)

**Pool & budgets** (`ParticleField.tsx`): total `count` set in `Scene.tsx` (**150k desktop / 60k mobile**). Brightness is controlled by **per-particle opacity**, never by dimming glow (the user is firm on this):
- **Shape** particles = full glow (opacity 1).
- **Halo** = `HALO_FRAC` (~0.12) dim aura hugging the shape.
- **Background stars** = `SKY_FRAC` (~0.16) at ~20% opacity, full-screen, **fixed home positions**, night-sky twinkle.
- Each shape uses only its budget (`SHAPE_FRAC`, face ~0.48 = sparse line-portrait); leftover → halo/stars so shapes read instead of blowing out.

**Bloom** (Scene.tsx) is tuned so only the brightest (shape) particles bloom.

**Intro sequence:** dot → sun (centre) → spread left → face → cycles art shapes (`PLAYLIST`). Morphs use **per-particle staggered reassembly + a coherent flow field** so it reads as one living organism; incoming particles ignite (brighten) only on arrival.

**Enter-Museum sequence** (driven by `uOrb`/`uGlow`/`uSolid`/`uBurst` over ~6.6s in `ParticleField` useFrame + `Constellation.tsx` white overlay + nav timeout):
gather into a gold **alien orb** (writhing, multi-lobe surface + slow spin) → gradual glow → solid source of light → **shatter into a million pieces** → screen floods to **white** → navigate to `/museum`.

**Cross-route white bridge:** the `/museum` lazy-load fallback and the museum cover **start at the same `#ffffff`**, then the cover background **warms white→cream** while content materialises (blur→sharp, "Venom" reveal) — no dark/loading flash, no colour jump.

**Tuning knobs:** `Scene.tsx` (count, lights, bloom), `ParticleField.tsx` (`SHAPE_FRAC`/`HALO_FRAC`/`SKY_FRAC`, intro timings, orb/burst timeline), `particle-shapes.ts` (generators), `Constellation.tsx` `enterMuseum` (timeout 6600 + white overlay delay).

---

## 6. The museum (deep notes)

**Controls / pointer lock — IMPORTANT GOTCHAS:**
- The museum uses **PointerLockControls** (FPS mouse-look). drei's wrapper **auto-locks on every document click** — this caused bugs, so it's **disabled** via `selector="#__no_autolock__"`. We lock **explicitly** (Enter/Resume button, placard/kiosk close, chat close).
- **Pointer lock is blocked in some contexts** (embedded preview panes, certain permissions policies). Detection is **runtime**: we attempt a real lock; on `pointerlockerror` we fall back to **free-look** (`store.freeLook`) where you steer the view by moving the cursor toward screen edges (center = still) + WASD. A successful lock clears free-look. `Player.tsx` only applies cursor-steer when `document.pointerLockElement === null` so it can never fight a real lock.
- `active = locked || freeLook` gates the cover/HUD.

**Lighting** (`Museum.tsx` `Scene`): warm & bright — ambient 0.9, hemisphere 0.8, directional 0.7, exposure 1.12, vignette 0.18, warm background/fog. A dedicated **hero spotlight** washes her name on the entrance title wall (wide cone). Exhibit spotlights live in `Exhibit.tsx` `SpotlightPool` (dynamic, follow the player; base intensity 36). The dark gray-blue reflective floor (`Architecture.tsx`) is the main remaining cool note (a *material*, left untouched per owner's "lighting only" instruction).

**The AI guide avatar** (`Assistant.tsx`) — behaviour state machine, in priority order:
- **greet** once on arrival → **menu** (offers wings ~3.5s later; auto-dismisses 10s) → **lead/escort** to a chosen wing → **follow** (only for **12s after a chat closes**, while in range) → **linger commentary** (one-line insight if you dwell on a piece) → **attention** (faces you if close or you look at her) → **roam** (~45% drift toward you, else linger at an artwork bay).
- **Dancing** = random **12% chance on arriving at a roam destination** (rare/spontaneous).
- Player can no longer walk through her (personal-radius collision in `Player.tsx`).

---

## 7. The chat / AI guide (`/api/chat` + `AssistantChat.tsx`)

- Streams from Groq (`route.ts`). System prompt = warm docent voice + her **career timeline + exhibit catalogue** + nearby-exhibit details.
- **Security (hardened):** the prompt treats user messages as **data, not instructions**; refuses role/instruction overrides, "ignore previous instructions", "act as", "dev/DAN mode", reveal-the-prompt, etc. Server-side: **per-IP rate limit** (20/min, in-memory), **input caps** (per-message length, history length, role validation).
- **Answer policy (owner-approved):** broad helpful scope (Shraddha + her work + general design chat). For hiring managers it shares: open to **full-time** roles; locations **Pune / Kolkata / fully remote**; currently a **graphic designer at PIBM since 2019**; seeking a **senior/leadership** role (lead a team, more advanced work). **Salary** (current or expected) → never gives figures; **deflects to a quick call** + contact: `shraddhasonel@gmail.com` (phone on the résumé at the kiosk). Never invents facts.
- **Voice:** free browser **Web Speech API** — she SPEAKS replies (TTS, rate 1.14, sentence-by-sentence) and you can ASK by voice (STT, mic button / "V"). Chosen over paid TTS for cost.
- **UI:** redesigned panel (gold avatar header + status) with **one-tap starter chips** (`SUGGESTIONS` in `AssistantChat.tsx`). **Esc** and the ✕ close the chat.

---

## 8. Current stage — DONE

Commit history (newest first):
```
a29d258 Museum fixes: controls, chat, guide behaviour, hero light, landing reset
9d73f91 Museum: brighter, warmer ambience + hero light on the name
ba09f94 Museum entry: living orb → shatter to white → light cover; no-lock fallback
92c1645 Refine particle field: opacity roles, per-shape motion, organic morphs
7f7c8fb Add particle constellation landing + museum guide; fix shape density
27e8a3d Fix guide avatar: scale, floor, navigation, chat summon & placement
594926a Make the guide avatar a living, AI-driven museum host
1f0d865 Integrate guide avatar (assistant.glb) with patrol/greet system
882addc Generate AI placard copy (Groq) + persist to Neon
4897263 Polish round: labels, marble columns, more foliage, perf
1515288 Build walkable 3D museum + constellation timeline portfolio
06242c1 Initial commit
```

Recent fixes verified/working: cinematic landing + museum-entry sequence; museum entry seamless (no dark/colour flash); brighter happy museum + hero name light; mouse-look (pointer lock) working; free-look fallback for lock-blocked contexts; Esc closes chat; chat redesigned + starter chips; chat security hardened; guide menu auto-dismiss; player↔guide collision; back-from-museum shows a fresh landing; voice instruction + snappier TTS.

---

## 9. Next big round (planned) — REAL DATA

The single biggest pending work, explicitly deferred by the owner:
1. **Replace dummy content with her real data** — actual work experiences (`src/data/timeline.ts`), actual selected works/exhibits (`src/data/exhibits.ts`) placed across the museum wings, real images/assets.
2. **Tune all copy** to match — placard copy, wing intros, landing taglines, and the **chatbot's factual answers** (the system prompt facts in `route.ts` + the generated copy via `npm run content` / `npm run ingest`).
3. Likely: re-run `bake-portrait.mjs` if the portrait changes; re-run content/ingest pipeline.

Other backlog / nice-to-haves (owner to prioritise):
- Make the **walkable museum interior light** (deferred; currently only the cover page is light). The cool reflective floor material is the main lever.
- Fill `NEXT_PUBLIC_CONTACT_HINT` / confirm contact + whether the salary deflection should also offer to take an email.
- Optional: faster/cloud TTS if Web Speech feels slow; refine hero light to two flanking lights if the single wide cone spills too much.

---

## 10. Known constraints, gotchas & conventions

- **Content is partly DUMMY** right now (exhibits and some copy are placeholders) — do not treat as final; the real-data round replaces it.
- **Preview/embedded browsers block Pointer Lock** → the museum runs in free-look fallback there. **Always verify pointer-lock mouse-look in a real top-level browser tab.**
- **The preview tab pauses `requestAnimationFrame` when backgrounded** → the 3D scene freezes and screenshot tooling times out. If the scene won't load or a screenshot hangs, the tab is likely not focused — this is environmental, not a bug.
- **drei `PointerLockControls` auto-locks on click** — kept disabled via `selector="#__no_autolock__"`. If you re-enable it, stray clicks will re-lock the pointer and break Esc-to-close-chat.
- **Git on Windows:** harmless `LF will be replaced by CRLF` warnings on commit.
- **Commit message footer:** end commits with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **AGENTS.md / CLAUDE.md:** this Next.js version has breaking changes vs training data — read `node_modules/next/dist/docs/` before writing Next code; heed deprecations.
- **Branch:** work on `main` (owner's repo); commit + push only when the owner asks.
- **Persistent assistant memory** lives at `C:\Users\Admin\.claude\projects\D--project-shraddha-portfolio-2---Copy\memory\` (project decisions, particle density rules, guide decisions). Keep it in sync with this handoff.

---

## 11. Quick "where do I change…?" index

| I want to change… | File · symbol |
|---|---|
| Particle count / landing lights / bloom | `constellation/Scene.tsx` |
| Per-shape particle density, halo, stars, intro & orb/burst timing | `particles/ParticleField.tsx` (`SHAPE_FRAC`, `HALO_FRAC`, `SKY_FRAC`, useFrame) |
| Particle shape generators (face, art forms, sun/orb/sky, halo) | `lib/particle-shapes.ts` |
| Enter-Museum timing / white flash | `constellation/Constellation.tsx` `enterMuseum` |
| Museum brightness / ambience / hero name light | `museum/Museum.tsx` `Scene` |
| Exhibit spotlight brightness | `museum/Exhibit.tsx` (`SpotlightPool`, base `36`) |
| Guide behaviour (follow 12s, dance 12%, ranges) | `museum/Assistant.tsx` + `lib/museum-layout.ts` `ASSISTANT` |
| Chat answers / facts / security / rate limits | `app/api/chat/route.ts` |
| Chat UI / starter chips / voice rate | `museum/AssistantChat.tsx` |
| Career milestones / exhibits / wings (REAL DATA) | `data/timeline.ts`, `data/exhibits.ts`, `data/wings.ts` |
| Museum geometry / spawn / nav graph / collision | `lib/museum-layout.ts` |

---

_When you finish a meaningful chunk of work, update §8 (done) and §9 (next), bump "Last updated" + "Current HEAD", and mirror anything durable into the assistant memory folder._

/**
 * Optional AI ingest. For every exhibit, generates museum-placard case-study
 * copy with Groq (free, OpenAI-compatible) and upserts the full record into
 * Neon Postgres. Writes src/content/copy.json so the app uses the generated
 * copy in place of the hand-authored fallback.
 *
 * Safe to run repeatedly. No-ops gracefully if keys are absent.
 * Never prints secrets.
 *
 * Run: npm run ingest
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import Groq from "groq-sdk";
import { neon } from "@neondatabase/serverless";
import { exhibits } from "../src/data/exhibits";

const ROOT = process.cwd();
const COPY_OUT = path.join(ROOT, "src", "content", "copy.json");
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

type GeneratedCopy = {
  overview: string;
  challenge: string;
  solution: string;
  outcomes: string[];
  insight: string;
};

const SYSTEM = `You are a museum curator writing exhibit placards for a premium design museum dedicated to graphic designer Shraddha Sonel — a multidisciplinary designer (brand identity, print, digital campaigns, social, infographics). Write with restraint, authority, and warmth, in the voice of a contemporary design museum (think MoMA, Dieter Rams). No marketing fluff, no emojis, no exclamation marks. British/neutral spelling. Return ONLY valid minified JSON.`;

function userPrompt(e: (typeof exhibits)[number]) {
  return `Exhibit: "${e.title}"
Category: ${e.category}
Client: ${e.client ?? "—"}
Year: ${e.year}
What the work is: ${e.brief}
Tags: ${e.tags.join(", ")}

Write museum-placard case-study copy as JSON with exactly these keys:
{"overview": string (2 sentences), "challenge": string (1-2 sentences), "solution": string (1-2 sentences), "outcomes": string[] (exactly 3 short phrases), "insight": string (1 sentence, a designer's reflection)}.
Ground every claim in the described work; do not invent specific metrics or client names not given.`;
}

async function generate(groq: Groq, e: (typeof exhibits)[number]): Promise<GeneratedCopy> {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userPrompt(e) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as GeneratedCopy;
  if (!parsed.overview || !Array.isArray(parsed.outcomes)) {
    throw new Error("incomplete copy");
  }
  return parsed;
}

async function main() {
  const groqKey = process.env.GROQ_API_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!groqKey) {
    console.log("GROQ_API_KEY not set — skipping AI generation. App will use hand-authored copy.");
    return;
  }
  const groq = new Groq({ apiKey: groqKey });
  const sql = dbUrl ? neon(dbUrl) : null;

  if (sql) {
    await sql`
      create table if not exists exhibits (
        slug text primary key,
        title text not null,
        category text,
        wing text,
        client text,
        year text,
        start_year int,
        end_year int,
        phase text,
        tags text[],
        overview text,
        challenge text,
        solution text,
        outcomes text[],
        insight text,
        updated_at timestamptz default now()
      )`;
    console.log("Neon: exhibits table ready.");
  } else {
    console.log("DATABASE_URL not set — generating copy without persisting to Neon.");
  }

  const copyMap: Record<string, GeneratedCopy> = {};
  for (const e of exhibits) {
    try {
      const c = await generate(groq, e);
      copyMap[e.slug] = c;
      if (sql) {
        await sql`
          insert into exhibits (slug, title, category, wing, client, year, start_year, end_year, phase, tags, overview, challenge, solution, outcomes, insight, updated_at)
          values (${e.slug}, ${e.title}, ${e.category}, ${e.wing}, ${e.client ?? null}, ${e.year}, ${e.startYear}, ${e.endYear}, ${e.phase}, ${e.tags}, ${c.overview}, ${c.challenge}, ${c.solution}, ${c.outcomes}, ${c.insight}, now())
          on conflict (slug) do update set
            overview = excluded.overview, challenge = excluded.challenge,
            solution = excluded.solution, outcomes = excluded.outcomes,
            insight = excluded.insight, updated_at = now()`;
      }
      console.log(`✓ ${e.slug}`);
    } catch (err) {
      console.warn(`! ${e.slug} failed, keeping fallback copy:`, (err as Error).message);
    }
  }

  await writeFile(COPY_OUT, JSON.stringify(copyMap, null, 2));
  console.log(`\nWrote ${COPY_OUT} (${Object.keys(copyMap).length} exhibits).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

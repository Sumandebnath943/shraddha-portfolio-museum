import { getGroq, GROQ_MODEL } from "@/lib/groq";
import { getExhibits, milestones } from "@/content";
import type { ChatMsg } from "@/store/museum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build the guide's knowledge: a compact catalogue + career timeline always,
// plus full placard copy for the exhibit the visitor is near or asking about.
function buildSystemPrompt(nearbySlug: string | undefined, question: string): string {
  const ex = getExhibits();
  const catalogue = ex
    .map((e) => `- ${e.title} — ${e.category}, ${e.year} [${e.wing} wing]`)
    .join("\n");
  const career = [...milestones]
    .sort((a, b) => a.order - b.order)
    .map((m) => `- ${m.dates}: ${m.title}, ${m.organization} — ${m.tagline}`)
    .join("\n");

  const q = question.toLowerCase();
  const relevant = ex.filter(
    (e) =>
      e.slug === nearbySlug ||
      (q.length > 2 &&
        (q.includes(e.title.toLowerCase()) ||
          q.includes(e.category.toLowerCase()) ||
          e.tags.some((t) => q.includes(t.toLowerCase())))),
  );
  const details = relevant
    .slice(0, 3)
    .map(
      (e) =>
        `### ${e.title} (${e.category}, ${e.year}${e.client ? `, ${e.client}` : ""})\n${e.overview}\nChallenge: ${e.challenge}\nSolution: ${e.solution}\nInsight: ${e.insight}`,
    )
    .join("\n\n");

  return `You are the gallery guide at The Design Museum of Shraddha Sonel — a multidisciplinary graphic designer working across brand identity, print & packaging, social media, marketing campaigns and infographics. You warmly welcome visitors and answer questions about the exhibits and about Shraddha's career.

Voice: a friendly, knowledgeable docent speaking aloud. Be concise — 1 to 3 short sentences. Conversational, no markdown, no bullet lists, no emojis. Never invent facts, clients, or metrics; if you don't know, say so and suggest a wing to explore. If asked who you are, you are Shraddha's gallery guide.

Shraddha's career:
${career}

Exhibits currently on show:
${catalogue}
${details ? `\nDetails on what the visitor is looking at / asking about:\n${details}` : ""}`;
}

export async function POST(req: Request) {
  const groq = getGroq();
  let body: { messages?: ChatMsg[]; nearbySlug?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const messages = (body.messages ?? []).filter((m) => m.content?.trim()).slice(-10);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const encoder = new TextEncoder();
  if (!groq) {
    // graceful fallback when no API key is configured
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(
          encoder.encode(
            "I'm not connected to my knowledge service right now, but feel free to explore the wings — each placard tells the story of the work.",
          ),
        );
        c.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const system = buildSystemPrompt(body.nearbySlug, lastUser?.content ?? "");
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          temperature: 0.5,
          max_tokens: 350,
          stream: true,
          messages: [{ role: "system", content: system }, ...messages],
        });
        for await (const chunk of completion) {
          const t = chunk.choices[0]?.delta?.content ?? "";
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch {
        controller.enqueue(encoder.encode(" — sorry, I lost my train of thought. Could you ask again?"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

import Groq from "groq-sdk";

// Returns a Groq client, or null if GROQ_API_KEY is not configured.
export function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

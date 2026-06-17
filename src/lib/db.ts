import { neon } from "@neondatabase/serverless";

// Returns a Neon SQL client, or null if DATABASE_URL is not configured.
// Never logs the connection string.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

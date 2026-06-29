/**
 * Centralized Supabase public configuration.
 *
 * Reads the new publishable key (`sb_publishable_…`) with a fallback to the
 * legacy anon key, so the app keeps working whether or not the project has
 * opted into the new asymmetric API keys.
 */

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Copy .env.example to .env and fill it in.'
    );
  }
  return url;
}

export function supabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. Copy .env.example to .env and fill it in.'
    );
  }
  return key;
}

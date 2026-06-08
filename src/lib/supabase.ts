import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("SUPABASE KEY EXISTS:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log("[Supabase] URL valid:", isValidHttpUrl(supabaseUrl ?? ""));

export function isSupabaseConfigured(): boolean {
  return isValidHttpUrl(supabaseUrl ?? "") && Boolean(supabaseAnonKey);
}

let client: SupabaseClient | null = null;

/** Lazily creates the Supabase client so invalid env vars don't crash the app at import time. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[Supabase] Not configured. Set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
    );
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log("[Supabase] Client initialized:", supabaseUrl);
  }

  return client;
}

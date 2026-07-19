import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase público não configurado.");
  instance = createClient(url, anonKey);
  return instance;
}

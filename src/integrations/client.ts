import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase key present:", !!supabaseKey);

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is missing in .env");
}

if (!supabaseKey) {
  throw new Error(
    "Supabase key is missing. Set VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY in .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

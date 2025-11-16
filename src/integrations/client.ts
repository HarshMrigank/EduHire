import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase anon key present:", !!supabaseAnonKey);

if (!supabaseUrl) {
  throw new Error("❌ VITE_SUPABASE_URL is missing");
}

if (!supabaseAnonKey) {
  throw new Error("❌ VITE_SUPABASE_ANON_KEY is missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


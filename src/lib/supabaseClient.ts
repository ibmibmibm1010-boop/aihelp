import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файле .env (см. .env.example).",
  );
}

export const supabase = createClient(url, anonKey);

import { getSupabase } from "@shared/lib/supabase-client";

/** Один экземпляр с PKCE и теми же опциями auth, что в api-слое */
export const supabase = getSupabase();

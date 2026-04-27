import { getSupabase } from "@shared/lib/supabase-client";

export type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export async function fetchProfilesByIds(ids: string[]): Promise<ProfileRow[]> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in("id", uniq);
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

import type { Session } from "@supabase/supabase-js";

import { clearAuthTokens } from "../lib/auth-storage";
import { getOAuthCallbackUrl } from "../lib/oauth-redirect";
import { getSupabase } from "../lib/supabase-client";

export interface SignUpPayload {
  email: string;
  username: string;
  password: string;
  full_name?: string | null;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export async function fetchCurrentUser(): Promise<User> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError ?? new Error("Пользователь не найден");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, full_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && import.meta.env.DEV) {
    console.warn("[auth] profiles:", profileError.message);
  }

  const row = profileError ? null : profile;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const metaUsername =
    typeof meta?.username === "string" ? meta.username : null;
  const metaFullName =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof meta?.name === "string"
        ? meta.name
        : null;

  return {
    id: user.id,
    email: user.email ?? "",
    username: row?.username ?? metaUsername,
    full_name: row?.full_name ?? metaFullName,
    is_active: true,
    created_at: row?.created_at ?? user.created_at ?? new Date().toISOString(),
  };
}

export async function getMe(): Promise<User> {
  return fetchCurrentUser();
}

/** Регистрация через Supabase Auth; сессия может отсутствовать при подтверждении email. */
export async function signUp(
  data: SignUpPayload,
): Promise<{ session: Session | null }> {
  const supabase = getSupabase();
  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: getOAuthCallbackUrl(),
      data: {
        username: data.username,
        full_name: data.full_name ?? undefined,
      },
    },
  });
  if (error) throw error;
  return { session: result.session };
}

/**
 * Вход через Google. Перед редиректом сбрасываем локальную сессию и просим Google показать выбор аккаунта
 * (иначе часто подставляется тот же Google-аккаунт без возможности сменить почту).
 */
export async function signInWithGoogle(): Promise<void> {
  if (typeof window === "undefined") return;
  const supabase = getSupabase();
  await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthCallbackUrl(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  clearAuthTokens();
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

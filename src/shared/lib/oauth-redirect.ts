/**
 * URL возврата после OAuth (точное совпадение в Supabase → Authentication → URL Configuration → Redirect URLs).
 * На проде можно задать VITE_AUTH_REDIRECT_URL, если origin при сборке/деплое отличается от фактического домена.
 */
export function getOAuthCallbackUrl(): string {
  if (typeof window === "undefined") return "";
  const explicit = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = import.meta.env.BASE_URL || "/";
  const origin = window.location.origin;
  const baseNormalized = base.endsWith("/") ? base : `${base}/`;
  return new URL("auth/callback", origin + baseNormalized).href;
}

import type { AuthError } from "@supabase/supabase-js";

export function authErrorToRu(error: AuthError | null): string {
  if (!error) {
    return "Произошла ошибка. Попробуйте ещё раз.";
  }

  const msg = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";
  const status = error.status;

  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Слишком много запросов к почте. Подождите 10–60 минут или смените лимиты в Supabase (Authentication → Rate Limits).";
  }

  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed")
  ) {
    return "Сначала подтвердите email по ссылке из письма (проверьте «Спам»). Ниже можно отправить письмо ещё раз.";
  }

  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials")
  ) {
    return "Неверный email или пароль. Если вы только что зарегистрировались — откройте ссылку подтверждения из письма; без этого вход не сработает.";
  }

  if (msg.includes("user already registered")) {
    return "Этот email уже зарегистрирован.";
  }

  if (msg.includes("password")) {
    return error.message;
  }

  return error.message;
}

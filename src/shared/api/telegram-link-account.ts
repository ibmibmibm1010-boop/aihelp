import { getSupabase } from "@shared/lib/supabase-client";

import { getVeniceWorkerBaseUrl } from "./venice-llm";

/** Привязка Telegram user id → текущий Supabase аккаунт и целевая доска (вызывает helloword). */
export async function linkTelegramToAccount(input: {
  telegramUserId: number;
  defaultBoardId: string;
}): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Необходимо войти в аккаунт.");
  }

  const base = getVeniceWorkerBaseUrl();
  const res = await fetch(`${base}/telegram/link-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      telegram_user_id: input.telegramUserId,
      default_board_id: input.defaultBoardId.trim(),
    }),
  });

  const rawText = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(rawText) as { ok?: boolean; error?: string };
  } catch {
    throw new Error(`Ответ воркера не JSON (HTTP ${res.status}).`);
  }

  if (!res.ok || !data || typeof data !== "object" || ("ok" in data && data.ok !== true)) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : res.statusText || "Не удалось привязать Telegram.";
    throw new Error(msg);
  }
}

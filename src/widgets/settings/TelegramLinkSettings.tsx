import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchBoards, type Board } from "@shared/api/boards";
import { linkTelegramToAccount } from "@shared/api/telegram-link-account";
import { useAuth } from "@shared/lib/auth-context";
import { pressableBase } from "@shared/ui";

const cardMuted = "rounded-vibe border border-vibe-line bg-white/75 p-5 text-sm text-vibe-muted sm:p-6";
const btnPrimary = `${pressableBase} inline-flex items-center justify-center rounded-xl bg-vibe-purple px-4 py-2.5 font-semibold text-white shadow-md shadow-vibe-purple/20 hover:brightness-105`;

/** Настройки: привязка Telegram-к аккаунту и доске для задач из бота. */
export function TelegramLinkSettings() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [telegramIdRaw, setTelegramIdRaw] = useState("");
  const [boardId, setBoardId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState<string | null>(null);

  const loggedIn = Boolean(currentUser);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchBoards();
        if (!cancelled) {
          setBoards(list);
          setBoardsError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBoardsError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const boardOptions = useMemo(
    () => boards.map((b) => ({ id: b.id, label: b.name })),
    [boards],
  );

  const tgIdParsed = useMemo(() => {
    const s = telegramIdRaw.trim();
    if (!/^\d{4,}$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }, [telegramIdRaw]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setSavedOk(null);
      if (!loggedIn) {
        setFormError(t("settings.telegram.needLogin"));
        return;
      }
      if (!tgIdParsed) {
        setFormError(t("settings.telegram.invalidTgId"));
        return;
      }
      const bid = boardId.trim();
      if (!bid) {
        setFormError(t("settings.telegram.pickBoard"));
        return;
      }
      setSubmitting(true);
      try {
        await linkTelegramToAccount({ telegramUserId: tgIdParsed, defaultBoardId: bid });
        setSavedOk(t("settings.telegram.saved"));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [boardId, loggedIn, t, tgIdParsed],
  );

  return (
    <section className="rounded-vibe border border-vibe-line bg-white/90 p-6 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-8">
      <h2 id="telegram-heading" className="text-lg font-bold tracking-tight text-ink">
        {t("settings.telegram.title")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-vibe-muted">{t("settings.telegram.body")}</p>
      {!loggedIn ? (
        <p className={`mt-4 ${cardMuted}`}>{t("settings.telegram.needLoginBlock")}</p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <label className="block">
            <span className="text-sm font-medium text-ink">{t("settings.telegram.telegramIdLabel")}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="telegramUserId"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("settings.telegram.telegramIdPlaceholder")}
              value={telegramIdRaw}
              onChange={(e) => setTelegramIdRaw(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-xl border border-vibe-line bg-white px-3 py-2.5 text-ink outline-none ring-vibe-purple/30 transition focus:border-vibe-purple focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">{t("settings.telegram.boardLabel")}</span>
            <select
              name="boardId"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              disabled={boards.length === 0}
              className="mt-1 block w-full max-w-md rounded-xl border border-vibe-line bg-white px-3 py-2.5 text-ink outline-none ring-vibe-purple/30 transition focus:border-vibe-purple focus:ring-2"
            >
              <option value="">—</option>
              {boardOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          {boardsError ? <p className="text-sm text-red-600">{boardsError}</p> : null}
          {boards.length === 0 && loggedIn && !boardsError ? (
            <p className="text-sm text-vibe-muted">{t("settings.telegram.noBoards")}</p>
          ) : null}
          <p className="text-xs leading-relaxed text-vibe-muted">{t("settings.telegram.hintBot")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting || boards.length === 0} className={btnPrimary}>
              {submitting ? t("settings.telegram.saving") : t("settings.telegram.save")}
            </button>
          </div>
          {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          {savedOk ? <p className="text-sm font-medium text-emerald-700">{savedOk}</p> : null}
        </form>
      )}
    </section>
  );
}

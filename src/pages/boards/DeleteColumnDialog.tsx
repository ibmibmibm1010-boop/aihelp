import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { pressableBase } from "@shared/ui";

const secondaryBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/90 px-6 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60`;

const dangerBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-red-200 bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60`;

type DeleteColumnDialogProps = {
  titleId: string;
  columnName: string;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
};

export function DeleteColumnDialog({
  titleId,
  columnName,
  onClose,
  onConfirm,
  busy,
  error,
}: DeleteColumnDialogProps) {
  const { t } = useTranslation();

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !busy) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-vibe border border-vibe-line bg-white/95 p-6 shadow-2xl shadow-vibe-purple/20 backdrop-blur-md sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
          {t("boards.detail.deleteColumnConfirmTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-vibe-muted">
          {t("boards.detail.deleteColumnConfirmBody", { name: columnName || "—" })}
        </p>
        {error ? (
          <p
            className="mt-4 rounded-vibe border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryBtn} onClick={onClose} disabled={busy}>
            {t("boards.detail.deleteColumnCancel")}
          </button>
          <button type="button" className={dangerBtn} onClick={onConfirm} disabled={busy}>
            {busy
              ? t("boards.detail.deleteColumnSubmitting")
              : t("boards.detail.deleteColumnSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}

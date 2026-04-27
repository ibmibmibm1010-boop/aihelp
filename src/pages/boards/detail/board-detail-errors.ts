import i18n from "i18next";

import { getApiErrorMessage } from "@shared/lib";

export function boardPageErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : getApiErrorMessage(err);
  if (/relation ["']tasks["'] does not exist|Could not find the table.*tasks/i.test(msg)) {
    return i18n.t("errors.tasksTable");
  }
  if (
    /relation ["']board_columns["'] does not exist|Could not find the table.*board_columns/i.test(
      msg,
    )
  ) {
    return i18n.t("errors.boardColumnsTable");
  }
  if (
    /column.*\bsection\b.*board_columns|board_columns.*\bsection\b|PGRST204.*section/i.test(
      msg,
    )
  ) {
    return i18n.t("errors.columnSectionMigration");
  }
  if (/card_color|PGRST204.*card_color/i.test(msg)) {
    return i18n.t("errors.cardColorColumn");
  }
  if (/attachment_urls|PGRST204.*attachment_urls/i.test(msg)) {
    return i18n.t("errors.attachmentUrlsColumn");
  }
  return msg;
}

export function normalizeHexColor(raw: string): string | null {
  const s = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

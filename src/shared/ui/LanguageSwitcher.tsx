import { useTranslation } from "react-i18next";

import { pressableBase } from "./pressable-styles";

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "ru";

  const segmentClass = (code: "ru" | "en") =>
    `${pressableBase} min-w-[2.25rem] rounded-vibe px-2 py-1 text-xs font-bold uppercase tracking-wide transition ${
      lang === code
        ? "bg-vibe-purple/15 text-vibe-purple shadow-sm"
        : "text-vibe-muted hover:bg-white/80 hover:text-ink"
    }`;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="group"
      aria-label={t("lang.label")}
    >
      <button
        type="button"
        className={segmentClass("ru")}
        aria-pressed={lang === "ru"}
        onClick={() => void i18n.changeLanguage("ru")}
      >
        RU
      </button>
      <span className="select-none px-0.5 text-xs font-semibold text-vibe-muted" aria-hidden>
        /
      </span>
      <button
        type="button"
        className={segmentClass("en")}
        aria-pressed={lang === "en"}
        onClick={() => void i18n.changeLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}

import { useTranslation } from "react-i18next";

import { hoverLiftCard } from "@shared/ui";

const cardClass =
  `group rounded-vibe border border-vibe-line bg-white/90 p-6 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-8 ${hoverLiftCard}`;

const badgeClass =
  "inline-flex origin-left items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-vibe-purple/30 transition duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-vibe-purple/45 motion-reduce:transition-none motion-reduce:hover:scale-100";

const SettingsPage = () => {
  const { t } = useTranslation();
  return (
    <main>
      <p className={badgeClass}>{t("common.logo")}</p>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink drop-shadow-sm transition duration-300 ease-out hover:text-vibe-purple/90 sm:text-5xl lg:text-6xl">
        {t("settings.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-vibe-muted transition duration-300 hover:text-ink/80">
        {t("settings.lead")}
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className={cardClass} aria-labelledby="appearance-heading">
          <h2
            id="appearance-heading"
            className="text-lg font-bold tracking-tight text-ink transition duration-300 group-hover:text-vibe-purple"
          >
            {t("settings.appearance")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-vibe-muted transition duration-300 group-hover:text-ink/80">
            {t("settings.appearanceBody")}
          </p>
        </section>

        <section className={cardClass} aria-labelledby="notify-heading">
          <h2
            id="notify-heading"
            className="text-lg font-bold tracking-tight text-ink transition duration-300 group-hover:text-vibe-purple"
          >
            {t("settings.notifications")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-vibe-muted transition duration-300 group-hover:text-ink/80">
            {t("settings.notificationsBody")}
          </p>
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;

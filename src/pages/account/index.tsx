import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatDateRu, useAuth } from "@shared/lib";
import { pressableBase } from "@shared/ui";

const cardClass =
  "rounded-vibe border border-vibe-line bg-white/90 p-6 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-8";

const boardsCta = `${pressableBase} inline-flex items-center justify-center rounded-vibe bg-vibe-purple px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-vibe-purple/25 transition duration-200 hover:brightness-95`;

const AccountPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const displayName =
    currentUser?.username?.trim() ||
    currentUser?.full_name?.trim() ||
    currentUser?.email?.split("@")[0]?.trim() ||
    null;

  const welcomeLine = displayName
    ? t("account.welcomeNamed", { name: displayName })
    : t("account.welcome");

  const activeLabel =
    currentUser === null
      ? t("account.dash")
      : currentUser.is_active
        ? t("account.active")
        : t("account.inactive");

  return (
    <main>
      <p className="inline-flex items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
        {t("common.logo")}
      </p>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink drop-shadow-sm sm:text-5xl lg:text-6xl">
        {t("account.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg font-medium text-ink/90">{welcomeLine}</p>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-vibe-muted">{t("account.lead")}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className={cardClass} aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-lg font-bold tracking-tight text-ink">
            {t("account.profile")}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-vibe-muted">{t("common.email")}</dt>
              <dd className="mt-0.5 text-ink">{currentUser?.email ?? t("account.dash")}</dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("account.name")}</dt>
              <dd className="mt-0.5 text-ink">{currentUser?.full_name?.trim() || t("account.dash")}</dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("account.username")}</dt>
              <dd className="mt-0.5 text-ink">{currentUser?.username?.trim() || t("account.dash")}</dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("account.status")}</dt>
              <dd className="mt-0.5 text-ink">{activeLabel}</dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("account.registeredAt")}</dt>
              <dd className="mt-0.5 text-ink">
                {currentUser?.created_at ? formatDateRu(currentUser.created_at) : t("account.dash")}
              </dd>
            </div>
          </dl>
        </section>

        <section className={cardClass} aria-labelledby="next-heading">
          <h2 id="next-heading" className="text-lg font-bold tracking-tight text-ink">
            {t("account.nextTitle")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-vibe-muted">{t("account.nextBody")}</p>
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to="/boards" className={boardsCta}>
          {t("account.toBoards")}
        </Link>
        <p className="text-sm text-vibe-muted">{t("account.footerHint")}</p>
      </div>
    </main>
  );
};

export default AccountPage;

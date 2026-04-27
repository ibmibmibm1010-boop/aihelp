import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@shared/lib";
import { LanguageSwitcher, PageBackdrop } from "@shared/ui";

const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vibe-canvas text-vibe-muted">
        {t("common.loading")}
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/boards" replace />;
  }

  return (
    <PageBackdrop>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold uppercase tracking-wide text-vibe-purple drop-shadow-sm">
          {t("common.logo")}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <LanguageSwitcher />
          <Link
            to="/sign-in"
            className="rounded-vibe border border-vibe-line bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            {t("landing.signIn")}
          </Link>
          <Link
            to="/sign-up"
            className="rounded-vibe bg-vibe-purple px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-95"
          >
            {t("landing.signUp")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-12 lg:px-8 lg:pt-20">
        <p className="inline-flex items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
          {t("common.logo")}
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink drop-shadow-sm sm:text-5xl lg:text-6xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-vibe-muted">{t("landing.heroLead")}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/sign-up"
            className="inline-flex items-center justify-center rounded-vibe bg-vibe-purple px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-vibe-purple/25 transition hover:brightness-95"
          >
            {t("landing.ctaSignUp")}
          </Link>
          <Link
            to="/sign-in"
            className="inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/85 px-8 py-3.5 text-base font-semibold text-ink shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            {t("landing.ctaSignIn")}
          </Link>
        </div>
      </main>
    </PageBackdrop>
  );
};

export default LandingPage;

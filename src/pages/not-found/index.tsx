import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageBackdrop } from "@shared/ui";

const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <PageBackdrop>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-extrabold text-vibe-purple drop-shadow-sm sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">{t("notFound.title")}</h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-vibe-muted sm:text-lg">
          {t("notFound.body")}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-vibe bg-vibe-purple px-8 py-3.5 text-sm font-semibold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95"
        >
          {t("notFound.home")}
        </Link>
      </div>
    </PageBackdrop>
  );
};

export default NotFoundPage;

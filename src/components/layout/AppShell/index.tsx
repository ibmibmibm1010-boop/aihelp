import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AssistantProvider, useAuth } from "@shared/lib";
import { LanguageSwitcher, PageBackdrop, pressableBase } from "@shared/ui";
import { AiAssistantWidget } from "@widgets";

const shellAsideClass =
  "flex h-full min-h-0 flex-col rounded-vibe border border-vibe-line bg-white/90 p-4 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-5";

const sectionLabelClass =
  "px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wide text-vibe-muted first:pt-0";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `${pressableBase} flex rounded-vibe px-3 py-2.5 text-sm font-semibold ${
    isActive
      ? "bg-vibe-purple/10 text-vibe-purple shadow-sm"
      : "text-ink hover:bg-white"
  }`;

const footerLinkClass = `${pressableBase} flex rounded-vibe px-3 py-2.5 text-sm font-semibold text-ink hover:bg-white`;

const footerMutedBtn = `${pressableBase} flex w-full rounded-vibe border border-vibe-line bg-[#E2E8F0]/80 px-3 py-2.5 text-left text-sm font-semibold text-ink backdrop-blur-sm hover:bg-[#E2E8F0]`;

const navLinkCompactClass = ({ isActive }: { isActive: boolean }) =>
  `${pressableBase} flex h-11 w-11 shrink-0 items-center justify-center rounded-vibe text-base font-semibold ${
    isActive ? "bg-vibe-purple/10 text-vibe-purple shadow-sm" : "text-ink hover:bg-white"
  }`;

const footerLinkCompactClass = `${pressableBase} flex h-11 w-11 shrink-0 items-center justify-center rounded-vibe text-base font-semibold text-ink hover:bg-white`;

const footerMutedCompactBtn = `${pressableBase} flex h-11 w-11 shrink-0 items-center justify-center rounded-vibe border border-vibe-line bg-[#E2E8F0]/80 text-base font-semibold text-ink backdrop-blur-sm hover:bg-[#E2E8F0]`;

function useMinWidthLg() {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return matches;
}

function SidebarNavContent({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate("/", { replace: true });
  };

  if (compact) {
    return (
      <>
        <Link
          to="/boards"
          className={`${pressableBase} mb-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-vibe text-sm font-bold text-vibe-purple shadow-sm hover:opacity-90`}
          title={t("common.logo")}
          aria-label={t("common.logo")}
          onClick={onNavigate}
        >
          AI
        </Link>

        <nav
          className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto"
          aria-label={t("shell.navMain")}
        >
          <NavLink
            to="/boards"
            className={navLinkCompactClass}
            end
            title={t("shell.navBoards")}
            aria-label={t("shell.navBoards")}
            onClick={onNavigate}
          >
            <span aria-hidden>⊞</span>
          </NavLink>
          <NavLink
            to="/account"
            className={navLinkCompactClass}
            title={t("shell.account")}
            aria-label={t("shell.account")}
            onClick={onNavigate}
          >
            <span aria-hidden>◎</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={navLinkCompactClass}
            title={t("shell.settings")}
            aria-label={t("shell.settings")}
            onClick={onNavigate}
          >
            <span aria-hidden>⚙</span>
          </NavLink>
        </nav>

        <div className="mt-2 flex flex-col items-center gap-1 border-t border-vibe-line pt-2">
          <Link
            to="/"
            className={footerLinkCompactClass}
            title={t("shell.toSite")}
            aria-label={t("shell.toSite")}
            onClick={onNavigate}
          >
            <span aria-hidden>⌂</span>
          </Link>
          <button
            type="button"
            className={footerMutedCompactBtn}
            title={t("shell.logout")}
            aria-label={t("shell.logout")}
            onClick={() => void handleLogout()}
          >
            <span aria-hidden>⎋</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Link
        to="/boards"
        className={`${pressableBase} mb-4 inline-flex text-sm font-semibold uppercase tracking-wide text-vibe-purple drop-shadow-sm hover:opacity-90`}
        onClick={onNavigate}
      >
        {t("common.logo")}
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label={t("shell.navMain")}>
        <div>
          <p className={sectionLabelClass}>{t("shell.workspace")}</p>
          <ul className="space-y-1">
            <li>
              <NavLink to="/boards" className={navLinkClass} end onClick={onNavigate}>
                {t("shell.navBoards")}
              </NavLink>
            </li>
          </ul>
        </div>
        <div>
          <p className={sectionLabelClass}>{t("shell.accountSection")}</p>
          <ul className="space-y-1">
            <li>
              <NavLink to="/account" className={navLinkClass} onClick={onNavigate}>
                {t("shell.account")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={navLinkClass} onClick={onNavigate}>
                {t("shell.settings")}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      <div className="mt-4 space-y-1 border-t border-vibe-line pt-4">
        <Link to="/" className={footerLinkClass} onClick={onNavigate}>
          {t("shell.toSite")}
        </Link>
        <button type="button" className={footerMutedBtn} onClick={() => void handleLogout()}>
          {t("shell.logout")}
        </button>
      </div>
    </>
  );
}

function AppShellLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isBoardWorkspace = /^\/boards\/[^/]+$/.test(location.pathname);
  const minLg = useMinWidthLg();
  const sidebarCompact = isBoardWorkspace && minLg;
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerId = useId();
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <PageBackdrop>
      <div className="flex min-h-screen flex-col lg:flex-row lg:gap-3">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-vibe-line bg-white/85 px-3 py-3 backdrop-blur-md lg:hidden">
          <Link
            to="/boards"
            className={`${pressableBase} min-w-0 shrink truncate text-sm font-semibold uppercase tracking-wide text-vibe-purple drop-shadow-sm`}
          >
            {t("common.logo")}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              className={`${pressableBase} rounded-vibe border border-vibe-line bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur-sm hover:bg-white`}
              aria-expanded={mobileOpen}
              aria-controls={drawerId}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {t("common.menu")}
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            aria-label={t("common.closeMenu")}
            onClick={closeMobile}
          />
        ) : null}

        <aside
          id={drawerId}
          className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,100vw-2rem)] transform transition-transform duration-200 ease-out lg:static lg:z-0 lg:flex lg:shrink-0 lg:translate-x-0 lg:transform-none ${
            /* w-16 + lg:m-4 сжимали внутрь ~32px — иконки 44px вылезали на заголовок доски */
            sidebarCompact ? "lg:w-20" : "lg:w-64"
          } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div
            className={`${shellAsideClass} m-0 h-full rounded-none border-y-0 border-l-0 lg:min-h-[calc(100vh-2rem)] lg:rounded-vibe lg:border ${
              /* Совпадает с lg:py-1 у колонки доски — одна линия по верху с шапкой whiteboard */
              sidebarCompact ? "lg:mx-1 lg:mt-1 lg:mb-4 lg:items-center lg:p-2" : "lg:m-4"
            }`}
          >
            <SidebarNavContent compact={sidebarCompact} onNavigate={closeMobile} />
          </div>
        </aside>

        <div
          className={`flex min-h-0 flex-1 flex-col ${isBoardWorkspace ? "lg:py-1 lg:pr-2" : "lg:py-4 lg:pr-6"}`}
        >
          <div
            className={`mx-auto flex w-full min-h-0 flex-1 flex-col ${isBoardWorkspace ? "max-w-none px-0 pb-0 pt-0" : "max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pt-2"}`}
          >
            {!isBoardWorkspace ? (
              <div className="mb-3 hidden justify-end lg:flex">
                <LanguageSwitcher />
              </div>
            ) : null}
            <Outlet />
          </div>
        </div>
      </div>
    </PageBackdrop>
  );
}

export function AppShell() {
  return (
    <AssistantProvider>
      <AppShellLayout />
      <AiAssistantWidget />
    </AssistantProvider>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { BoardParticipant } from "@shared/api";
import { useAssistant } from "@shared/lib";
import { LanguageSwitcher, pressableBase } from "@shared/ui";

const topBarBtn = `${pressableBase} inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-vibe-purple/30 hover:text-ink`;

const toolBtn = (active: boolean) =>
  `${pressableBase} flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm ${
    active
      ? "border-vibe-purple/50 bg-vibe-purple/10 text-vibe-purple"
      : "border-slate-200/90 bg-white text-slate-600 hover:border-vibe-purple/25 hover:text-ink"
  }`;

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type BoardWhiteboardShellProps = {
  boardName: string;
  boardDescription?: string | null;
  participants: BoardParticipant[];
  backTo: string;
  showDelete?: boolean;
  onDeleteBoard?: () => void;
  errorBanner?: string | null;
  /** Управляемый поиск по задачам (если не передан — поле только для вида, read-only). */
  taskSearch?: { value: string; onChange: (value: string) => void };
  children: ReactNode;
};

export function BoardWhiteboardShell({
  boardName,
  boardDescription,
  participants,
  backTo,
  showDelete,
  onDeleteBoard,
  errorBanner,
  taskSearch,
  children,
}: BoardWhiteboardShellProps) {
  const { t } = useTranslation();
  const { openAssistant, setFabHidden } = useAssistant();
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "frame" | "text" | "note" | "shape" | "line" | "pen">(
    "select",
  );

  useEffect(() => {
    setFabHidden(true);
    return () => setFabHidden(false);
  }, [setFabHidden]);

  const showShareFeedback = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const avatarPeople = participants.slice(0, 5);
  const extra = participants.length - avatarPeople.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0">
      <header className="flex shrink-0 flex-col gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            to={backTo}
            className={`${topBarBtn}`}
            title={t("boardWorkspace.back")}
            aria-label={t("boardWorkspace.back")}
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </Link>
          <Link
            to={backTo}
            className={`${pressableBase} truncate text-sm font-bold tracking-tight text-ink sm:text-base lg:hidden`}
          >
            {t("common.logo")}
          </Link>
          <div
            className={`min-w-0 flex-1 items-center gap-2 ${taskSearch ? "flex" : "hidden md:flex"}`}
          >
            <span className="text-slate-400" aria-hidden>
              ⌕
            </span>
            <div className="relative flex min-w-0 max-w-md flex-1 items-center">
              <input
                type="search"
                readOnly={!taskSearch}
                value={taskSearch?.value ?? ""}
                onChange={taskSearch ? (e) => taskSearch.onChange(e.target.value) : undefined}
                className={`h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-1 pl-3 text-sm text-ink outline-none placeholder:text-slate-500 focus:border-vibe-purple/50 focus:ring-2 focus:ring-vibe-purple/20 ${taskSearch ? "pr-9" : "pr-3"} ${taskSearch ? "" : "cursor-default text-slate-500"}`}
                placeholder={t("boardWorkspace.searchPlaceholder")}
                aria-label={t("boardWorkspace.searchPlaceholder")}
              />
              {taskSearch && taskSearch.value ? (
                <button
                  type="button"
                  className={`${pressableBase} absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-ink`}
                  onClick={() => taskSearch.onChange("")}
                  aria-label={t("boardWorkspace.clearSearch")}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ×
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2">
          <button
            type="button"
            className={`${pressableBase} inline-flex items-center gap-2 rounded-xl border border-vibe-purple/40 bg-gradient-to-r from-fuchsia-500/15 via-vibe-purple/15 to-indigo-500/15 px-3 py-2 text-xs font-bold text-vibe-purple shadow-sm sm:text-sm`}
            onClick={() => openAssistant()}
          >
            <span className="text-base leading-none" aria-hidden>
              ✨
            </span>
            {t("boardWorkspace.aiAssistant")}
          </button>
          <div className="hidden items-center gap-1 sm:flex">
            <button type="button" className={`${topBarBtn} opacity-40`} disabled title={t("boardWorkspace.undo")}>
              ↶
            </button>
            <button type="button" className={`${topBarBtn} opacity-40`} disabled title={t("boardWorkspace.redo")}>
              ↷
            </button>
            <button type="button" className={topBarBtn} title={t("boardWorkspace.hand")}>
              ✋
            </button>
          </div>
          <div className="flex items-center gap-1">
            {avatarPeople.map((p) => (
              <span
                key={p.userId}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-vibe-purple/80 to-indigo-500/80 text-[10px] font-bold text-white shadow-sm"
                title={p.label}
              >
                {initialsFromLabel(p.label)}
              </span>
            ))}
            {extra > 0 ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-600">
                +{extra}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className={`${pressableBase} rounded-xl bg-vibe-purple px-3 py-2 text-xs font-bold text-white shadow-md shadow-vibe-purple/25 hover:brightness-95 sm:text-sm`}
            onClick={showShareFeedback}
          >
            {copied ? t("boardWorkspace.copied") : t("boardWorkspace.share")}
          </button>
          <button type="button" className={topBarBtn} title={t("boardWorkspace.help")}>
            ?
          </button>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="relative isolate min-h-0 flex flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 overflow-auto rounded-2xl bg-[#e8eaef] ring-1 ring-slate-300/40 lg:rounded-2xl"
          style={{
            backgroundImage: "radial-gradient(circle, #b8c0cc 1px, transparent 1px)",
            backgroundSize: `${Math.max(12, Math.round(20 * (100 / zoom)))}px ${Math.max(12, Math.round(20 * (100 / zoom)))}px`,
          }}
        >
          <div className="min-h-full min-h-[60vh] space-y-2 px-4 py-4 pl-[3.25rem] sm:px-6 sm:py-6 sm:pl-[3.75rem] lg:px-8 lg:py-8 lg:pl-[4.25rem]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{boardName}</h1>
                {boardDescription ? (
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">{boardDescription}</p>
                ) : null}
              </div>
              {showDelete && onDeleteBoard ? (
                <button
                  type="button"
                  className={`${pressableBase} shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50`}
                  onClick={onDeleteBoard}
                >
                  {t("boards.detail.deleteBoard")}
                </button>
              ) : null}
            </div>
            {errorBanner ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{errorBanner}</p>
            ) : null}
            {children}
          </div>
        </div>

        <aside
          className="pointer-events-none absolute left-2 top-1/2 z-40 hidden max-h-[calc(100vh-10rem)] -translate-y-1/2 flex-col gap-1.5 overflow-y-auto overflow-x-hidden overscroll-contain lg:pointer-events-auto lg:flex"
          aria-label={t("boardWorkspace.toolsLabel")}
        >
          <button
            type="button"
            className={`${toolBtn(activeTool === "select")} pointer-events-auto`}
            title={t("boardWorkspace.tool.select")}
            onClick={() => setActiveTool("select")}
          >
            ↖
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "frame")} pointer-events-auto opacity-80`}
            title={t("boardWorkspace.tool.frame")}
            onClick={() => setActiveTool("frame")}
          >
            ▢
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "text")} pointer-events-auto text-xs opacity-80`}
            title={t("boardWorkspace.tool.text")}
            onClick={() => setActiveTool("text")}
          >
            T
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "note")} pointer-events-auto text-xs opacity-80`}
            title={t("boardWorkspace.tool.note")}
            onClick={() => setActiveTool("note")}
          >
            🗒
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "shape")} pointer-events-auto opacity-80`}
            title={t("boardWorkspace.tool.shape")}
            onClick={() => setActiveTool("shape")}
          >
            ◇
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "line")} pointer-events-auto text-xs opacity-80`}
            title={t("boardWorkspace.tool.line")}
            onClick={() => setActiveTool("line")}
          >
            ╱
          </button>
          <button
            type="button"
            className={`${toolBtn(activeTool === "pen")} pointer-events-auto opacity-80`}
            title={t("boardWorkspace.tool.pen")}
            onClick={() => setActiveTool("pen")}
          >
            ✎
          </button>
          <button type="button" className={`${toolBtn(false)} pointer-events-auto opacity-70`} title={t("boardWorkspace.tool.more")}>
            ···
          </button>
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur-sm sm:bottom-8 sm:right-8">
        <button
          type="button"
          className={`${pressableBase} rounded-lg px-2 py-1 hover:bg-slate-100`}
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          aria-label={t("boardWorkspace.zoomOut")}
        >
          −
        </button>
        <span className="min-w-[3rem] text-center tabular-nums">{zoom}%</span>
        <button
          type="button"
          className={`${pressableBase} rounded-lg px-2 py-1 hover:bg-slate-100`}
          onClick={() => setZoom((z) => Math.min(150, z + 10))}
          aria-label={t("boardWorkspace.zoomIn")}
        >
          +
        </button>
      </div>
    </div>
  );
}

import { pressableBase } from "@shared/ui";

export const cardClass =
  "rounded-vibe border border-vibe-line bg-white/90 p-4 shadow-md shadow-vibe-purple/10 backdrop-blur-sm";

/** Холст канбана в стиле страницы (светлая тема). */
export const kanbanCanvasClass =
  "mt-8 rounded-kanban-col border border-vibe-line/80 bg-vibe-canvas/60 p-6 shadow-sm shadow-vibe-purple/5 backdrop-blur-sm";

/** Канбан на «белой доске»: без лишней рамки — контент на точечной сетке. */
export const kanbanCanvasWhiteboardClass =
  "mt-2 border-0 bg-transparent p-0 shadow-none";

export const kanbanSectionHeadingClass = "text-lg font-bold tracking-tight text-ink";

export const kanbanSectionToolbarClass = "flex flex-wrap items-center justify-between gap-3";

/** Полоса под колонками внутри секции. */
export const kanbanSectionStripClass =
  "flex flex-wrap items-stretch gap-4 rounded-kanban-col border border-dashed border-vibe-line/90 bg-white/50 p-4";

export const kanbanAddColumnBtnClass = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-vibe-purple/40 hover:bg-white hover:shadow-md`;

/** Оболочка колонки — как карточки приложения. */
export const kanbanColumnShellClass =
  "rounded-kanban-col border border-vibe-line bg-white/90 shadow-md shadow-vibe-purple/10 backdrop-blur-sm";

export const kanbanColumnInnerClass = "flex flex-1 flex-col min-h-0 px-4 pb-4 pt-3";

/** Hover колонки на светлом канбане. */
export const kanbanColumnHoverClass =
  "transition duration-300 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-md hover:-translate-y-1 hover:border-vibe-purple/35 hover:bg-white hover:shadow-xl hover:shadow-vibe-purple/20";

export const kanbanColumnAccentClass = "h-1.5 w-full shrink-0 rounded-t-kanban-col";

export const kanbanTaskCardClass =
  "rounded-kanban-card border border-vibe-line bg-white/95 p-3 shadow-sm motion-safe:animate-kanban-card-in motion-reduce:animate-none transition duration-200 ease-out hover:-translate-y-0.5 hover:border-vibe-purple/25 hover:shadow-md hover:shadow-vibe-purple/10";

export const kanbanTaskCardDragPlaceholderClass =
  "min-h-[4rem] rounded-kanban-card border-2 border-dashed border-vibe-purple/35 bg-vibe-canvas/40";

export const kanbanGhostAddCardClass = `${pressableBase} mt-3 flex w-full items-center justify-center gap-2 rounded-kanban-card border-2 border-dashed border-vibe-line bg-vibe-canvas/40 py-2.5 text-sm font-semibold text-vibe-muted transition hover:border-vibe-purple/40 hover:bg-white/80 hover:text-ink`;

export const kanbanColumnFooterRowClass = "mt-3 flex flex-wrap items-center gap-2";

export const kanbanColumnFooterEditClass = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-vibe-purple/35 hover:bg-white`;

/** Селект задачи на карточке. */
export const kanbanSelectClass =
  "max-w-full flex-1 min-w-[7rem] rounded-vibe border border-vibe-line bg-white px-2 py-1.5 text-xs text-ink shadow-sm outline-none transition focus:border-vibe-purple focus:ring-2 focus:ring-vibe-purple/25";

export const kanbanTaskEditLinkClass = `${pressableBase} shrink-0 text-xs font-medium text-vibe-muted hover:text-ink`;

export const kanbanDangerOutlineBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-red-300 bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50`;

export const kanbanAvatarCircleClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-vibe-line bg-vibe-canvas text-[10px] font-bold uppercase tracking-tight text-ink";

/** Кнопка конца секции (drop zone). */
export const kanbanSectionEndBtnClass = `${pressableBase} flex min-h-[120px] min-w-[48px] shrink-0 items-center justify-center rounded-kanban-col border-2 border-dashed border-vibe-line/90 bg-white/40 px-3 text-xs font-semibold text-vibe-muted transition hover:border-vibe-purple/45 hover:bg-vibe-purple/5 hover:text-ink`;

export const inputClass =
  "w-full rounded-vibe border border-vibe-line bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-vibe-purple focus:ring-2 focus:ring-vibe-purple/25";

export const primaryBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe bg-vibe-purple px-4 py-2 text-sm font-semibold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60`;

export const secondaryBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-white`;

export const ghostBtn = `${pressableBase} text-xs font-semibold text-vibe-muted hover:text-red-700`;

export const iconBtn = `${pressableBase} inline-flex shrink-0 items-center justify-center rounded-vibe border border-vibe-line bg-white/90 p-1.5 text-vibe-muted shadow-sm hover:bg-white hover:text-ink`;

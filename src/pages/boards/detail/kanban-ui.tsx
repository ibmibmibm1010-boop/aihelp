import type { PointerEvent, ReactNode } from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";

import type { BoardColumnSection, BoardParticipant, Task } from "@shared/api";

import {
  kanbanAvatarCircleClass,
  kanbanColumnAccentClass,
  kanbanColumnFooterEditClass,
  kanbanColumnFooterRowClass,
  kanbanColumnHoverClass,
  kanbanColumnInnerClass,
  kanbanColumnShellClass,
  kanbanDangerOutlineBtn,
  kanbanGhostAddCardClass,
  kanbanSelectClass,
  kanbanTaskCardClass,
  kanbanTaskCardDragPlaceholderClass,
  kanbanTaskEditLinkClass,
} from "./board-detail-styles";
import { sectionEndDropId, taskColumnDropId, taskColumnEndDropId } from "./constants";
import type { KanbanColumn } from "./types";

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ATTACHMENT_THUMB_LIMIT = 3;

function TaskCardAttachments({ urls, overlay }: { urls: string[]; overlay?: boolean }) {
  if (!urls.length) return null;
  const shown = urls.slice(0, ATTACHMENT_THUMB_LIMIT);
  const more = urls.length - ATTACHMENT_THUMB_LIMIT;
  return (
    <div
      className={`mt-2 flex flex-wrap items-center gap-1.5 ${overlay ? "pointer-events-none" : ""}`}
    >
      {shown.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block shrink-0 rounded border border-vibe-line focus:outline-none focus:ring-2 focus:ring-vibe-purple/30"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <img src={url} alt="" className="h-12 w-12 rounded object-cover" loading="lazy" />
        </a>
      ))}
      {more > 0 ? <span className="text-xs font-medium text-vibe-muted">+{more}</span> : null}
    </div>
  );
}

export type KanbanColumnCardBodyProps = {
  col: KanbanColumn;
  colIndex: number;
  orderedTaskIds: string[];
  taskById: Map<string, Task>;
  boardParticipants: BoardParticipant[];
  columns: KanbanColumn[];
  resolveColumnId: (task: Task) => string;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  onAddTask: () => void;
  onTaskMoveToColumn: (task: Task, newColumnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  setColumnActivatorNodeRef: (el: HTMLElement | null) => void;
  columnHandleListeners?: ReturnType<typeof useSortable>["listeners"];
  /** В миниатюре DragOverlay отключаем взаимодействия. */
  overlay?: boolean;
};

function TaskColumnDropZone({
  columnId,
  className,
  children,
}: {
  columnId: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: taskColumnDropId(columnId) });
  return (
    <div
      ref={setNodeRef}
      className={className ?? "flex min-h-[2rem] flex-1 flex-col gap-2"}
    >
      {children}
    </div>
  );
}

function TaskColumnEndStripe({ columnId }: { columnId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: taskColumnEndDropId(columnId) });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[10px] shrink-0 rounded-md ${isOver ? "bg-vibe-purple/35" : "bg-transparent"}`}
      aria-hidden
    />
  );
}

type SortableTaskCardProps = {
  task: Task;
  col: KanbanColumn;
  colIndex: number;
  taskIndex: number;
  boardParticipants: BoardParticipant[];
  columns: KanbanColumn[];
  resolveColumnId: (task: Task) => string;
  onTaskMoveToColumn: (task: Task, newColumnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  overlay?: boolean;
};

function SortableTaskCard({
  task,
  col,
  colIndex,
  taskIndex,
  boardParticipants,
  columns,
  resolveColumnId,
  onTaskMoveToColumn,
  onDeleteTask,
  onEditTask,
  overlay = false,
}: SortableTaskCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { kind: "task" as const, columnId: col.id },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blockInner = overlay
    ? undefined
    : (e: PointerEvent) => {
        e.stopPropagation();
      };

  const assigneeLabel = task.assignee_user_id
    ? boardParticipants.find((p) => p.userId === task.assignee_user_id)?.label ??
      t("boards.detail.task.memberFallback")
    : null;

  const leftAccent = task.card_color ?? col.color;

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        animationDelay: `${colIndex * 60 + 40 + taskIndex * 50}ms`,
        borderLeftWidth: "3px",
        borderLeftColor: leftAccent,
        borderLeftStyle: "solid",
      }}
      className={`${kanbanTaskCardClass} ${isDragging ? "z-10" : ""}`}
      {...attributes}
    >
      {isDragging ? (
        <div className={kanbanTaskCardDragPlaceholderClass} aria-hidden />
      ) : (
        <div className="flex gap-2">
          <span
            ref={setActivatorNodeRef}
            {...listeners}
            className="cursor-grab select-none text-vibe-muted"
            title={t("boards.detail.task.dragCard")}
            aria-hidden
          >
            ⠿
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ink">{task.title}</p>
              <button
                type="button"
                className={kanbanTaskEditLinkClass}
                onClick={() => onEditTask(task)}
                disabled={overlay}
              >
                {t("boards.detail.task.edit")}
              </button>
            </div>
            {task.description ? (
              <p className="mt-1 text-xs leading-relaxed text-vibe-muted">{task.description}</p>
            ) : null}
            <TaskCardAttachments urls={task.attachment_urls} overlay={overlay} />
            <div
              className={`mt-2 flex flex-wrap items-center justify-between gap-2 ${overlay ? "pointer-events-none" : ""}`}
              onPointerDown={blockInner}
            >
              <div className="flex min-h-[1.75rem] items-center gap-1.5">
                {assigneeLabel ? (
                  <span className={kanbanAvatarCircleClass} title={assigneeLabel}>
                    {initialsFromLabel(assigneeLabel)}
                  </span>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                <label className="sr-only" htmlFor={`colsel-${task.id}`}>
                  {t("boards.detail.task.columnSelect")}
                </label>
                <select
                  id={`colsel-${task.id}`}
                  className={kanbanSelectClass}
                  value={resolveColumnId(task)}
                  onChange={(e) => onTaskMoveToColumn(task, e.target.value)}
                  disabled={overlay}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-ink">
                      {c.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={kanbanDangerOutlineBtn}
                  onClick={() => onDeleteTask(task.id)}
                  disabled={overlay}
                >
                  {t("boards.detail.task.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function KanbanColumnCardBody({
  col,
  colIndex,
  orderedTaskIds,
  taskById,
  boardParticipants,
  columns,
  resolveColumnId,
  onEditColumn,
  onDeleteColumn,
  onAddTask,
  onTaskMoveToColumn,
  onDeleteTask,
  onEditTask,
  setColumnActivatorNodeRef,
  columnHandleListeners,
  overlay = false,
}: KanbanColumnCardBodyProps) {
  const { t } = useTranslation();
  const blockInnerDrag = overlay
    ? undefined
    : (e: PointerEvent) => {
        e.stopPropagation();
      };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <h2
          id={`col-h-${col.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-ink"
        >
          <span
            ref={setColumnActivatorNodeRef}
            {...(columnHandleListeners ?? {})}
            className="cursor-grab select-none text-vibe-muted"
            title={t("boards.detail.task.dragColumn")}
            aria-hidden
          >
            ⠿
          </span>
          <span className="min-w-0 truncate align-middle">{col.title}</span>
        </h2>
      </div>
      <TaskColumnDropZone columnId={col.id} className="flex min-h-0 flex-1 flex-col gap-2">
        <SortableContext items={orderedTaskIds} strategy={verticalListSortingStrategy}>
          <ul className={`flex min-h-0 flex-1 flex-col gap-2 ${overlay ? "pointer-events-none" : ""}`}>
            {orderedTaskIds.map((taskId, taskIndex) => {
              const task = taskById.get(taskId);
              if (!task) return null;
              return (
                <SortableTaskCard
                  key={taskId}
                  task={task}
                  col={col}
                  colIndex={colIndex}
                  taskIndex={taskIndex}
                  boardParticipants={boardParticipants}
                  columns={columns}
                  resolveColumnId={resolveColumnId}
                  onTaskMoveToColumn={onTaskMoveToColumn}
                  onDeleteTask={onDeleteTask}
                  onEditTask={onEditTask}
                  overlay={overlay}
                />
              );
            })}
          </ul>
        </SortableContext>
        {overlay ? null : <TaskColumnEndStripe columnId={col.id} />}
      </TaskColumnDropZone>
      <div className="shrink-0">
        <button
          type="button"
          className={kanbanGhostAddCardClass}
          onClick={onAddTask}
          disabled={overlay}
        >
          <span className="text-lg font-light leading-none text-vibe-muted" aria-hidden>
            +
          </span>
          {t("boards.detail.task.addCard")}
        </button>
        <div
          className={`${kanbanColumnFooterRowClass} ${overlay ? "pointer-events-none" : ""}`}
          onPointerDown={blockInnerDrag}
        >
          <button type="button" className={kanbanColumnFooterEditClass} onClick={onEditColumn}>
            {t("boards.detail.task.edit")}
          </button>
          <button
            type="button"
            className={kanbanDangerOutlineBtn}
            onClick={onDeleteColumn}
            disabled={overlay}
            aria-label={t("boards.detail.task.deleteColumnAria", { title: col.title })}
          >
            {t("boards.detail.deleteColumn")}
          </button>
        </div>
      </div>
    </div>
  );
}

type SortableKanbanColumnProps = Omit<
  KanbanColumnCardBodyProps,
  "setColumnActivatorNodeRef" | "columnHandleListeners"
>;

export function SortableKanbanColumn(props: SortableKanbanColumnProps) {
  const { col, colIndex } = props;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: col.id,
      data: { kind: "column" as const },
      transition: {
        duration: 220,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${colIndex * 60}ms`,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`${kanbanColumnShellClass} ${kanbanColumnHoverClass} flex min-h-[min(520px,60vh)] w-72 max-w-[min(100%,20rem)] flex-none flex-col overflow-hidden motion-safe:animate-kanban-col-in motion-reduce:animate-none ${
        isDragging ? "pointer-events-none" : ""
      }`}
      {...attributes}
      aria-labelledby={`col-h-${col.id}`}
    >
      <div
        className={kanbanColumnAccentClass}
        style={{ backgroundColor: col.color }}
        aria-hidden
      />
      <div className={kanbanColumnInnerClass}>
        <KanbanColumnCardBody
          {...props}
          setColumnActivatorNodeRef={setActivatorNodeRef}
          columnHandleListeners={listeners}
        />
      </div>
    </section>
  );
}

/** Превью карточки в DragOverlay (те же стили, что у SortableTaskCard). */
export function KanbanTaskDragOverlayCard({
  task,
  boardParticipants,
  columnColorFallback,
}: {
  task: Task;
  boardParticipants: BoardParticipant[];
  /** Цвет левой полоски, если у задачи нет card_color. */
  columnColorFallback: string;
}) {
  const { t } = useTranslation();
  const assigneeLabel = task.assignee_user_id
    ? boardParticipants.find((p) => p.userId === task.assignee_user_id)?.label ??
      t("boards.detail.task.memberFallback")
    : null;
  const leftAccent = task.card_color ?? columnColorFallback;

  return (
    <div
      className={`origin-top-left max-w-xs ${kanbanTaskCardClass} shadow-[0_18px_48px_rgba(15,23,42,0.12)]`}
      style={{
        transform: "scale(0.95)",
        borderLeftWidth: "3px",
        borderLeftColor: leftAccent,
        borderLeftStyle: "solid",
      }}
    >
      <div className="flex gap-2">
        <span className="select-none text-vibe-muted opacity-60" aria-hidden>
          ⠿
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{task.title}</p>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-vibe-muted">{task.description}</p>
          ) : null}
          <TaskCardAttachments urls={task.attachment_urls} overlay />
          {assigneeLabel ? (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={kanbanAvatarCircleClass}>{initialsFromLabel(assigneeLabel)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SectionEndDropZone({
  sec,
  label,
  pressableClass,
}: {
  sec: BoardColumnSection;
  label: string;
  pressableClass: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: sectionEndDropId(sec) });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`${pressableClass} ${
        isOver ? "border-vibe-purple/55 bg-vibe-purple/10 text-ink" : ""
      }`}
    >
      {label}
    </button>
  );
}


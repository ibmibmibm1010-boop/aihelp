import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type CollisionDetection,
  type DragStartEvent,
  PointerSensor,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";

import {
  BOARD_COLUMN_SECTION_ORDER,
  createBoardColumn,
  deleteBoard,
  deleteBoardColumn,
  deleteTask,
  fetchBoardById,
  fetchBoardColumns,
  fetchBoardParticipants,
  fetchTasks,
  type Board,
  type BoardColumnSection,
  type BoardParticipant,
  type Task,
  updateBoardColumn,
  updateTask,
  type UpdateTaskInput,
} from "@shared/api";
import { filterTaskIdsByQuery, normalizeSearchQuery, useAuth } from "@shared/lib";
import { pressableBase } from "@shared/ui";
import { BoardWhiteboardShell } from "@widgets";

import { boardPageErrorMessage } from "./detail/board-detail-errors";
import { ColumnFormModal, CreateTaskModal, EditTaskModal } from "./detail/board-detail-modals";
import {
  cardClass,
  kanbanAddColumnBtnClass,
  kanbanCanvasWhiteboardClass,
  kanbanColumnAccentClass,
  kanbanColumnInnerClass,
  kanbanColumnShellClass,
  kanbanSectionEndBtnClass,
  kanbanSectionHeadingClass,
  kanbanSectionStripClass,
  kanbanSectionToolbarClass,
} from "./detail/board-detail-styles";
import {
  KanbanColumnCardBody,
  KanbanTaskDragOverlayCard,
  SectionEndDropZone,
  SortableKanbanColumn,
} from "./detail/kanban-ui";
import { LOCAL_TASKS_ONLY, SECTION_END_PREFIX, TASK_COL_END_PREFIX, TASK_COL_PREFIX } from "./detail/constants";
import {
  applyTaskOrderToState,
  boardColumnToKanban,
  buildKanbanFromItemOrder,
  buildLocalTask,
  deriveColumnIdsBySection,
  deriveTaskIdsByColumn,
  finalizeSortOrders,
  findColumnContainer,
  findTaskColumnFromOverId,
} from "./detail/kanban-logic";
import type { KanbanColumn } from "./detail/types";
import { DeleteBoardDialog } from "./DeleteBoardDialog";
import { DeleteColumnDialog } from "./DeleteColumnDialog";

const BoardDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [createForColumnId, setCreateForColumnId] = useState<string | null>(null);
  const [columnModal, setColumnModal] = useState<
    null | { mode: "add"; section: BoardColumnSection } | { mode: "edit"; columnId: string }
  >(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dragColumnItems, setDragColumnItems] = useState<Record<BoardColumnSection, string[]> | null>(
    null,
  );
  const [dragTaskByColumn, setDragTaskByColumn] = useState<Record<string, string[]> | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [boardParticipants, setBoardParticipants] = useState<BoardParticipant[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [columnDelete, setColumnDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [columnDeleteBusy, setColumnDeleteBusy] = useState(false);
  const [columnDeleteError, setColumnDeleteError] = useState<string | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainerRef = useRef(false);

  const columnIdsBySection = useMemo(() => deriveColumnIdsBySection(columns), [columns]);
  const displayColumnIds = dragColumnItems ?? columnIdsBySection;
  const dragItemsRef = useRef(displayColumnIds);
  dragItemsRef.current = displayColumnIds;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");
      if (overId != null) {
        lastOverIdRef.current = overId;
        return [{ id: overId }];
      }
      if (recentlyMovedToNewContainerRef.current && (activeColumnId || activeTaskId)) {
        const fallback = lastOverIdRef.current ?? activeColumnId ?? activeTaskId;
        if (fallback != null) return [{ id: fallback }];
      }
      return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
    },
    [activeColumnId, activeTaskId],
  );

  const createTitleId = useId();
  const deleteTitleId = useId();
  const deleteColumnTitleId = useId();
  const editTaskTitleId = useId();
  const columnFormTitleId = useId();

  const load = useCallback(async () => {
    if (!boardId) {
      setError(t("boards.detail.notSpecified"));
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const b = await fetchBoardById(boardId);
      if (!b) {
        setBoard(null);
        setTasks([]);
        setColumns([]);
        setBoardParticipants([]);
        setError(t("boards.detail.boardMissing"));
        return;
      }
      const [rawCols, participants, fetchedTasks] = await Promise.all([
        fetchBoardColumns(boardId),
        fetchBoardParticipants(boardId).catch(() => [] as BoardParticipant[]),
        LOCAL_TASKS_ONLY ? Promise.resolve([] as Task[]) : fetchTasks(boardId),
      ]);
      setBoard(b);
      setBoardParticipants(participants);
      setTasks(fetchedTasks);
      setColumns(rawCols.map(boardColumnToKanban));
    } catch (e) {
      setError(boardPageErrorMessage(e));
      setBoard(null);
      setTasks([]);
      setColumns([]);
      setBoardParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [boardId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteBusy) setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen, deleteBusy]);

  useEffect(() => {
    if (!columnDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !columnDeleteBusy) setColumnDelete(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [columnDelete, columnDeleteBusy]);

  const handleColumnDeleteConfirm = useCallback(async () => {
    if (!columnDelete) return;
    const { id: columnId } = columnDelete;
    setColumnDeleteError(null);
    setColumnDeleteBusy(true);
    setDragColumnItems(null);
    setDragTaskByColumn(null);
    try {
      if (LOCAL_TASKS_ONLY) {
        setColumns((prev) => prev.filter((c) => c.id !== columnId));
        setTasks((prev) =>
          prev.map((t) => (t.column_id === columnId ? { ...t, column_id: null } : t)),
        );
        setCreateForColumnId((prev) => (prev === columnId ? null : prev));
        setColumnModal((m) => (m?.mode === "edit" && m.columnId === columnId ? null : m));
        setColumnDelete(null);
        return;
      }
      await deleteBoardColumn(columnId);
      setCreateForColumnId((prev) => (prev === columnId ? null : prev));
      setColumnModal((m) => (m?.mode === "edit" && m.columnId === columnId ? null : m));
      setColumnDelete(null);
      await load();
    } catch (e) {
      setColumnDeleteError(boardPageErrorMessage(e));
      void load();
    } finally {
      setColumnDeleteBusy(false);
    }
  }, [columnDelete, load]);

  const handleDeleteBoard = useCallback(async () => {
    if (!boardId) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await deleteBoard(boardId);
      navigate("/boards", { replace: true });
    } catch (e) {
      setDeleteError(boardPageErrorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  }, [boardId, navigate]);

  const isBoardOwner =
    board != null && currentUser != null && board.user_id === currentUser.id;

  const resolveColumnId = useCallback(
    (task: Task): string => {
      if (task.column_id && columns.some((c) => c.id === task.column_id)) {
        return task.column_id;
      }
      return columns.find((c) => c.linkedStatus === task.status)?.id ?? columns[0]?.id ?? "";
    },
    [columns],
  );

  const taskIdsByColumn = useMemo(
    () => deriveTaskIdsByColumn(tasks, columns, resolveColumnId),
    [tasks, columns, resolveColumnId],
  );
  const displayTaskIdsByColumn = dragTaskByColumn ?? taskIdsByColumn;
  const dragTaskItemsRef = useRef(displayTaskIdsByColumn);
  dragTaskItemsRef.current = displayTaskIdsByColumn;

  const matchingTaskIds = useMemo(
    () => filterTaskIdsByQuery(tasks, taskSearchQuery),
    [tasks, taskSearchQuery],
  );

  const visibleTaskIdsByColumn = useMemo(() => {
    const base = displayTaskIdsByColumn;
    if (!normalizeSearchQuery(taskSearchQuery)) return base;
    const allow = matchingTaskIds;
    const out: Record<string, string[]> = {};
    for (const colId of Object.keys(base)) {
      out[colId] = base[colId].filter((id) => allow.has(id));
    }
    return out;
  }, [displayTaskIdsByColumn, matchingTaskIds, taskSearchQuery]);

  const noSearchResults =
    normalizeSearchQuery(taskSearchQuery).length > 0 &&
    matchingTaskIds.size === 0 &&
    tasks.length > 0;

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainerRef.current = false;
    });
  }, [displayColumnIds, displayTaskIdsByColumn]);

  const handleTaskMoveToColumn = async (task: Task, newColumnId: string) => {
    const col = columns.find((c) => c.id === newColumnId);
    if (!col) return;
    if (LOCAL_TASKS_ONLY) {
      setTasks((prev) => {
        const inTarget = prev.filter((x) => resolveColumnId(x) === newColumnId && x.id !== task.id);
        const maxPos = inTarget.length ? Math.max(...inTarget.map((x) => x.position)) : -1;
        return prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                column_id: newColumnId,
                status: col.linkedStatus,
                position: maxPos + 1,
                updated_at: new Date().toISOString(),
              }
            : t,
        );
      });
      return;
    }
    const patch: UpdateTaskInput = { columnId: newColumnId };
    if (col.linkedStatus !== task.status) {
      patch.status = col.linkedStatus;
    }
    try {
      await updateTask(task.id, patch);
      await load();
    } catch (e) {
      setError(boardPageErrorMessage(e));
    }
  };

  const handleDelete = async (taskId: string) => {
    if (LOCAL_TASKS_ONLY) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return;
    }
    try {
      await deleteTask(taskId);
      await load();
    } catch (e) {
      setError(boardPageErrorMessage(e));
    }
  };

  const saveColumn = async (payload: KanbanColumn) => {
    if (!board) return;
    if (columnModal?.mode === "add") {
      try {
        await createBoardColumn({
          boardId: board.id,
          title: payload.title,
          color: payload.color,
          linkedStatus: payload.linkedStatus,
          section: payload.section,
        });
        setColumnModal(null);
        await load();
      } catch (e) {
        setError(boardPageErrorMessage(e));
      }
      return;
    }
    if (columnModal?.mode === "edit") {
      const prev = columns.find((c) => c.id === payload.id);
      if (!prev) {
        setColumnModal(null);
        return;
      }
      try {
        const inTarget = columns.filter(
          (c) => c.section === payload.section && c.id !== payload.id,
        );
        const sortOrderForSave =
          prev.section === payload.section
            ? prev.sortOrder
            : Math.max(-1, ...inTarget.map((c) => c.sortOrder)) + 1;

        await updateBoardColumn(payload.id, {
          title: payload.title,
          color: payload.color,
          linkedStatus: payload.linkedStatus,
          section: payload.section,
          sortOrder: sortOrderForSave,
        });
        if (prev.linkedStatus !== payload.linkedStatus) {
          if (LOCAL_TASKS_ONLY) {
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.column_id === payload.id ? { ...t, status: payload.linkedStatus } : t,
              ),
            );
          } else {
            const affected = tasks.filter((t) => t.column_id === payload.id);
            for (const t of affected) {
              if (t.status !== payload.linkedStatus) {
                await updateTask(t.id, { status: payload.linkedStatus });
              }
            }
          }
        }
        setColumnModal(null);
        await load();
      } catch (e) {
        setError(boardPageErrorMessage(e));
      }
    }
  };

  const persistColumnReorder = async (next: KanbanColumn[]) => {
    try {
      await Promise.all(
        next.map((c) =>
          updateBoardColumn(c.id, { section: c.section, sortOrder: c.sortOrder }),
        ),
      );
      setColumns(next);
    } catch (e) {
      setError(boardPageErrorMessage(e));
      void load();
    }
  };

  const handleColumnDragOver = (event: DragOverEvent) => {
    if (event.active.data.current?.kind === "task") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overId = over.id;
    const overMidX = over.rect.left + over.rect.width / 2;

    setDragColumnItems((prev) => {
      if (!prev) return null;
      const overContainer = findColumnContainer(overId, prev);
      const activeContainer = findColumnContainer(active.id, prev);
      if (!overContainer || !activeContainer) return prev;

      if (activeContainer === overContainer) return prev;

      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(String(active.id));
      if (activeIndex < 0) return prev;

      const overIdStr = String(overId);
      const isSectionEnd = overIdStr.startsWith(SECTION_END_PREFIX);
      let newIndex: number;
      if (isSectionEnd) {
        newIndex = overItems.length;
      } else {
        const overIndex = overItems.indexOf(overIdStr);
        if (overIndex < 0) {
          newIndex = overItems.length;
        } else {
          const translated = active.rect.current.translated;
          const isAfter =
            translated != null && translated.left + translated.width / 2 > overMidX;
          const modifier = isAfter ? 1 : 0;
          newIndex = overIndex + modifier;
        }
      }

      recentlyMovedToNewContainerRef.current = true;

      const movingId = String(active.id);
      const newActiveItems = activeItems.filter((id) => id !== movingId);
      const newOverItems = [
        ...overItems.slice(0, newIndex),
        movingId,
        ...overItems.slice(newIndex),
      ];

      return {
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      };
    });
  };

  const handleTaskDragOver = (event: DragOverEvent) => {
    if (event.active.data.current?.kind !== "task") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overId = over.id;
    const overMidY = over.rect.top + over.rect.height / 2;

    setDragTaskByColumn((prev) => {
      if (!prev) return null;
      const overCol = findTaskColumnFromOverId(overId, prev);
      const activeCol = findTaskColumnFromOverId(active.id, prev);
      if (!overCol || !activeCol) return prev;
      if (activeCol === overCol) return prev;

      const activeItems = [...prev[activeCol]];
      const overItems = [...prev[overCol]];
      const activeIndex = activeItems.indexOf(String(active.id));
      if (activeIndex < 0) return prev;

      const overIdStr = String(overId);
      let newIndex: number;
      if (overIdStr.startsWith(TASK_COL_END_PREFIX)) {
        newIndex = overItems.length;
      } else if (overIdStr.startsWith(TASK_COL_PREFIX)) {
        newIndex = 0;
      } else {
        const overIndex = overItems.indexOf(overIdStr);
        if (overIndex < 0) {
          newIndex = overItems.length;
        } else {
          const translated = active.rect.current.translated;
          const isAfter =
            translated != null && translated.top + translated.height / 2 > overMidY;
          const modifier = isAfter ? 1 : 0;
          newIndex = overIndex + modifier;
        }
      }

      recentlyMovedToNewContainerRef.current = true;

      const movingId = String(active.id);
      const newActiveItems = activeItems.filter((id) => id !== movingId);
      const newOverItems = [
        ...overItems.slice(0, newIndex),
        movingId,
        ...overItems.slice(newIndex),
      ];

      return {
        ...prev,
        [activeCol]: newActiveItems,
        [overCol]: newOverItems,
      };
    });
  };

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const snapshot = dragTaskItemsRef.current;
    setActiveTaskId(null);
    setDragTaskByColumn(null);

    if (!over) return;

    const activeCol = findTaskColumnFromOverId(active.id, snapshot);
    const overCol = findTaskColumnFromOverId(over.id, snapshot);
    if (!activeCol || !overCol) return;

    let finalMap = snapshot;

    if (activeCol === overCol) {
      const overIdStr = String(over.id);
      const arr = [...snapshot[activeCol]];
      const oldIndex = arr.indexOf(String(active.id));
      if (oldIndex < 0) return;

      if (overIdStr.startsWith(TASK_COL_END_PREFIX)) {
        const id = String(active.id);
        const rest = arr.filter((x) => x !== id);
        rest.push(id);
        finalMap = { ...snapshot, [activeCol]: rest };
      } else if (overIdStr.startsWith(TASK_COL_PREFIX)) {
        const id = String(active.id);
        const rest = arr.filter((x) => x !== id);
        rest.unshift(id);
        finalMap = { ...snapshot, [activeCol]: rest };
      } else {
        const overIndex = arr.indexOf(overIdStr);
        if (overIndex < 0) return;
        const translated = active.rect.current.translated;
        const isAfter =
          translated != null &&
          translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2;
        let newIndex = isAfter ? overIndex + 1 : overIndex;
        if (oldIndex < newIndex) newIndex -= 1;
        finalMap = {
          ...snapshot,
          [activeCol]: arrayMove(arr, oldIndex, newIndex),
        };
      }
    }

    setTasks((prev) => applyTaskOrderToState(prev, finalMap, columns));
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    if (event.active.data.current?.kind === "task") return;
    const { active, over } = event;
    const snapshot = dragItemsRef.current;
    setActiveColumnId(null);
    setDragColumnItems(null);

    const activeContainer = findColumnContainer(active.id, snapshot);
    if (!activeContainer) return;

    const effectiveOverId = over?.id ?? lastOverIdRef.current;

    let finalMap = snapshot;

    if (effectiveOverId != null) {
      const overContainer = findColumnContainer(effectiveOverId, snapshot);
      if (overContainer && activeContainer === overContainer) {
        const overIdStr = String(effectiveOverId);
        const arr = [...snapshot[activeContainer]];
        const oldIndex = arr.indexOf(String(active.id));
        if (oldIndex < 0) return;

        if (overIdStr.startsWith(SECTION_END_PREFIX)) {
          const id = String(active.id);
          const rest = arr.filter((x) => x !== id);
          rest.push(id);
          finalMap = { ...snapshot, [activeContainer]: rest };
        } else {
          const overIndex = arr.indexOf(overIdStr);
          if (overIndex < 0) return;
          let isAfter = false;
          if (over) {
            const translated = active.rect.current.translated;
            isAfter =
              translated != null &&
              translated.left + translated.width / 2 > over.rect.left + over.rect.width / 2;
          }
          let newIndex = isAfter ? overIndex + 1 : overIndex;
          if (oldIndex < newIndex) newIndex -= 1;
          finalMap = {
            ...snapshot,
            [activeContainer]: arrayMove(arr, oldIndex, newIndex),
          };
        }
      }
    }

    const colMap = new Map(columns.map((c) => [c.id, c]));
    const next = finalizeSortOrders(buildKanbanFromItemOrder(finalMap, colMap));
    void persistColumnReorder(next);
  };

  const handleBoardDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.kind === "task") {
      setActiveTaskId(String(e.active.id));
      setActiveColumnId(null);
      setDragTaskByColumn(deriveTaskIdsByColumn(tasks, columns, resolveColumnId));
      return;
    }
    setActiveColumnId(String(e.active.id));
    setActiveTaskId(null);
    setDragColumnItems({
      today: [...columnIdsBySection.today],
      this_week: [...columnIdsBySection.this_week],
      later: [...columnIdsBySection.later],
    });
  };

  const handleBoardDragOver = (e: DragOverEvent) => {
    if (e.active.data.current?.kind === "task") {
      handleTaskDragOver(e);
    } else {
      handleColumnDragOver(e);
    }
  };

  const handleBoardDragEnd = (e: DragEndEvent) => {
    if (e.active.data.current?.kind === "task") {
      handleTaskDragEnd(e);
    } else {
      handleColumnDragEnd(e);
    }
  };

  const handleBoardDragCancel = () => {
    setActiveColumnId(null);
    setActiveTaskId(null);
    setDragColumnItems(null);
    setDragTaskByColumn(null);
  };

  const activeColumn =
    activeColumnId && !activeTaskId ? columns.find((c) => c.id === activeColumnId) : undefined;
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : undefined;
  const activeTaskColumn =
    activeTask ? columns.find((c) => c.id === resolveColumnId(activeTask)) : undefined;

  if (!boardId) {
    return (
      <main className="mx-auto max-w-6xl px-4">
        <p className="text-vibe-muted">{t("boards.detail.invalidUrl")}</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] flex-1 items-center justify-center px-4">
        <p className="text-vibe-muted">{t("common.loading")}</p>
      </main>
    );
  }

  if (error && !board) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-4">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            to="/boards"
            className={`${pressableBase} text-sm font-semibold text-vibe-purple hover:underline`}
          >
            {t("boards.detail.allBoards")}
          </Link>
        </div>
        <div className={`${cardClass} border-amber-200 bg-amber-50 text-amber-950`}>
          <p className="text-sm font-medium">{error}</p>
        </div>
      </main>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <>
      <BoardWhiteboardShell
        boardName={board.name}
        boardDescription={board.description}
        participants={boardParticipants}
        backTo="/boards"
        showDelete={isBoardOwner}
        onDeleteBoard={() => {
          setDeleteError(null);
          setDeleteOpen(true);
        }}
        errorBanner={error}
        taskSearch={{ value: taskSearchQuery, onChange: setTaskSearchQuery }}
      >
        {noSearchResults ? (
          <p className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
            {t("boards.detail.searchNoResults")}
          </p>
        ) : null}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleBoardDragStart}
          onDragOver={handleBoardDragOver}
          onDragEnd={handleBoardDragEnd}
          onDragCancel={handleBoardDragCancel}
        >
          <div className={kanbanCanvasWhiteboardClass}>
            <div className="space-y-10">
              {BOARD_COLUMN_SECTION_ORDER.map((sec) => {
                const colIds = displayColumnIds[sec];
                const sectionEndBtnClass = kanbanSectionEndBtnClass;
                return (
                  <div key={sec} className="space-y-3">
                    <div className={kanbanSectionToolbarClass}>
                      <h3 className={kanbanSectionHeadingClass}>
                        {t(`boards.detail.sections.${sec}`)}
                      </h3>
                      <button
                        type="button"
                        className={kanbanAddColumnBtnClass}
                        onClick={() => setColumnModal({ mode: "add", section: sec })}
                      >
                        {t("boards.detail.addColumn")}
                      </button>
                    </div>
                    <div className={kanbanSectionStripClass}>
                      <SortableContext items={colIds} strategy={rectSortingStrategy}>
                        {colIds.map((colId, colIndex) => {
                          const col = columns.find((c) => c.id === colId);
                          if (!col) return null;
                          return (
                            <SortableKanbanColumn
                              key={colId}
                              col={col}
                              colIndex={colIndex}
                              orderedTaskIds={visibleTaskIdsByColumn[col.id] ?? []}
                              taskById={taskById}
                              boardParticipants={boardParticipants}
                              columns={columns}
                              resolveColumnId={resolveColumnId}
                              onEditColumn={() => setColumnModal({ mode: "edit", columnId: col.id })}
                              onDeleteColumn={() => {
                                setColumnDeleteError(null);
                                setColumnDelete({ id: col.id, title: col.title });
                              }}
                              onAddTask={() => setCreateForColumnId(col.id)}
                              onTaskMoveToColumn={(task, newColumnId) =>
                                void handleTaskMoveToColumn(task, newColumnId)
                              }
                              onDeleteTask={(taskId) => void handleDelete(taskId)}
                              onEditTask={(task) => setEditingTask(task)}
                            />
                          );
                        })}
                      </SortableContext>
                      <SectionEndDropZone
                        sec={sec}
                        label={t("boards.detail.dropHere")}
                        pressableClass={sectionEndBtnClass}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask && board ? (
              <KanbanTaskDragOverlayCard
                task={activeTask}
                boardParticipants={boardParticipants}
                columnColorFallback={activeTaskColumn?.color ?? "#9D27FF"}
              />
            ) : activeColumn ? (
              <div className="origin-top-left cursor-grabbing shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                <div
                  className={`${kanbanColumnShellClass} flex min-h-[min(520px,60vh)] w-72 max-w-[min(100%,20rem)] flex-col overflow-hidden`}
                >
                  <div
                    className={kanbanColumnAccentClass}
                    style={{ backgroundColor: activeColumn.color }}
                    aria-hidden
                  />
                  <div className={kanbanColumnInnerClass}>
                    <KanbanColumnCardBody
                      col={activeColumn}
                      colIndex={0}
                      orderedTaskIds={displayTaskIdsByColumn[activeColumn.id] ?? []}
                      taskById={taskById}
                      boardParticipants={boardParticipants}
                      columns={columns}
                      resolveColumnId={resolveColumnId}
                      onEditColumn={() => {}}
                      onDeleteColumn={() => {}}
                      onAddTask={() => {}}
                      onTaskMoveToColumn={() => {}}
                      onDeleteTask={() => {}}
                      onEditTask={() => {}}
                      setColumnActivatorNodeRef={() => {}}
                      columnHandleListeners={undefined}
                      overlay
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </BoardWhiteboardShell>

      {createForColumnId && board ? (
        <CreateTaskModal
          key={createForColumnId}
          boardId={board.id}
          column={columns.find((c) => c.id === createForColumnId)}
          participants={boardParticipants}
          titleId={createTitleId}
          localOnly={LOCAL_TASKS_ONLY}
          onClose={() => setCreateForColumnId(null)}
          onCreated={() => {
            setCreateForColumnId(null);
            void load();
          }}
          onCreateLocal={(payload) => {
            const col = columns.find((c) => c.id === createForColumnId);
            if (!col) return;
            setTasks((prev) => {
              const inCol = prev.filter((t) => resolveColumnId(t) === col.id);
              const maxPos = inCol.length ? Math.max(...inCol.map((t) => t.position)) : -1;
              return [
                ...prev,
                buildLocalTask(board.id, col, payload.title, payload.description, maxPos + 1, {
                  assigneeUserId: payload.assigneeUserId,
                  cardColor: payload.cardColor,
                  attachmentUrls: payload.attachmentUrls,
                }),
              ];
            });
            setCreateForColumnId(null);
          }}
        />
      ) : null}

      {editingTask && board ? (
        <EditTaskModal
          boardId={board.id}
          task={editingTask}
          columns={columns}
          participants={boardParticipants}
          resolveColumnId={resolveColumnId}
          titleId={editTaskTitleId}
          localOnly={LOCAL_TASKS_ONLY}
          onClose={() => setEditingTask(null)}
          onSave={async (patch) => {
            const col = columns.find((c) => c.id === patch.columnId);
            if (!col) return;
            if (LOCAL_TASKS_ONLY) {
              setTasks((prev) =>
                prev.map((t) => {
                  if (t.id !== editingTask.id) return t;
                  const columnChanged = resolveColumnId(t) !== patch.columnId;
                  let position = t.position;
                  if (columnChanged) {
                    const inTarget = prev.filter(
                      (x) => x.id !== editingTask.id && resolveColumnId(x) === patch.columnId,
                    );
                    const maxPos = inTarget.length ? Math.max(...inTarget.map((x) => x.position)) : -1;
                    position = maxPos + 1;
                  }
                  return {
                    ...t,
                    title: patch.title,
                    description: patch.description,
                    column_id: patch.columnId,
                    status: col.linkedStatus,
                    position,
                    assignee_user_id: patch.assigneeUserId,
                    card_color: patch.cardColor,
                    attachment_urls: patch.attachmentUrls,
                    updated_at: new Date().toISOString(),
                  };
                }),
              );
              setEditingTask(null);
              return;
            }
            try {
              const p: UpdateTaskInput = {
                title: patch.title,
                description: patch.description,
                columnId: patch.columnId,
                assigneeUserId: patch.assigneeUserId,
                cardColor: patch.cardColor,
                attachmentUrls: patch.attachmentUrls,
              };
              if (col.linkedStatus !== editingTask.status) {
                p.status = col.linkedStatus;
              }
              await updateTask(editingTask.id, p);
              setEditingTask(null);
              await load();
            } catch (e) {
              setError(boardPageErrorMessage(e));
            }
          }}
        />
      ) : null}

      {columnModal ? (
        <ColumnFormModal
          key={
            columnModal.mode === "edit"
              ? columnModal.columnId
              : `add-${columnModal.section}`
          }
          mode={columnModal.mode}
          defaultSection={columnModal.mode === "add" ? columnModal.section : "today"}
          initialColumn={
            columnModal.mode === "edit"
              ? columns.find((c) => c.id === columnModal.columnId)
              : undefined
          }
          titleId={columnFormTitleId}
          onClose={() => setColumnModal(null)}
          onSave={saveColumn}
        />
      ) : null}

      {deleteOpen && board ? (
        <DeleteBoardDialog
          titleId={deleteTitleId}
          boardName={board.name}
          onClose={() => !deleteBusy && setDeleteOpen(false)}
          onConfirm={() => void handleDeleteBoard()}
          busy={deleteBusy}
          error={deleteError}
        />
      ) : null}

      {columnDelete ? (
        <DeleteColumnDialog
          titleId={deleteColumnTitleId}
          columnName={columnDelete.title}
          onClose={() => !columnDeleteBusy && setColumnDelete(null)}
          onConfirm={() => void handleColumnDeleteConfirm()}
          busy={columnDeleteBusy}
          error={columnDeleteError}
        />
      ) : null}
    </>
  );
};

export default BoardDetailPage;

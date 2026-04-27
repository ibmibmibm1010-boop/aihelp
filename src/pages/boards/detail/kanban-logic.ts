import type { UniqueIdentifier } from "@dnd-kit/core";

import {
  BOARD_COLUMN_SECTION_ORDER,
  type BoardColumn,
  type BoardColumnSection,
  type Task,
} from "@shared/api";

import { SECTION_END_PREFIX, TASK_COL_END_PREFIX, TASK_COL_PREFIX } from "./constants";
import type { KanbanColumn } from "./types";

export function deriveTaskIdsByColumn(
  allTasks: Task[],
  cols: KanbanColumn[],
  resolveCol: (task: Task) => string,
): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const c of cols) {
    m[c.id] = allTasks
      .filter((t) => resolveCol(t) === c.id)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((t) => t.id);
  }
  return m;
}

export function findTaskColumnFromOverId(
  overId: UniqueIdentifier,
  order: Record<string, string[]>,
): string | undefined {
  const s = String(overId);
  if (s.startsWith(TASK_COL_END_PREFIX)) {
    return s.slice(TASK_COL_END_PREFIX.length);
  }
  if (s.startsWith(TASK_COL_PREFIX)) {
    return s.slice(TASK_COL_PREFIX.length);
  }
  for (const colId of Object.keys(order)) {
    if (order[colId].includes(s)) return colId;
  }
  return undefined;
}

export function applyTaskOrderToState(
  prevTasks: Task[],
  order: Record<string, string[]>,
  cols: KanbanColumn[],
): Task[] {
  const taskById = new Map(prevTasks.map((t) => [t.id, t]));
  const next: Task[] = [];
  for (const col of cols) {
    const ids = order[col.id] ?? [];
    ids.forEach((taskId, position) => {
      const t = taskById.get(taskId);
      if (!t) return;
      next.push({
        ...t,
        column_id: col.id,
        status: col.linkedStatus,
        position,
        updated_at: new Date().toISOString(),
      });
    });
  }
  const placed = new Set(next.map((t) => t.id));
  return [...next, ...prevTasks.filter((t) => !placed.has(t.id))];
}

export function buildLocalTask(
  boardId: string,
  column: KanbanColumn,
  title: string,
  description: string | null,
  position: number,
  opts?: {
    assigneeUserId?: string | null;
    cardColor?: string | null;
    attachmentUrls?: string[];
  },
): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    board_id: boardId,
    title,
    description,
    status: column.linkedStatus,
    column_id: column.id,
    position,
    assignee_user_id: opts?.assigneeUserId ?? null,
    card_color: opts?.cardColor ?? null,
    attachment_urls: opts?.attachmentUrls?.length ? opts.attachmentUrls : [],
    created_by: "",
    created_at: now,
    updated_at: now,
  };
}

export function deriveColumnIdsBySection(cols: KanbanColumn[]): Record<BoardColumnSection, string[]> {
  const m: Record<BoardColumnSection, string[]> = {
    today: [],
    this_week: [],
    later: [],
  };
  for (const sec of BOARD_COLUMN_SECTION_ORDER) {
    m[sec] = cols
      .filter((c) => c.section === sec)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => c.id);
  }
  return m;
}

export function findColumnContainer(
  id: UniqueIdentifier,
  items: Record<BoardColumnSection, string[]>,
): BoardColumnSection | undefined {
  const s = String(id);
  if (s.startsWith(SECTION_END_PREFIX)) {
    const sec = s.slice(SECTION_END_PREFIX.length) as BoardColumnSection;
    if ((BOARD_COLUMN_SECTION_ORDER as readonly string[]).includes(sec)) return sec;
    return undefined;
  }
  return BOARD_COLUMN_SECTION_ORDER.find((sec) => items[sec].includes(s));
}

export function buildKanbanFromItemOrder(
  items: Record<BoardColumnSection, string[]>,
  colMap: Map<string, KanbanColumn>,
): KanbanColumn[] {
  const result: KanbanColumn[] = [];
  for (const sec of BOARD_COLUMN_SECTION_ORDER) {
    items[sec].forEach((id, i) => {
      const c = colMap.get(id);
      if (c) result.push({ ...c, section: sec, sortOrder: i });
    });
  }
  return result;
}

export function boardColumnToKanban(c: BoardColumn): KanbanColumn {
  return {
    id: c.id,
    title: c.title,
    color: c.color,
    linkedStatus: c.linked_status,
    section: c.section,
    sortOrder: c.sort_order,
  };
}

export function finalizeSortOrders(list: KanbanColumn[]): KanbanColumn[] {
  const result: KanbanColumn[] = [];
  for (const sec of BOARD_COLUMN_SECTION_ORDER) {
    const inSec = list.filter((c) => c.section === sec);
    inSec.forEach((c, i) => result.push({ ...c, section: sec, sortOrder: i }));
  }
  return result;
}

import type { BoardColumnSection } from "@shared/api";

/** Задачи только в памяти на этой странице (без Supabase для карточек). */
export const LOCAL_TASKS_ONLY = false;

export const TASK_COL_PREFIX = "tc:";
export const TASK_COL_END_PREFIX = "tend:";

export function taskColumnDropId(columnId: string): string {
  return `${TASK_COL_PREFIX}${columnId}`;
}

export function taskColumnEndDropId(columnId: string): string {
  return `${TASK_COL_END_PREFIX}${columnId}`;
}

export const SECTION_END_PREFIX = "section-end-";

export function sectionEndDropId(sec: BoardColumnSection): string {
  return `${SECTION_END_PREFIX}${sec}`;
}

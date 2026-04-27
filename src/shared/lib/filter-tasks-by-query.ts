import type { Task } from "@shared/api";

/** Нормализация для сравнения: trim, пробелы, нижний регистр. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Задача совпадает с запросом, если нормализованная подстрока есть в title или description.
 * Пустой запрос — все задачи совпадают.
 */
export function taskMatchesSearchQuery(task: Task, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const title = task.title.toLowerCase();
  const desc = (task.description ?? "").toLowerCase();
  return title.includes(normalizedQuery) || desc.includes(normalizedQuery);
}

/** Множество id задач, прошедших фильтр. */
export function filterTaskIdsByQuery(tasks: Task[], rawQuery: string): Set<string> {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) {
    return new Set(tasks.map((t) => t.id));
  }
  const out = new Set<string>();
  for (const t of tasks) {
    if (taskMatchesSearchQuery(t, q)) out.add(t.id);
  }
  return out;
}

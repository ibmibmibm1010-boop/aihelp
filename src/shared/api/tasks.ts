import { getSupabase } from "@shared/lib/supabase-client";

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  column_id: string | null;
  position: number;
  assignee_user_id: string | null;
  /** HEX (#rrggbb), подсветка карточки в UI */
  card_color: string | null;
  /** Публичные URL вложенных изображений */
  attachment_urls: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  boardId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  columnId?: string | null;
  /** Если не задано, подставляется 0. */
  position?: number;
  assigneeUserId?: string | null;
  cardColor?: string | null;
  attachmentUrls?: string[];
};

/** Строка для пакетного создания (например, после ИИ). */
export type CreateSubtaskLineInput = { title: string; description: string | null };

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  columnId?: string | null;
  assigneeUserId?: string | null;
  cardColor?: string | null;
  attachmentUrls?: string[];
};

const taskColumnsWithAttachments =
  "id, board_id, title, description, status, column_id, position, assignee_user_id, card_color, attachment_urls, created_by, created_at, updated_at";

const taskColumns =
  "id, board_id, title, description, status, column_id, position, assignee_user_id, card_color, created_by, created_at, updated_at";

/** Без card_color и attachment_urls — если миграции ещё не применены. */
const taskColumnsLegacy =
  "id, board_id, title, description, status, column_id, position, assignee_user_id, created_by, created_at, updated_at";

function isMissingCardColorColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: string }).message ?? "");
  const details = String((error as { details?: string }).details ?? "");
  const hint = String((error as { hint?: string }).hint ?? "");
  const blob = `${msg} ${details} ${hint}`;
  if (!/card_color/i.test(blob)) return false;
  return (
    /PGRST204|column.*does not exist|Could not find.*column|schema cache|unknown column/i.test(
      blob,
    ) || /42703/.test(blob)
  );
}

function isMissingAttachmentUrlsColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = String((error as { message?: string }).message ?? "");
  const details = String((error as { details?: string }).details ?? "");
  const hint = String((error as { hint?: string }).hint ?? "");
  const blob = `${msg} ${details} ${hint}`;
  if (!/attachment_urls/i.test(blob)) return false;
  return (
    /PGRST204|column.*does not exist|Could not find.*column|schema cache|unknown column/i.test(
      blob,
    ) || /42703/.test(blob)
  );
}

/** null = ещё не проверяли; после первого успешного ответа кэшируем. */
let tasksTableHasCardColorColumn: boolean | null = null;
let tasksTableHasAttachmentUrlsColumn: boolean | null = null;

async function taskSelectList(
  supabase: ReturnType<typeof getSupabase>,
): Promise<
  typeof taskColumnsWithAttachments | typeof taskColumns | typeof taskColumnsLegacy
> {
  if (tasksTableHasCardColorColumn === false) {
    tasksTableHasAttachmentUrlsColumn = false;
    return taskColumnsLegacy;
  }

  if (tasksTableHasCardColorColumn === null) {
    const { error } = await supabase.from("tasks").select("card_color").limit(1);
    if (error && isMissingCardColorColumnError(error)) {
      tasksTableHasCardColorColumn = false;
      tasksTableHasAttachmentUrlsColumn = false;
      return taskColumnsLegacy;
    }
    tasksTableHasCardColorColumn = true;
  }

  if (tasksTableHasAttachmentUrlsColumn === null) {
    const { error } = await supabase.from("tasks").select("attachment_urls").limit(1);
    if (error && isMissingAttachmentUrlsColumnError(error)) {
      tasksTableHasAttachmentUrlsColumn = false;
    } else {
      tasksTableHasAttachmentUrlsColumn = true;
    }
  }

  if (tasksTableHasAttachmentUrlsColumn === false) {
    return taskColumns;
  }
  return taskColumnsWithAttachments;
}

function mapTaskRows(data: unknown): Task[] {
  const rows = (data as Task[] | null | undefined) ?? [];
  return rows.map((row) => {
    const r = row as Task & { attachment_urls?: unknown };
    const urls = r.attachment_urls;
    return {
      ...r,
      card_color: r.card_color ?? null,
      attachment_urls: Array.isArray(urls) ? (urls as string[]) : [],
    };
  }) as Task[];
}

async function queryTasksForBoard(
  supabase: ReturnType<typeof getSupabase>,
  boardId: string,
  columns: string,
) {
  return supabase
    .from("tasks")
    .select(columns)
    .eq("board_id", boardId)
    .order("status", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function fetchTasks(boardId: string): Promise<Task[]> {
  const supabase = getSupabase();
  let columns = await taskSelectList(supabase);
  let { data, error } = await queryTasksForBoard(supabase, boardId, columns);
  if (error && isMissingAttachmentUrlsColumnError(error)) {
    tasksTableHasAttachmentUrlsColumn = false;
    columns = await taskSelectList(supabase);
    const second = await queryTasksForBoard(supabase, boardId, columns);
    data = second.data;
    error = second.error;
  }
  if (error && isMissingCardColorColumnError(error)) {
    tasksTableHasCardColorColumn = false;
    tasksTableHasAttachmentUrlsColumn = false;
    columns = taskColumnsLegacy;
    const second = await queryTasksForBoard(supabase, boardId, columns);
    data = second.data;
    error = second.error;
  }
  if (error) throw error;
  return mapTaskRows(data);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError ?? new Error("Необходимо войти в аккаунт.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Укажите заголовок задачи.");
  }

  const description =
    input.description?.trim() === "" ? null : input.description?.trim() ?? null;
  const status = input.status ?? "todo";

  const insertRow: Record<string, unknown> = {
    board_id: input.boardId,
    title,
    description,
    status,
    position: input.position ?? 0,
    created_by: user.id,
  };
  if (input.columnId !== undefined && input.columnId !== null) {
    insertRow.column_id = input.columnId;
  }
  if (input.assigneeUserId !== undefined) {
    insertRow.assignee_user_id = input.assigneeUserId;
  }
  if (input.cardColor !== undefined) {
    insertRow.card_color = input.cardColor;
  }
  if (input.attachmentUrls !== undefined && input.attachmentUrls.length > 0) {
    insertRow.attachment_urls = input.attachmentUrls;
  }

  const columns = await taskSelectList(supabase);
  if (columns === taskColumnsLegacy) {
    delete insertRow.card_color;
    delete insertRow.attachment_urls;
  } else if (columns === taskColumns) {
    delete insertRow.attachment_urls;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertRow)
    .select(columns as string)
    .single();

  if (error) throw error;
  return mapTaskRows([data as unknown as Task])[0];
}

async function getMaxTaskPositionInColumn(
  supabase: ReturnType<typeof getSupabase>,
  boardId: string,
  columnId: string | null,
): Promise<number> {
  let q = supabase.from("tasks").select("position").eq("board_id", boardId);
  if (columnId) {
    q = q.eq("column_id", columnId);
  } else {
    q = q.is("column_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return -1;
  return Math.max(...data.map((r) => Number((r as { position: number }).position)));
}

/**
 * Создаёт несколько карточек в одной колонке с позициями max+1, max+2, …
 */
export async function createSubtasksForColumn(input: {
  boardId: string;
  columnId: string | null;
  status: TaskStatus;
  items: CreateSubtaskLineInput[];
}): Promise<Task[]> {
  const trimmed: CreateSubtaskLineInput[] = input.items
    .map((x) => {
      const t = x.title.trim();
      const d = x.description?.trim() ?? "";
      return {
        title: t,
        description: d === "" ? null : d,
      };
    })
    .filter((x) => x.title.length > 0);
  if (trimmed.length === 0) {
    return [];
  }

  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError ?? new Error("Необходимо войти в аккаунт.");
  }

  const base = await getMaxTaskPositionInColumn(supabase, input.boardId, input.columnId);
  const columns = await taskSelectList(supabase);

  const rows: Record<string, unknown>[] = trimmed.map((item, i) => {
    const row: Record<string, unknown> = {
      board_id: input.boardId,
      title: item.title,
      description: item.description,
      status: input.status,
      position: base + 1 + i,
      created_by: user.id,
    };
    if (input.columnId != null) {
      row.column_id = input.columnId;
    }
    return row;
  });

  const { data, error } = await supabase
    .from("tasks")
    .insert(rows)
    .select(columns as string);

  if (error) throw error;
  return mapTaskRows(data);
}

export async function updateTask(
  taskId: string,
  patch: UpdateTaskInput,
): Promise<void> {
  const supabase = getSupabase();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) {
    row.title = patch.title.trim();
  }
  if (patch.description !== undefined) {
    row.description = patch.description;
  }
  if (patch.status !== undefined) {
    row.status = patch.status;
  }
  if (patch.columnId !== undefined) {
    row.column_id = patch.columnId;
  }
  if (patch.assigneeUserId !== undefined) {
    row.assignee_user_id = patch.assigneeUserId;
  }

  const columns = await taskSelectList(supabase);
  if (patch.cardColor !== undefined && columns !== taskColumnsLegacy) {
    row.card_color = patch.cardColor;
  }
  if (patch.attachmentUrls !== undefined && columns === taskColumnsWithAttachments) {
    row.attachment_urls = patch.attachmentUrls;
  }

  const { error } = await supabase.from("tasks").update(row).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

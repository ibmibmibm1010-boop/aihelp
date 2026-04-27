import { getSupabase } from "@shared/lib/supabase-client";

import type { TaskStatus } from "./tasks";

export type BoardColumnSection = "today" | "this_week" | "later";

export const BOARD_COLUMN_SECTION_ORDER: BoardColumnSection[] = [
  "today",
  "this_week",
  "later",
];

export type BoardColumn = {
  id: string;
  board_id: string;
  title: string;
  color: string;
  linked_status: TaskStatus;
  section: BoardColumnSection;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const columnFields =
  "id, board_id, title, color, linked_status, section, sort_order, created_at, updated_at";

export type CreateBoardColumnInput = {
  boardId: string;
  title: string;
  color: string;
  linkedStatus: TaskStatus;
  section: BoardColumnSection;
};

export type UpdateBoardColumnInput = {
  title?: string;
  color?: string;
  linkedStatus?: TaskStatus;
  section?: BoardColumnSection;
  sortOrder?: number;
};

function sortColumnsBySection(rows: BoardColumn[]): BoardColumn[] {
  return [...rows].sort((a, b) => {
    const si = BOARD_COLUMN_SECTION_ORDER.indexOf(a.section);
    const sj = BOARD_COLUMN_SECTION_ORDER.indexOf(b.section);
    if (si !== sj) return si - sj;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function fetchBoardColumns(boardId: string): Promise<BoardColumn[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("board_columns")
    .select(columnFields)
    .eq("board_id", boardId);
  if (error) throw error;
  return sortColumnsBySection((data ?? []) as BoardColumn[]);
}

export async function createBoardColumn(input: CreateBoardColumnInput): Promise<BoardColumn> {
  const supabase = getSupabase();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Укажите название колонки.");
  }

  const { data: maxRow, error: maxError } = await supabase
    .from("board_columns")
    .select("sort_order")
    .eq("board_id", input.boardId)
    .eq("section", input.section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) throw maxError;
  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("board_columns")
    .insert({
      board_id: input.boardId,
      title,
      color: input.color,
      linked_status: input.linkedStatus,
      section: input.section,
      sort_order: sortOrder,
    })
    .select(columnFields)
    .single();

  if (error) throw error;
  return data as BoardColumn;
}

export async function updateBoardColumn(
  columnId: string,
  patch: UpdateBoardColumnInput,
): Promise<void> {
  const supabase = getSupabase();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) {
    row.title = patch.title.trim();
  }
  if (patch.color !== undefined) {
    row.color = patch.color;
  }
  if (patch.linkedStatus !== undefined) {
    row.linked_status = patch.linkedStatus;
  }
  if (patch.section !== undefined) {
    row.section = patch.section;
  }
  if (patch.sortOrder !== undefined) {
    row.sort_order = patch.sortOrder;
  }

  const { error } = await supabase.from("board_columns").update(row).eq("id", columnId);
  if (error) throw error;
}

export async function deleteBoardColumn(columnId: string): Promise<void> {
  const id = columnId.trim();
  if (!id) {
    throw new Error("Не указан идентификатор колонки.");
  }
  const supabase = getSupabase();
  const { error } = await supabase.from("board_columns").delete().eq("id", id);
  if (error) throw error;
}

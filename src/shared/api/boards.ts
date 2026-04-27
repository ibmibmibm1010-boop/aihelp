import { getSupabase } from "@shared/lib/supabase-client";
import { fetchProfilesByIds } from "./profiles";

export type Board = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardMember = {
  id: string;
  board_id: string;
  user_id: string;
  member_email: string;
  role: string;
  created_at: string;
};

/** Участники доски для назначения на задачу: владелец + board_members (без дублей). */
export type BoardParticipant = {
  userId: string;
  label: string;
  subtitle?: string;
};

export type CreateBoardInput = {
  name: string;
  description?: string;
};

type RpcInviteResult = {
  ok: boolean;
  error?: string;
  user_id?: string;
};

const boardColumns = "id, user_id, name, description, created_at, updated_at";

const memberColumns =
  "id, board_id, user_id, member_email, role, created_at";

function parseRpcInviteResult(data: unknown): RpcInviteResult {
  if (data == null) {
    return { ok: false, error: "empty_response" };
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as RpcInviteResult;
    } catch {
      return { ok: false, error: "invalid_json" };
    }
  }
  if (Array.isArray(data) && data[0] != null && typeof data[0] === "object" && "ok" in data[0]) {
    return data[0] as RpcInviteResult;
  }
  if (typeof data === "object" && "ok" in data) {
    return data as RpcInviteResult;
  }
  return { ok: false, error: "invalid_shape" };
}

const inviteErrorMessages: Record<string, string> = {
  empty_email: "Укажите email.",
  board_not_found: "Доска не найдена.",
  not_owner: "Только владелец доски может приглашать участников.",
  user_not_found:
    "Пользователь с таким email не найден. Сначала пусть зарегистрируется в приложении.",
  already_owner: "Этот пользователь уже владелец доски.",
  already_member: "Участник уже добавлен.",
  empty_response: "Пустой ответ сервера.",
  invalid_json: "Некорректный ответ сервера.",
  invalid_shape: "Некорректный ответ сервера.",
  unknown: "Не удалось добавить участника.",
  timeout_invite:
    "Сервер не ответил вовремя. Проверьте сеть и что в Supabase доступна функция add_board_member_by_email.",
};

const RPC_INVITE_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = globalThis.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((v) => {
        globalThis.clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        globalThis.clearTimeout(t);
        reject(e);
      });
  });
}

export async function fetchBoards(): Promise<Board[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("boards")
    .select(boardColumns)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Board[];
}

export async function fetchBoardById(id: string): Promise<Board | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("boards")
    .select(boardColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Board | null;
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw userError ?? new Error("Необходимо войти в аккаунт.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Укажите название доски.");
  }

  const description =
    input.description?.trim() === "" ? null : input.description?.trim() ?? null;

  const { data, error } = await supabase
    .from("boards")
    .insert({
      user_id: user.id,
      name,
      description,
    })
    .select(boardColumns)
    .single();

  if (error) throw error;
  return data as Board;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const id = boardId.trim();
  if (!id) {
    throw new Error("Не указан идентификатор доски.");
  }
  const supabase = getSupabase();
  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBoardMembers(boardId: string): Promise<BoardMember[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("board_members")
    .select(memberColumns)
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BoardMember[];
}

export async function fetchBoardParticipants(boardId: string): Promise<BoardParticipant[]> {
  const board = await fetchBoardById(boardId);
  if (!board) return [];
  const members = await fetchBoardMembers(boardId);
  const userIds = new Set<string>([board.user_id]);
  for (const m of members) {
    userIds.add(m.user_id);
  }
  const profiles = await fetchProfilesByIds([...userIds]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const labelFor = (userId: string, fallbackEmail: string) => {
    const p = profileById.get(userId);
    const name = p?.full_name?.trim() || p?.username?.trim();
    return name || fallbackEmail || userId.slice(0, 8);
  };

  const out: BoardParticipant[] = [];
  out.push({
    userId: board.user_id,
    label: labelFor(board.user_id, ""),
    subtitle: "Владелец",
  });

  for (const m of members) {
    if (m.user_id === board.user_id) continue;
    out.push({
      userId: m.user_id,
      label: labelFor(m.user_id, m.member_email),
      subtitle: m.member_email,
    });
  }

  return out;
}

export async function addBoardMemberByEmail(
  boardId: string,
  email: string,
): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase.rpc("add_board_member_by_email", {
        p_board_id: boardId,
        p_email: email.trim(),
      }),
    ),
    RPC_INVITE_TIMEOUT_MS,
    inviteErrorMessages.timeout_invite,
  );
  if (error) throw error;
  const row = parseRpcInviteResult(data);
  if (!row.ok) {
    const code = row.error ?? "unknown";
    throw new Error(inviteErrorMessages[code] ?? code);
  }
}

export async function removeBoardMember(
  boardId: string,
  memberUserId: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("board_members")
    .delete()
    .eq("board_id", boardId)
    .eq("user_id", memberUserId);
  if (error) throw error;
}

import "@testing-library/jest-dom";
import i18n from "i18next";
import { vi } from "vitest";

import "@shared/i18n/config";

beforeAll(async () => {
  await i18n.changeLanguage("ru");
});

const mockUnsubscribe = vi.fn();

const mockBoardRow = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  name: "Тестовая доска",
  description: null as string | null,
  created_at: "2026-01-01T12:00:00.000Z",
  updated_at: "2026-01-01T12:00:00.000Z",
};

const mockBoardColumns = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    board_id: mockBoardRow.id,
    title: "К выполнению",
    color: "#6366f1",
    linked_status: "todo",
    section: "today",
    sort_order: 0,
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    board_id: mockBoardRow.id,
    title: "В работе",
    color: "#f59e0b",
    linked_status: "doing",
    section: "this_week",
    sort_order: 0,
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    board_id: mockBoardRow.id,
    title: "Готово",
    color: "#22c55e",
    linked_status: "done",
    section: "later",
    sort_order: 0,
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
  },
];

vi.mock("@shared/lib/supabase-client", () => ({
  getSupabase: () => ({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: { ok: true, user_id: "00000000-0000-4000-8000-000000000099" },
      error: null,
    }),
    from: vi.fn((table: string) => {
      if (table === "boards") {
        return {
          select: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [mockBoardRow],
              error: null,
            }),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockBoardRow,
                error: null,
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockBoardRow,
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "tasks") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "00000000-0000-4000-8000-0000000000aa",
                  board_id: mockBoardRow.id,
                  title: "Задача",
                  description: null,
                  status: "todo",
                  column_id: null,
                  position: 0,
                  assignee_user_id: null,
                  card_color: null,
                  attachment_urls: [],
                  created_by: mockBoardRow.user_id,
                  created_at: "2026-01-01T12:00:00.000Z",
                  updated_at: "2026-01-01T12:00:00.000Z",
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === "board_columns") {
        return {
          select: vi.fn((fields?: string) => {
            if (fields === "sort_order") {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                      })),
                    })),
                  })),
                })),
              };
            }
            return {
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: mockBoardColumns,
                    error: null,
                  }),
                })),
              })),
            };
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockBoardColumns[0],
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === "board_members") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  }),
}));

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

import { describe, expect, it } from "vitest";

import type { Task } from "@shared/api";

import { filterTaskIdsByQuery, normalizeSearchQuery, taskMatchesSearchQuery } from "../filter-tasks-by-query";

const baseTask = (over: Partial<Task>): Task => ({
  id: "t1",
  board_id: "b1",
  title: "Hello",
  description: null,
  status: "todo",
  column_id: "c1",
  position: 0,
  assignee_user_id: null,
  card_color: null,
  attachment_urls: [],
  created_by: "u1",
  created_at: "",
  updated_at: "",
  ...over,
});

describe("normalizeSearchQuery", () => {
  it("trims and collapses spaces and lowercases", () => {
    expect(normalizeSearchQuery("  Foo   Bar  ")).toBe("foo bar");
  });
});

describe("taskMatchesSearchQuery", () => {
  it("matches title substring", () => {
    const t = baseTask({ title: "Deploy API" });
    expect(taskMatchesSearchQuery(t, "deploy")).toBe(true);
    expect(taskMatchesSearchQuery(t, "prod")).toBe(false);
  });

  it("matches description", () => {
    const t = baseTask({ title: "X", description: "See docs for RLS" });
    expect(taskMatchesSearchQuery(t, "rls")).toBe(true);
  });

  it("empty query matches all", () => {
    const t = baseTask({ title: "Anything" });
    expect(taskMatchesSearchQuery(t, "")).toBe(true);
  });
});

describe("filterTaskIdsByQuery", () => {
  it("returns all ids when query empty", () => {
    const tasks = [baseTask({ id: "a" }), baseTask({ id: "b", title: "Other" })];
    const set = filterTaskIdsByQuery(tasks, "   ");
    expect(set.size).toBe(2);
    expect(set.has("a")).toBe(true);
  });

  it("filters by query", () => {
    const tasks = [
      baseTask({ id: "1", title: "Alpha" }),
      baseTask({ id: "2", title: "Beta", description: "alpha notes" }),
    ];
    const set = filterTaskIdsByQuery(tasks, "alpha");
    expect([...set].sort()).toEqual(["1", "2"]);
  });
});

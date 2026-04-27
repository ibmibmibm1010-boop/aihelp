import type { BoardColumnSection, TaskStatus } from "@shared/api";

export type KanbanColumn = {
  id: string;
  title: string;
  color: string;
  linkedStatus: TaskStatus;
  section: BoardColumnSection;
  sortOrder: number;
};

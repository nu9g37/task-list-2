import type { User } from "./user";

export interface Project {
  id: string;
  userId: User["id"];
  name: string;
  description: string | null;
  /** Project accent color in #RRGGBB format. */
  color: string;
  /** Sidebar order; lower values appear first. */
  position: number;
  /** Null means the project is active. */
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

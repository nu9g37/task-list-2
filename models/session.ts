import type { User } from "./user";

/** Persisted Better Auth `session` record, not a public session DTO. */
export interface Session {
  id: string;
  userId: User["id"];
  /** Unique session secret, managed by Better Auth. */
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

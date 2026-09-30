import type { User } from "./user";

/** Persisted Better Auth `account` record; credentials stay on the server. */
export interface Account {
  /** Local account row ID, distinct from the provider's accountId. */
  id: string;
  userId: User["id"];
  /** For email/password, this is the linked user's ID. */
  accountId: string;
  /** Email/password uses "credential". */
  providerId: string;
  /** Password hash managed by Better Auth, never plaintext. */
  password: string | null;
  // Core OAuth fields remain null for credential-only accounts.
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}

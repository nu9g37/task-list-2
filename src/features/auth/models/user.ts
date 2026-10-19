/** Better Auth `user` record, extended with Tasklist preferences. */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  /** Custom additionalField; IANA timezone. Use UTC when null. */
  timezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

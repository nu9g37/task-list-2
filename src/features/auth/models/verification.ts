/** Better Auth `verification` storage for temporary verification flows. */
export interface Verification {
  id: string;
  /** Flow-specific lookup key, not a userId foreign key. */
  identifier: string;
  /** Internal verification value; storage format is managed by Better Auth. */
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

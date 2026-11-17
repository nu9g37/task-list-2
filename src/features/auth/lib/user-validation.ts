export const MAX_USER_NAME_LENGTH = 200;
export const MAX_USER_IMAGE_URL_LENGTH = 2048;
export const MAX_USER_IMAGE_DATA_URL_LENGTH = 256 * 1024;

export class UserValidationError extends Error {}

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function hasWhitespaceOrControlChars(value: string): boolean {
  return hasControlChars(value) || /\s/.test(value);
}

export function parseUserName(value: unknown): string {
  if (typeof value !== "string") {
    throw new UserValidationError(
      `Name must contain 1–${MAX_USER_NAME_LENGTH} characters.`,
    );
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_USER_NAME_LENGTH) {
    throw new UserValidationError(
      `Name must contain 1–${MAX_USER_NAME_LENGTH} characters.`,
    );
  }
  if (hasControlChars(trimmed)) {
    throw new UserValidationError("Name contains invalid characters.");
  }
  return trimmed;
}

export function parseUserImage(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new UserValidationError(
      "Profile image must be a valid URL, uploaded image, or null.",
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (hasWhitespaceOrControlChars(trimmed)) {
    throw new UserValidationError("Profile image contains invalid characters.");
  }
  if (trimmed.slice(0, 5).toLowerCase() === "data:") {
    if (trimmed.length > MAX_USER_IMAGE_DATA_URL_LENGTH) {
      throw new UserValidationError("Profile image is too large.");
    }
    const match =
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
        trimmed,
      );
    if (!match || match[2].length % 4 !== 0) {
      throw new UserValidationError(
        "Profile image must be a JPG, PNG, or WebP image.",
      );
    }
    return `data:image/${match[1].toLowerCase()};base64,${match[2]}`;
  }
  if (trimmed.length > MAX_USER_IMAGE_URL_LENGTH) {
    throw new UserValidationError(
      `Profile image URL must be at most ${MAX_USER_IMAGE_URL_LENGTH} characters.`,
    );
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new UserValidationError(
      "Profile image must be a valid http(s) URL or uploaded image.",
    );
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    !url.hostname
  ) {
    throw new UserValidationError(
      "Profile image must be a valid http(s) URL or uploaded image.",
    );
  }
  return trimmed;
}

export function sanitizeUserCreate(input: {
  name?: unknown;
  image?: unknown;
}): { name: string; image?: string | null } {
  const sanitized: { name: string; image?: string | null } = {
    name: parseUserName(input.name),
  };
  if (input.image !== undefined) {
    sanitized.image = parseUserImage(input.image);
  }
  return sanitized;
}

export function sanitizeUserUpdate(input: {
  name?: unknown;
  image?: unknown;
}): { name?: string; image?: string | null } | undefined {
  const sanitized: { name?: string; image?: string | null } = {};
  if (input.name !== undefined) {
    sanitized.name = parseUserName(input.name);
  }
  if (input.image !== undefined) {
    sanitized.image = parseUserImage(input.image);
  }
  return Object.keys(sanitized).length ? sanitized : undefined;
}

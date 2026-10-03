import { ApiError } from "@/server/api";

export interface ProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  position?: number;
  archived?: boolean;
}

export function parseProjectOrder(body: Record<string, unknown>): string[] {
  const ids = body.projectIds;
  if (
    Object.keys(body).some((key) => key !== "projectIds") ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== "string" || !id || id.length > 200) ||
    new Set(ids).size !== ids.length
  ) {
    throw new ApiError(
      400,
      "projectIds must be a non-empty list of unique IDs",
    );
  }
  return ids;
}

export function parseProjectInput(
  body: Record<string, unknown>,
  update = false,
): ProjectInput {
  const allowed = [
    "name",
    "description",
    "color",
    "position",
    ...(update ? ["archived"] : []),
  ];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new ApiError(400, "Unsupported project field");
  }
  if (update && Object.keys(body).length === 0)
    throw new ApiError(400, "No fields to update");
  const input: ProjectInput = {};
  if (!update || Object.hasOwn(body, "name")) {
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 200
    ) {
      throw new ApiError(400, "name must contain 1–200 characters");
    }
    input.name = body.name.trim();
  }
  if (Object.hasOwn(body, "description")) {
    if (
      body.description !== null &&
      (typeof body.description !== "string" || body.description.length > 10_000)
    ) {
      throw new ApiError(
        400,
        "description must be a string up to 10000 characters or null",
      );
    }
    input.description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
  }
  if (Object.hasOwn(body, "color")) {
    if (typeof body.color !== "string" || !/^#[0-9a-f]{6}$/i.test(body.color)) {
      throw new ApiError(400, "color must use #RRGGBB format");
    }
    input.color = body.color.toUpperCase();
  }
  if (Object.hasOwn(body, "position")) {
    if (
      typeof body.position !== "number" ||
      !Number.isInteger(body.position) ||
      body.position < 0 ||
      body.position > 2_147_483_647
    ) {
      throw new ApiError(
        400,
        "position must be a non-negative PostgreSQL integer",
      );
    }
    input.position = body.position;
  }
  if (Object.hasOwn(body, "archived")) {
    if (typeof body.archived !== "boolean")
      throw new ApiError(400, "archived must be a boolean");
    input.archived = body.archived;
  }
  return input;
}

export function parseArchiveFilter(
  request: Request,
): "active" | "archived" | "all" {
  const value = new URL(request.url).searchParams.get("archived") ?? "false";
  if (value === "false") return "active";
  if (value === "true") return "archived";
  if (value === "all") return "all";
  throw new ApiError(400, "archived filter must be false, true or all");
}

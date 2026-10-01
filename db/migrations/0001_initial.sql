-- Run once in the new Tasklist database using pgAdmin's Query Tool.
-- Auth fields follow Better Auth's core schema (no optional auth plugins).
-- This SQL is hand-authored; compare it with the installed Better Auth
-- version's generated schema before enabling authentication.
-- Text IDs support Better Auth's default ID generation.

BEGIN;

CREATE TABLE public."user" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL DEFAULT false,
    "image" text,
    "timezone" text DEFAULT 'UTC',
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public."session" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."user" ("id") ON DELETE CASCADE,
    "token" text NOT NULL UNIQUE,
    "expiresAt" timestamptz NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_user_id_idx ON public."session" ("userId");

CREATE TABLE public."account" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."user" ("id") ON DELETE CASCADE,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    -- Better Auth writes the password hash; never insert a plaintext password.
    "password" text,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    "scope" text,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT account_provider_identity_unique UNIQUE ("providerId", "accountId")
);

CREATE INDEX account_user_id_idx ON public."account" ("userId");

CREATE TABLE public."verification" (
    "id" text PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_identifier_idx ON public."verification" ("identifier");

CREATE TABLE public.projects (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."user" ("id") ON DELETE RESTRICT,
    "name" text NOT NULL CHECK (length(btrim("name")) > 0),
    "description" text,
    "color" text NOT NULL DEFAULT '#245C45' CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$'),
    "position" integer NOT NULL DEFAULT 0 CHECK ("position" >= 0),
    "archivedAt" timestamptz,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    -- Required by the task ownership composite foreign key below.
    CONSTRAINT projects_id_user_id_unique UNIQUE ("id", "userId")
);

CREATE INDEX projects_sidebar_idx ON public.projects ("userId", "archivedAt", "position");

CREATE TABLE public.tasks (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES public."user" ("id") ON DELETE RESTRICT,
    "projectId" text,
    "title" text NOT NULL CHECK (length(btrim("title")) > 0),
    "description" text,
    "status" text NOT NULL DEFAULT 'TODO'
        CHECK ("status" IN ('TODO', 'DONE')),
    "priority" text NOT NULL DEFAULT 'MEDIUM'
        CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH')),
    -- A single deadline containing both date and time. Null = unscheduled.
    "dueAt" timestamptz,
    "completedAt" timestamptz,
    "position" integer NOT NULL DEFAULT 0 CHECK ("position" >= 0),
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tasks_completion_consistent CHECK (
        ("status" = 'DONE' AND "completedAt" IS NOT NULL)
        OR ("status" <> 'DONE' AND "completedAt" IS NULL)
    ),
    -- A task can only reference a project owned by the same user.
    -- MATCH SIMPLE permits a null projectId for personal tasks.
    -- Existing tasks block project deletion until explicitly moved/deleted.
    CONSTRAINT tasks_project_owner_fk FOREIGN KEY ("projectId", "userId")
        REFERENCES public.projects ("id", "userId")
        MATCH SIMPLE ON DELETE RESTRICT
);

CREATE INDEX tasks_calendar_idx ON public.tasks ("userId", "dueAt");
CREATE INDEX tasks_project_list_idx ON public.tasks ("userId", "projectId", "position");
CREATE INDEX tasks_completed_idx ON public.tasks ("userId", "status", "completedAt");

COMMIT;

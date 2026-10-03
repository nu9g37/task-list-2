-- Run once after 0002_remove_in_progress.sql.
-- Requires the task API to use the new column names before serving requests.
BEGIN;

LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;

-- Preserve existing project/personal ordering, its default, and its index.
ALTER TABLE public.tasks RENAME COLUMN "position" TO "positionProject";
ALTER TABLE public.tasks RENAME CONSTRAINT tasks_position_check
    TO tasks_position_project_check;

ALTER TABLE public.tasks ADD COLUMN "positionOverview" integer;

-- Match the previous overview ORDER BY position, id for each user.
-- Include archived projects so restoring them preserves their relative order.
WITH ordering AS (
    SELECT "id",
        (row_number() OVER (
            PARTITION BY "userId" ORDER BY "positionProject", "id"
        ) - 1)::integer AS "positionOverview"
    FROM public.tasks
)
UPDATE public.tasks AS task
SET "positionOverview" = ordering."positionOverview"
FROM ordering
WHERE task."id" = ordering."id";

ALTER TABLE public.tasks
    ALTER COLUMN "positionOverview" SET DEFAULT 0,
    ALTER COLUMN "positionOverview" SET NOT NULL,
    ADD CONSTRAINT tasks_position_overview_check CHECK ("positionOverview" >= 0);

CREATE INDEX tasks_overview_list_idx
    ON public.tasks ("userId", "positionOverview", "id");

COMMIT;

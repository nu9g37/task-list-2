-- Existing unfinished tasks remain unfinished after removing IN_PROGRESS.
BEGIN;
LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
UPDATE public.tasks SET "status" = 'TODO', "updatedAt" = now()
WHERE "status" = 'IN_PROGRESS';
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK ("status" IN ('TODO', 'DONE'));
COMMIT;

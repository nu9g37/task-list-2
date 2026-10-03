"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/layout/workspace-layout";
import {
  loadOverview,
  OverviewRequestError,
  updateOverviewTasks,
  type ApiTask,
  type OverviewData,
} from "./overview-data";

export function useOverview(initialData: OverviewData, projectId?: string) {
  const { revision, publish, subscribeProjects } = useWorkspace();
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const current = useRef(initialData);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const initialRevision = useRef(revision);
  const pending = useRef<AbortController | null>(null);
  const commit = useCallback(
    (value: OverviewData) => {
      current.current = value;
      setData(value);
      publish(value);
    },
    [publish],
  );
  useEffect(() => {
    publish(initialData);
  }, [initialData, publish]);
  useEffect(
    () =>
      subscribeProjects((change) => {
        // A late background response must not overwrite the saved project.
        const refreshing = pending.current !== null;
        pending.current?.abort();
        pending.current = null;
        const previous = current.current;
        const projects =
          "project" in change
            ? [
                ...previous.projects.filter((p) => p.id !== change.project.id),
                { ...change.project, tasks: 0, remaining: 0, progress: 0 },
              ]
            : previous.projects.map((p) => ({
                ...p,
                position:
                  change.order.indexOf(p.id) < 0
                    ? p.position
                    : change.order.indexOf(p.id),
              }));
        projects.sort(
          (a, b) => a.position - b.position || a.id.localeCompare(b.id),
        );
        commit(
          updateOverviewTasks({ ...previous, projects }, previous.allTasks),
        );
        if (refreshing) setAttempt((n) => n + 1);
      }),
    [subscribeProjects, commit],
  );
  useEffect(() => {
    if (revision === initialRevision.current && attempt === 0) return;
    const controller = new AbortController();
    pending.current = controller;
    loadOverview(controller.signal, fetch, projectId)
      .then((value) => {
        if (!controller.signal.aborted) {
          pending.current = null;
          commit(value);
          setError(false);
        }
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        pending.current = null;
        if (failure instanceof OverviewRequestError && failure.status === 401)
          router.replace("/sign-in");
        else setError(true);
      });
    return () => controller.abort();
  }, [revision, attempt, projectId, commit, router]);
  function updateTasks(transform: (tasks: ApiTask[]) => ApiTask[]) {
    const refreshing = pending.current !== null;
    pending.current?.abort();
    pending.current = null;
    commit(
      updateOverviewTasks(current.current, transform(current.current.allTasks)),
    );
    setError(false);
    if (refreshing) setAttempt((n) => n + 1);
  }
  function saveTask(task: ApiTask) {
    updateTasks((tasks) => [...tasks.filter((t) => t.id !== task.id), task]);
  }
  return {
    data,
    error,
    retry: () => setAttempt((n) => n + 1),
    updateTasks,
    saveTask,
  };
}

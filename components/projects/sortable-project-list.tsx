"use client";

import { Fragment, useRef, useState } from "react";
import { useWorkspace } from "@/components/layout/workspace-layout";
import type { OverviewProject } from "@/components/overview/overview-data";
import { ProjectNavItem } from "./project-nav-item";
import styles from "@/components/overview/overview.module.css";

export function SortableProjectList({
  projects,
  activeProjectId,
}: {
  projects: OverviewProject[];
  activeProjectId?: string;
}) {
  const { reorderProjects, reordering } = useWorkspace();
  const [drag, setDrag] = useState<{
    id: string;
    index: number;
    height: number;
  }>();
  const [message, setMessage] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const sorted = [...projects].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const remaining = sorted.filter((project) => project.id !== drag?.id);

  async function move(id: string, index: number) {
    const ids = sorted.map((project) => project.id);
    const from = ids.indexOf(id);
    if (from < 0 || from === index) return;
    ids.splice(from, 1);
    ids.splice(index, 0, id);
    setMessage("");
    try {
      await reorderProjects(ids);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save project order.",
      );
    }
  }

  return (
    <>
      <div
        ref={list}
        className={styles.sortableProjects}
        aria-label="Projects, drag to reorder or use Alt and arrow keys"
        aria-busy={reordering}
        onDragOver={(event) => {
          if (!drag || !list.current) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          // Fixed slots keep the gap stable while the rows move around it.
          const top = list.current.getBoundingClientRect().top;
          const index = Math.max(
            0,
            Math.min(
              remaining.length,
              Math.floor((event.clientY - top) / (drag.height + 4)),
            ),
          );
          if (index !== drag.index) setDrag({ ...drag, index });
        }}
        onDrop={(event) => {
          if (!drag) return;
          event.preventDefault();
          void move(drag.id, drag.index);
          setDrag(undefined);
        }}
        onDragEnd={() => setDrag(undefined)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setDrag(undefined);
        }}
      >
        {sorted.map((project) => {
          const isDragging = drag?.id === project.id;
          const index = remaining.findIndex((item) => item.id === project.id);
          return (
            <Fragment key={project.id}>
              {drag && !isDragging && index === drag.index && (
                <div
                  className={styles.projectDropGap}
                  style={{ height: drag.height }}
                  aria-hidden="true"
                />
              )}
              <div
                className={
                  isDragging
                    ? styles.projectDragSource
                    : styles.projectDraggable
                }
                draggable={!reordering && projects.length > 1}
                tabIndex={projects.length > 1 ? 0 : undefined}
                aria-label={`Reorder ${project.name}. Use Alt and Up or Down arrow.`}
                onDragStart={(event) => {
                  if (
                    reordering ||
                    (event.target as HTMLElement).closest("button")
                  ) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", project.id);
                  event.dataTransfer.setDragImage(event.currentTarget, 20, 20);
                  setMessage("");
                  setDrag({
                    id: project.id,
                    index: sorted.findIndex((item) => item.id === project.id),
                    height: event.currentTarget.getBoundingClientRect().height,
                  });
                }}
                onKeyDown={(event) => {
                  if (
                    reordering ||
                    !event.altKey ||
                    !["ArrowUp", "ArrowDown"].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const from = sorted.findIndex(
                    (item) => item.id === project.id,
                  );
                  void move(
                    project.id,
                    Math.max(
                      0,
                      Math.min(
                        sorted.length - 1,
                        from + (event.key === "ArrowUp" ? -1 : 1),
                      ),
                    ),
                  );
                }}
              >
                <ProjectNavItem
                  project={project}
                  active={activeProjectId === project.id}
                />
              </div>
            </Fragment>
          );
        })}
        {drag && drag.index === remaining.length && (
          <div
            className={styles.projectDropGap}
            style={{ height: drag.height }}
            aria-hidden="true"
          />
        )}
      </div>
      {message && (
        <p className={styles.projectOrderMessage} role="status">
          {message}
        </p>
      )}
    </>
  );
}

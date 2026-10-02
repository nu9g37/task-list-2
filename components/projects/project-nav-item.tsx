"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/components/layout/workspace-layout";
import type { OverviewProject } from "@/components/overview/overview-data";
import { ProjectForm } from "./project-form";
import { DeleteProjectDialog } from "./delete-project-dialog";
import styles from "@/components/overview/overview.module.css";

export function ProjectNavItem({
  project,
  active,
}: {
  project: OverviewProject;
  active: boolean;
}) {
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<"edit" | "delete">();
  const { projectChanged } = useWorkspace();
  useEffect(() => {
    function hide() {
      menu.current?.hidePopover();
    }
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);
  function openAction(value: "edit" | "delete") {
    menu.current?.hidePopover();
    setAction(value);
  }
  return (
    <>
      <div
        className={`${styles.projectNavRow} ${active ? styles.navActive : ""}`}
      >
        <Link
          href={`/projects/${encodeURIComponent(project.id)}`}
          className={styles.projectNavItem}
          aria-current={active ? "page" : undefined}
        >
          <span className={styles.dot} style={{ background: project.color }} />
          <span className={styles.projectNavName}>{project.name}</span>
        </Link>
        <span className={styles.projectNavActions}>
          <span className={styles.projectCount}>{project.tasks}</span>
          <button
            ref={trigger}
            type="button"
            className={styles.projectMenuTrigger}
            popoverTarget={menuId}
            aria-label={`More options for ${project.name}`}
            onClick={() => {
              if (!trigger.current || !menu.current) return;
              const rect = trigger.current.getBoundingClientRect();
              menu.current.style.top = `${rect.bottom + 100 > window.innerHeight ? Math.max(8, rect.top - 96) : rect.bottom + 4}px`;
              menu.current.style.left = `${Math.max(8, Math.min(rect.right - 136, window.innerWidth - 144))}px`;
            }}
          >
            <Icon name="more" size={16} />
          </button>
        </span>
        <div ref={menu} id={menuId} popover="auto" className={styles.taskMenu}>
          <button type="button" onClick={() => openAction("edit")}>
            Edit
          </button>
          <button
            type="button"
            className={styles.deleteMenuItem}
            onClick={() => openAction("delete")}
          >
            Delete
          </button>
        </div>
      </div>
      {action === "edit" && (
        <ProjectForm
          project={project}
          onClose={() => setAction(undefined)}
          onCreated={() => projectChanged()}
        />
      )}
      {action === "delete" && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setAction(undefined)}
          onDeleted={() => projectChanged(project.id)}
        />
      )}
    </>
  );
}

import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { OverviewProject } from "./overview-data";
import styles from "./overview.module.css";

function ProjectCard({ project }: { project: OverviewProject }) {
  return <article className={styles.projectCard}><div className={styles.projectCardHeader}><span className={styles.projectIcon} style={{ color: project.color }}><Icon name="folder" size={18} /></span><h3><Link href={`/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link></h3><button type="button" disabled className={styles.iconButton} aria-label={`More options for ${project.name}`}><Icon name="more" size={16} /></button></div><p>{project.tasks} tasks · {project.remaining} remaining</p><ProgressBar value={project.progress} label={`${project.name} completion`} color={project.color} /><p>{project.progress}% complete</p></article>;
}
export function ProjectCards({ projects }: { projects: OverviewProject[] }) {
  return <section className={styles.projectsSection} aria-labelledby="projects-heading"><div className={styles.projectsHeading}><h2 id="projects-heading">Your projects</h2></div>{projects.length ? <div className={styles.projectGrid}>{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <p className={styles.emptyState}>No projects yet.</p>}</section>;
}

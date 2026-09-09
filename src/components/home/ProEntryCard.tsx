import styles from "./HomeProductPreview.module.css";
import { homePreviewCopy } from "./homePreviewCopy";

export function ProEntryCard() {
  const copy = homePreviewCopy.pro;

  return (
    <article
      id="pro"
      aria-labelledby="pro-entry-title"
      className={`scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface shadow-card ${styles.proCard}`}
    >
      <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.38fr)]">
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] tracking-[0.22em] text-accent">{copy.eyebrow}</p>
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-muted">
              {copy.status}
            </span>
          </div>
          <h2 id="pro-entry-title" className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{copy.tagline}</p>

          <ul className="mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {copy.capabilities.map((capability) => (
              <li key={capability} className="border-t border-border pt-2.5 text-sm font-medium leading-snug">
                {capability}
              </li>
            ))}
          </ul>
        </div>

        <section className={`${styles.proVisual} p-4 sm:p-6`} aria-labelledby="pro-preview-label">
          <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.12em] text-muted">
            <span id="pro-preview-label">{copy.preview.flowLabel}</span>
            <span>{copy.preview.conceptLabel}</span>
          </div>

          <div className={styles.sourceGrid} aria-hidden="true">
            {copy.sources.map((source) => (
              <div key={source} className={styles.sourceCard}>
                <div className={styles.sourceName}>{source}</div>
              </div>
            ))}
          </div>

          <div className={styles.workspace}>
            <div className={styles.workspaceHeader}>
              <div className={styles.workspaceHeaderTitle}>
                <span className={styles.workspaceMark}>{copy.preview.workspaceMark}</span>
                <span>{copy.preview.workspaceTitle}</span>
              </div>
              <span className={styles.workspaceState}>{copy.preview.workspaceState}</span>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

import Link from "next/link";
import styles from "./HomeProductPreview.module.css";
import { homePreviewCopy } from "./homePreviewCopy";

export function StudioEntryCard() {
  const copy = homePreviewCopy.studio;

  return (
    <article
      id="studio"
      aria-labelledby="studio-entry-title"
      className={`scroll-mt-24 rounded-2xl border border-border bg-surface shadow-card p-6 flex h-full min-h-[26rem] flex-col gap-4 md:col-span-2 lg:col-span-1 ${styles.studioCard}`}
    >
      <div className={styles.cardIntro}>
        <p className="mb-1 font-mono text-[10px] tracking-[0.22em] text-accent">{copy.eyebrow}</p>
        <h2 id="studio-entry-title" className="text-xl font-semibold tracking-tight">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{copy.description}</p>
      </div>

      <div className={`${styles.studioStage} mt-auto`} aria-hidden="true">
        <div className={styles.stageHeader}>
          <span>{copy.visual.system}</span>
          <span>{copy.status}</span>
        </div>

        <div className={styles.studioFlow}>
          {copy.visual.modules.map(([label, action], index) => (
            <div key={label} className={styles.studioFlowItem}>
              <div className={styles.studioModule}>
                <span>{label}</span>
                <strong>{action}</strong>
              </div>
              {index < copy.visual.modules.length - 1 && <span className={styles.studioLink} />}
            </div>
          ))}
        </div>
      </div>
      <Link href="/studio" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        Explore Carbadia Studio
      </Link>
    </article>
  );
}

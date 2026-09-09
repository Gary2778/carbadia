"use client";

import { useEffect, useRef } from "react";
import type { StudioContent, StudioTechnology } from "./content";
import { TechnologyImage } from "./TechnologyImage";
import styles from "./StudioPage.module.css";

export function TechnologyDialog({ technology, copy, onClose, onInquire }: {
  technology: StudioTechnology | null;
  copy: StudioContent;
  onClose: () => void;
  onInquire: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (technology && dialog && !dialog.open) {
      dialog.showModal();
      dialog.scrollTop = 0;
    }
    if (!technology && dialog?.open) dialog.close();
  }, [technology]);

  return (
    <dialog ref={ref} id="studio-technology-dialog" data-studio-dialog className={`${styles.studio} ${styles.dialog}`} lang={copy.locale} dir="ltr" aria-labelledby="studio-technology-title" onClose={onClose}>
      <div className={styles.dialogControls}>
        <button type="button" className={styles.closeButton} onClick={() => ref.current?.close()} aria-label={copy.technologies.close}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
      {technology && <>
        <div className={styles.dialogCover}>
          <TechnologyImage kind={technology.kind} sizes="(max-width: 760px) calc(100vw - 26px), (max-width: 840px) calc(100vw - 42px), 798px" detail />
        </div>
        <div className={styles.dialogContent}>
          <p className={styles.sectionLabel}>{technology.category}</p>
          <h2 id="studio-technology-title">{technology.name}</h2>
          <p className={styles.dialogSummary}>{technology.summary}</p>
          <h3>{copy.technologies.ambition}</h3><p>{technology.ambition}</p>
          <h3>{copy.technologies.questions}</h3>
          <ul>{technology.questions.map(question => <li key={question}>{question}</li>)}</ul>
          <h3>{copy.technologies.boundary}</h3><p>{technology.boundary}</p>
          <div className={styles.nextStep}><h3>{copy.technologies.next}</h3><p>{technology.nextStep}</p></div>
          <a href="#studio-inquiry" className={styles.primaryButton} onClick={() => { onInquire(technology.id); ref.current?.close(); }}>{copy.technologies.inquire}</a>
          <div className={styles.reference}>
            <h3>{copy.technologies.reference}</h3>
            <a href={technology.reference.href} target="_blank" rel="noreferrer">{technology.reference.title}<span aria-hidden="true"> ↗</span></a>
            <p>{copy.technologies.referenceNote}</p>
          </div>
        </div>
      </>}
    </dialog>
  );
}

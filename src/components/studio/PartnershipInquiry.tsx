"use client";

import { useState, type FormEvent } from "react";
import { ContactEmail } from "@/components/ContactEmail";
import type { StudioContent } from "./content";
import { createInquiryMailto } from "./inquiry";
import styles from "./StudioPage.module.css";

export function PartnershipInquiry({ copy, topic, onTopicChange }: {
  copy: StudioContent["inquiry"];
  topic: string;
  onTopicChange: (topic: string) => void;
}) {
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{ href: string; topic: string; copy: StudioContent["inquiry"] } | null>(null);
  const [error, setError] = useState(false);
  const topicLabel = copy.options.find(option => option.value === topic)?.label ?? topic;
  const contextChanged = prepared && (prepared.topic !== topic || prepared.copy !== copy);
  if (contextChanged) setPrepared(null);
  const draft = contextChanged ? null : prepared?.href;

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) { setError(true); return; }
    setError(false);
    setPrepared({ href: createInquiryMailto({ topic: topicLabel, organization, message }), topic, copy });
  }

  return (
    <section id="studio-inquiry" className={styles.inquiry} tabIndex={-1} aria-labelledby="studio-inquiry-title">
      <div className={styles.inquiryIntro}>
        <h2 id="studio-inquiry-title">{copy.title}</h2>
        <p>{copy.intro}</p>
        <div className={styles.directContact}><span>{copy.direct}</span><ContactEmail /></div>
      </div>
      <div>
        <form onSubmit={prepare} className={styles.inquiryForm}>
          <div className={styles.formRow}>
            <label>{copy.topic}
              <select value={topic} onChange={event => { onTopicChange(event.target.value); setPrepared(null); }}>
                {copy.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>{copy.company} <span className={styles.optional}>({copy.optional})</span>
              <input value={organization} onChange={event => { setOrganization(event.target.value); setPrepared(null); }} name="organization" autoComplete="organization" maxLength={120} placeholder={copy.companyPlaceholder} />
            </label>
          </div>
          <label>{copy.message}
            <textarea value={message} onChange={event => { setMessage(event.target.value); setPrepared(null); setError(false); }} name="brief" required maxLength={1200} rows={4} placeholder={copy.messagePlaceholder} aria-invalid={error || undefined} aria-describedby={error ? "studio-inquiry-error" : undefined} />
          </label>
          {error && <p id="studio-inquiry-error" role="alert" className={styles.formError}>{copy.error}</p>}
          <div className={styles.formAction}><button className={styles.primaryButton} type="submit">{copy.prepare}</button><p>{copy.note}</p></div>
        </form>
        {draft && <div className={styles.draft}>
          <p className={styles.draftTitle} role="status">{copy.ready}</p><p>{copy.readyNote}</p>
          <pre>{new URL(draft).searchParams.get("body")}</pre>
          <div className={styles.buttonRow}><a className={styles.primaryButton} href={draft}>{copy.open}</a><button className={styles.textButton} type="button" onClick={() => setPrepared(null)}>{copy.edit}</button></div>
        </div>}
      </div>
    </section>
  );
}

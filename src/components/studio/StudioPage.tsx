"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { ProductPageHeader } from "@/components/ProductPageHeader";
import { getStudioContent } from "./content";
import { TechnologyImage } from "./TechnologyImage";
import { TechnologyDialog } from "./TechnologyDialog";
import { PartnershipInquiry } from "./PartnershipInquiry";
import styles from "./StudioPage.module.css";

function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function StudioPage() {
  const { lang } = useLang();
  const copy = getStudioContent(lang === "zh-TW" ? "zh-TW" : "en");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topic, setTopic] = useState("investment");
  const [priority, ...futureTechnologies] = copy.technologies.items;

  return (
    <div className="space-y-10" lang={copy.locale} dir="ltr">
      <ProductPageHeader id="studio-top" eyebrow="STUDIO" title={copy.hero.title} description={copy.hero.description} />
      <div className={styles.studio}>
        <nav className={styles.studioNav} aria-label="Studio">
          <a href="#studio-direction">{copy.nav.direction}</a>
          <a href="#studio-projects">{copy.nav.technology}</a>
          <a href="#studio-funding">{copy.nav.funding}</a>
          <a href="#studio-progress">{copy.nav.progress}</a>
          <a href="#studio-partnerships">{copy.nav.partnerships}</a>
        </nav>

        <section id="studio-direction" className={styles.direction} aria-labelledby="studio-direction-title">
          <div className={styles.directionIntro}>
            <p className={styles.sectionLabel}>{copy.direction.label}</p>
            <h2 id="studio-direction-title">{copy.direction.title}</h2>
            <p className={styles.directionDescription}>{copy.direction.description}</p>
            <div className={styles.buttonRow}>
              <a href="#studio-inquiry" className={styles.primaryButton} onClick={() => setTopic("investment")}>{copy.direction.investment}</a>
              <a href="#studio-projects" className={styles.textLink}>{copy.direction.explore}<Arrow /></a>
            </div>
          </div>
          <aside className={styles.currentStage} aria-labelledby="studio-current-stage">
            <p className={styles.sectionLabel}>{copy.direction.stageLabel}</p>
            <h3 id="studio-current-stage">{copy.direction.stage}</h3>
            <p>{copy.direction.stageText}</p>
          </aside>
          <div className={styles.pillars}>
            {copy.direction.pillars.map(pillar => <div key={pillar.title}><h3>{pillar.title}</h3><p>{pillar.text}</p></div>)}
          </div>
        </section>

        <section id="studio-projects" className={styles.technologies} aria-labelledby="studio-technologies-title">
          <div className={styles.sectionIntro}><h2 id="studio-technologies-title">{copy.technologies.title}</h2><p>{copy.technologies.intro}</p></div>
          <button type="button" className={styles.featuredTechnology} onClick={() => setSelectedId(priority.id)} aria-haspopup="dialog" aria-controls="studio-technology-dialog" aria-label={`${copy.technologies.read}: ${priority.name}`}>
            <div className={styles.featuredArt}>
              <TechnologyImage kind={priority.kind} sizes="(max-width: 760px) calc(100vw - 42px), (max-width: 1280px) 52vw, 654px" />
            </div>
            <div className={styles.featuredText}>
              <span className={styles.status}>{copy.technologies.priority}</span>
              <h3>{priority.name}</h3>
              <p>{priority.summary}</p>
              <span className={styles.cardAction}>{copy.technologies.read}<Arrow /></span>
            </div>
          </button>
          <div className={styles.technologyGrid}>
            {futureTechnologies.map(technology => <button type="button" className={styles.technologyCard} key={technology.id} onClick={() => setSelectedId(technology.id)} aria-haspopup="dialog" aria-controls="studio-technology-dialog" aria-label={`${copy.technologies.read}: ${technology.name}`}>
              <div className={styles.technologyCardArt}>
                <TechnologyImage kind={technology.kind} sizes="(max-width: 500px) calc(100vw - 42px), (max-width: 1100px) calc(50vw - 30px), (max-width: 1280px) calc(25vw - 24px), 298px" />
              </div>
              <div className={styles.technologyCardBody}>
                <div className={styles.cardTop}>{copy.technologies.future}</div>
                <h3>{technology.name}</h3>
                <p>{technology.summary}</p>
                <span className={styles.cardAction}>{copy.technologies.read}<Arrow /></span>
              </div>
            </button>)}
          </div>
        </section>

        <section id="studio-funding" className={styles.funding} aria-labelledby="studio-funding-title">
          <div className={styles.fundingIntro}>
            <h2 id="studio-funding-title">{copy.funding.title}</h2>
            <p>{copy.funding.intro}</p>
            <a href="#studio-inquiry" className={styles.primaryButton} onClick={() => setTopic("investment")}>{copy.funding.action}</a>
          </div>
          <div className={styles.fundingItems}>
            {copy.funding.items.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}
          </div>
        </section>

        <section id="studio-progress" className={styles.progress} aria-labelledby="studio-progress-title">
          <div className={styles.sectionIntro}><h2 id="studio-progress-title">{copy.progress.title}</h2><p>{copy.progress.intro}</p></div>
          <ol className={styles.progressStages}>
            {copy.progress.stages.map((stage, index) => <li key={stage.title} className={stage.current ? styles.activeStage : undefined} aria-current={stage.current ? "step" : undefined}>
              <div className={styles.stageTrack}><span aria-hidden="true">{index + 1}</span><p>{stage.timing}</p></div>
              <h3>{stage.title}</h3><p>{stage.text}</p>
              <span className={stage.current ? styles.status : styles.futureStatus}>{stage.status}</span>
            </li>)}
          </ol>
          <p className={styles.progressNote}>{copy.progress.updates}</p>
        </section>

        <section id="studio-partnerships" className={styles.partnerships} aria-labelledby="studio-partnerships-title">
          <div className={styles.sectionIntro}><h2 id="studio-partnerships-title">{copy.partnerships.title}</h2><p>{copy.partnerships.intro}</p></div>
          <div className={styles.partnerRoutes}>
            {copy.partnerships.routes.map(route => <div key={route.topic}><h3>{route.title}</h3><p>{route.text}</p><a href="#studio-inquiry" className={styles.textLink} onClick={() => setTopic(route.topic)}>{route.action}<Arrow /></a></div>)}
          </div>
          <div id="studio-build" className={styles.build}>
            <div><h3>{copy.partnerships.buildTitle}</h3><p>{copy.partnerships.buildText}</p></div>
            <a href="#studio-inquiry" className={styles.textLink} onClick={() => setTopic("new-project")}>{copy.partnerships.buildAction}<Arrow /></a>
          </div>
        </section>

        <PartnershipInquiry copy={copy.inquiry} topic={topic} onTopicChange={setTopic} />
        <div className={styles.community}><div><h2>{copy.community.title}</h2><p>{copy.community.description}</p></div><span>{copy.community.status}</span></div>
        <TechnologyDialog technology={copy.technologies.items.find(technology => technology.id === selectedId) ?? null} copy={copy} onClose={() => setSelectedId(null)} onInquire={setTopic} />
      </div>
    </div>
  );
}

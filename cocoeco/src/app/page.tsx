"use client";

import { useDict } from "@/i18n/I18nProvider";
import { SceneSection } from "@/components/SceneSection";
import { KnowledgeCard } from "@/components/KnowledgeCard";
import { BigLines, CopyBlock, CreedLines, HintTag, Principles } from "@/components/blocks";
import { CtaLink } from "@/components/CtaLink";
import { RatingStamp } from "@/components/RatingStamp";
import { Footer } from "@/components/Footer";
import { TopNav } from "@/components/TopNav";
import { ProgressBar } from "@/components/ProgressBar";
import { EmailForm } from "@/components/EmailForm";
import { parseEmphasis } from "@/components/emphasis";

export default function Home() {
  const dict = useDict();
  const { scenes, common, ui } = dict;

  return (
    <main>
      <TopNav />
      <ProgressBar />
      {/* 第 0 幕 · 序幕 */}
      <SceneSection id="prologue" seoTitle={scenes.prologue.seoTitle} narration={scenes.prologue.narration} heroHeading>
        <BigLines lines={scenes.prologue.bigLines!} />
        {scenes.prologue.blocks!.map((b) => (
          <CopyBlock key={b.lines[0]} heading={b.heading} lines={b.lines} />
        ))}
        <div className="flex flex-wrap gap-3">
          <HintTag text={ui.hintDrag} />
          <HintTag text={ui.hintScroll} />
        </div>
      </SceneSection>

      {/* 第 1 幕 · 卧室 */}
      <SceneSection id="bedroom" seoTitle={scenes.bedroom.seoTitle} narration={scenes.bedroom.narration} transition={scenes.bedroom.transition}>
        <HintTag text={scenes.bedroom.interactionHint!} />
        <div className="flex flex-col gap-3">
          {scenes.bedroom.cards!.map((c) => (
            <KnowledgeCard key={c.title} {...c} />
          ))}
        </div>
        <BigLines lines={scenes.bedroom.turning!} />
      </SceneSection>

      {/* 第 2 幕 · 城市 */}
      <SceneSection id="city" seoTitle={scenes.city.seoTitle} narration={scenes.city.narration} transition={scenes.city.transition}>
        <BigLines lines={scenes.city.bigLines!} ledger />
        <HintTag text={scenes.city.interactionHint!} />
        <div className="flex flex-col gap-3">
          {scenes.city.cards!.map((c) => (
            <KnowledgeCard key={c.title} {...c} />
          ))}
        </div>
        <BigLines lines={scenes.city.turning!} />
      </SceneSection>

      {/* 第 3 幕 · 大气层(愿景) */}
      <SceneSection id="atmosphere" seoTitle={scenes.atmosphere.seoTitle} narration={scenes.atmosphere.narration} transition={scenes.atmosphere.transition}>
        {scenes.atmosphere.blocks!.map((b) => (
          <CopyBlock key={b.lines[0]} heading={b.heading} lines={b.lines} />
        ))}
        <BigLines lines={scenes.atmosphere.bigLines!} ledger />
        <BigLines lines={scenes.atmosphere.turning!} />
        <CreedLines creed={common.creed} />
        <Principles creed={common.creed} bodies={scenes.atmosphere.principles!} />
      </SceneSection>

      {/* 第 4 幕 · 森林与海 */}
      <SceneSection id="forestSea" seoTitle={scenes.forestSea.seoTitle} narration={scenes.forestSea.narration} transition={scenes.forestSea.transition}>
        <HintTag text={scenes.forestSea.interactionHint!} />
        <div className="flex flex-col gap-3">
          {scenes.forestSea.cards!.map((c) => (
            <KnowledgeCard key={c.title} {...c} />
          ))}
        </div>
        <BigLines lines={scenes.forestSea.turning!} />
      </SceneSection>

      {/* 第 5 幕 · 市场(Carbadia) */}
      <SceneSection id="market" seoTitle={scenes.market.seoTitle} narration={scenes.market.narration} transition={scenes.market.transition}>
        {scenes.market.blocks!.map((b) => (
          <CopyBlock key={b.lines[0]} heading={b.heading} lines={b.lines} />
        ))}
        <ul className="flex flex-col gap-3">
          {scenes.market.features!.map((f) => (
            <li key={f.name} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-5 py-4">
              <p className="mb-1 font-semibold text-[var(--accent)]">{f.name}</p>
              <p className="text-[0.95rem] leading-relaxed">{f.detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm opacity-60">{scenes.market.featuresNote}</p>
        <p className="rounded-md border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--gold)]">
          {common.disclaimer}
        </p>
        <div>
          <CtaLink label={scenes.market.ctas![0].label} kind="exchange" />
        </div>
        <HintTag text={scenes.market.interactionHint!} />
      </SceneSection>

      {/* 第 6 幕 · 评级所(CCRC) */}
      <SceneSection id="rating" seoTitle={scenes.rating.seoTitle} narration={scenes.rating.narration} transition={scenes.rating.transition}>
        <BigLines lines={scenes.rating.turning!} />
        {scenes.rating.blocks!.map((b) => (
          <CopyBlock key={b.lines[0]} heading={b.heading} lines={b.lines} />
        ))}
        <p>
          <a href="https://carbadia.io" target="_blank" rel="noopener" className="text-[var(--accent)] underline underline-offset-4">
            {scenes.rating.ratingLink}
          </a>
        </p>
        <ol className="flex flex-col gap-3">
          {scenes.rating.gates!.map((g, i) => (
            <li key={g.name} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-5 py-4">
              <p className="mb-1 font-semibold">
                <span className="ledger-num me-2 text-[var(--accent)]">{i + 1}</span>
                {g.name}
              </p>
              <p className="text-[0.95rem] leading-relaxed">{g.desc}</p>
            </li>
          ))}
        </ol>
        <RatingStamp />
        <p className="text-sm opacity-60">{common.ratingDisclaimer}</p>
      </SceneSection>

      {/* 第 7 幕 · 新生(roadmap) */}
      <SceneSection id="rebirth" seoTitle={scenes.rebirth.seoTitle} narration={scenes.rebirth.narration} transition={scenes.rebirth.transition}>
        <div className="flex flex-col gap-2">
          {scenes.rebirth.fates!.map((line) => (
            <p key={line} className="leading-relaxed">{line}</p>
          ))}
        </div>
        <BigLines lines={scenes.rebirth.choice!} />
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-5 py-5">
          <p className="voice text-lg font-medium">{scenes.rebirth.roadmap!.heading}</p>
          {(
            [
              [scenes.rebirth.roadmap!.doneLabel, scenes.rebirth.roadmap!.done],
              [scenes.rebirth.roadmap!.doingLabel, scenes.rebirth.roadmap!.doing],
              [scenes.rebirth.roadmap!.plannedLabel, scenes.rebirth.roadmap!.planned],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <p className="mb-1 text-sm font-semibold text-[var(--accent)]">{label}</p>
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item} className="text-[0.95rem] leading-relaxed">· {item}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-sm opacity-70">
            {scenes.rebirth.roadmap!.noteBefore}
            {common.creed.join("、")}
            {scenes.rebirth.roadmap!.noteAfter}
          </p>
        </div>
      </SceneSection>

      {/* 第 8 幕 · 营地(行动/社区/关于/联系) */}
      <SceneSection id="camp" seoTitle={scenes.camp.seoTitle} narration={scenes.camp.narration} transition={scenes.camp.transition}>
        <div className="flex flex-col gap-3">
          <p className="voice text-lg font-medium">{scenes.camp.actionsHeading}</p>
          {scenes.camp.actions!.map((a) => (
            <div key={a.name} className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)]/40 px-5 py-4">
              <p className="mb-1 font-semibold">
                {a.name}
                <span className="ms-2 rounded-full border border-[var(--gold)]/60 px-2 py-0.5 text-xs text-[var(--gold)]">
                  {a.status}
                </span>
              </p>
              <p className="text-[0.95rem] leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
        <EmailForm />
        <div className="flex flex-col gap-3">
          <p className="voice text-lg font-medium">{scenes.camp.aboutHeading}</p>
          {scenes.camp.aboutLines!.map((line) => (
            <p key={line} className="leading-relaxed">{parseEmphasis(line)}</p>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <p className="voice text-lg font-medium">{scenes.camp.teamHeading}</p>
          <ul className="grid grid-cols-2 gap-3">
            {scenes.camp.team!.map((m, i) => (
              <li key={i} className="rounded-lg border border-dashed border-[var(--card-border)] px-4 py-3 text-sm opacity-80">
                <p className="font-medium">{m.name}</p>
                <p className="opacity-70">{m.role}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <p className="voice text-lg font-medium">{scenes.camp.contactHeading}</p>
          {scenes.camp.contactLines!.map((line) => (
            <p key={line} className="leading-relaxed">{line}</p>
          ))}
          <p className="ledger-num text-lg text-[var(--accent)]">{scenes.camp.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {scenes.camp.ctas!.map((c) => (
            <CtaLink key={c.label} label={c.label} kind={c.kind} />
          ))}
        </div>
      </SceneSection>

      {/* 第 9 幕 · 终幕(黎明) */}
      <SceneSection id="dawn" seoTitle={scenes.dawn.seoTitle} narration={scenes.dawn.narration}>
        <p className="voice text-end text-lg opacity-80">{scenes.dawn.signature}</p>
        <div className="flex flex-wrap items-center gap-4">
          <p className="voice text-xl font-medium">{scenes.dawn.finalCta}</p>
          <CtaLink label="carbadia.io" kind="exchange" />
          <CtaLink label={scenes.camp.email!} kind="email" />
        </div>
      </SceneSection>

      <Footer />
    </main>
  );
}

"use client";

import { useDict } from "@/i18n/I18nProvider";
import { SceneSection } from "@/components/SceneSection";
import { KnowledgeCard } from "@/components/KnowledgeCard";
import { BigLines, CopyBlock, CreedLines, HintTag, Principles } from "@/components/blocks";

export default function Home() {
  const dict = useDict();
  const { scenes, common, ui } = dict;

  return (
    <main>
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
    </main>
  );
}

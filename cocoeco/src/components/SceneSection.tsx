import type { ReactNode } from "react";
import type { SceneId } from "@/scenes/registry";
import { SCENE_THEME } from "@/scenes/registry";
import { parseEmphasis } from "./emphasis";

export function SceneSection({
  id,
  seoTitle,
  narration,
  heroHeading = false,
  children,
  transition,
}: {
  id: SceneId;
  seoTitle: string;
  narration: string[];
  heroHeading?: boolean;
  children?: ReactNode;
  transition?: string;
}) {
  const theme = SCENE_THEME[id];
  const Heading = heroHeading ? "h1" : "h2";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={theme.ink === "dark" ? "scene-ink-dark" : undefined}
      style={{ backgroundColor: theme.bg }}
    >
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-24">
        <Heading
          id={`${id}-title`}
          className="voice text-3xl font-semibold leading-snug sm:text-4xl"
        >
          {seoTitle}
        </Heading>

        <div className="flex flex-col gap-4">
          {narration.map((line) => (
            <p key={line} className="voice text-lg leading-relaxed sm:text-xl">
              {parseEmphasis(line)}
            </p>
          ))}
        </div>

        {children}

        {transition ? (
          <p className="voice mt-8 border-s-2 border-[var(--accent)] ps-4 text-sm italic opacity-60">
            {transition}
          </p>
        ) : null}
      </div>
    </section>
  );
}

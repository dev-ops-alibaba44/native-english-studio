import Image from "next/image";
import {
  FOUNDER,
  PERSONAL_STORY_PARAGRAPHS,
  PERSONAL_STORY_SIGNOFF,
} from "@/lib/site-content";
import { CalligraphyMark } from "./CalligraphyMark";

export function PersonalStorySection() {
  return (
    <section
      id="my-story"
      className="relative scroll-mt-20 overflow-hidden bg-surface py-16 sm:py-20"
    >
      <CalligraphyMark
        char="旅"
        className="absolute -right-6 -top-10 text-[220px] leading-none sm:text-[320px]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <Image
            src={FOUNDER.photoStory}
            alt={FOUNDER.nameZh}
            width={700}
            height={900}
            className="w-full max-w-xs rounded object-cover shadow-card"
          />
          <div className="mt-4">
            <div className="font-display text-base font-bold text-ink">
              {FOUNDER.nameZh}
            </div>
            <div className="text-xs text-slate">{FOUNDER.nameEn}</div>
            <div className="mt-0.5 text-xs text-slate">
              {FOUNDER.credentials}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">
            我的故事
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
            從布達佩斯到台北
          </h2>

          <div className="mt-6 space-y-5 text-sm leading-loose text-ink">
            {PERSONAL_STORY_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm text-ink">{PERSONAL_STORY_SIGNOFF.line}</p>
            <p className="mt-1 font-display text-sm font-bold text-ink">
              {PERSONAL_STORY_SIGNOFF.name}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

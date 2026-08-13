import Image from "next/image";
import Link from "next/link";
import { FOUNDER, HERO_QUOTE } from "@/lib/site-content";

export function FounderHero() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
        {/* Founder card */}
        <div className="order-2 lg:order-1">
          <div className="flex items-center gap-4">
            <Image
              src={FOUNDER.photoHero}
              alt={FOUNDER.nameZh}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
            <div>
              <div className="font-display text-lg font-bold text-ink">
                {FOUNDER.nameZh}
              </div>
              <div className="text-xs text-slate">{FOUNDER.nameEn}</div>
              <div className="mt-0.5 text-sm text-slate">{FOUNDER.credentials}</div>
            </div>
          </div>

          <blockquote className="mt-6 border-l-2 border-brand pl-4 font-display text-lg leading-relaxed text-ink">
            「{HERO_QUOTE}」
          </blockquote>

          <p className="mt-5 text-sm leading-relaxed text-slate">
            {FOUNDER.tagline}
          </p>

          <a
            href="#my-story"
            className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
          >
            閱讀完整故事 ↓
          </a>
        </div>

        {/* Headline + CTAs */}
        <div className="order-1 lg:order-2">
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            讓留學申請文書，
            <br />
            成為一起完成的作品。
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate">
            Native English Studio 是專為留學申請顧問機構打造的協作式文書平台——即時共同編輯、AI
            輔助腦力激盪與回饋、完整的學生學習檔案管理，全部整合在同一個地方。
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup/agency"
              className="rounded bg-ink px-6 py-3 text-center text-sm font-semibold text-white hover:bg-brand transition-colors"
            >
              我是機構，了解方案 →
            </Link>
            <Link
              href="/signup/individual"
              className="rounded border border-line bg-surface px-6 py-3 text-center text-sm font-semibold text-ink hover:border-brand hover:text-brand transition-colors"
            >
              我是學生／家長 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

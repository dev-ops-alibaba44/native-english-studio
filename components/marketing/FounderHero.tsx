import Image from "next/image";
import Link from "next/link";

// ============================================================================
// PLACEHOLDER CONTENT — replace once Dan sends his real bio + photo.
//
// - `photoSrc`: set to a path under /public (e.g. "/founder.jpg") once a real
//   photo exists. Until then this stays null and the initial-monogram avatar
//   below is used instead — deliberately not a fake stock photo standing in
//   for a real person.
// - `quote` / `bio`: drafted here as reasonable placeholder marketing copy so
//   the page has real layout and rhythm to review, NOT as final content.
//   Swap both directly for Dan's actual words.
// ============================================================================
const FOUNDER = {
  name: "Dan",
  title: "創辦人",
  photoSrc: null as string | null,
  quote:
    "我們想做的，是把留學申請文書這件事，從『交出去等回音』變成一起討論、一起修改的過程。",
  bio:
    "Native English Studio 是為了解決一個具體的問題而做的：學生的文書進度、顧問的回饋、跟催的時程，常常散落在 email、Line、跟不同的檔案版本裡。我們把這些整合成一個平台，讓機構、顧問、學生可以在同一個地方協作，也讓 AI 輔助的腦力激盪與回饋成為流程的一部分，而不是額外的工具。",
} as const;

export function FounderHero() {
  const initial = FOUNDER.name.slice(0, 1);

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
        {/* Founder card */}
        <div className="order-2 lg:order-1">
          <div className="flex items-center gap-4">
            {FOUNDER.photoSrc ? (
              <Image
                src={FOUNDER.photoSrc}
                alt={FOUNDER.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white"
                aria-hidden="true"
              >
                <span className="font-display">{initial}</span>
              </div>
            )}
            <div>
              <div className="font-display text-lg font-bold text-ink">
                {FOUNDER.name}
              </div>
              <div className="text-sm text-slate">{FOUNDER.title}</div>
            </div>
          </div>

          <blockquote className="mt-6 border-l-2 border-brand pl-4 font-display text-lg leading-relaxed text-ink">
            「{FOUNDER.quote}」
          </blockquote>

          <p className="mt-5 text-sm leading-relaxed text-slate">
            {FOUNDER.bio}
          </p>
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

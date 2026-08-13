import { TESTIMONIALS } from "@/lib/site-content";
import { CalligraphyMark } from "./CalligraphyMark";

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-surface py-16 sm:py-20">
      <CalligraphyMark
        char="謝"
        className="absolute -right-6 top-0 text-[220px] leading-none sm:text-[300px]"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          學生與家長的話
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          他們怎麼說
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded border border-line bg-surface p-6 shadow-card"
            >
              <blockquote className="text-sm leading-relaxed text-ink">
                「{t.quote}」
              </blockquote>
              <figcaption className="mt-4 text-xs font-semibold text-brand">
                — {t.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

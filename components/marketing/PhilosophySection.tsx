import { PHILOSOPHY_PARAGRAPHS } from "@/lib/site-content";
import { CalligraphyMark } from "./CalligraphyMark";

export function PhilosophySection() {
  return (
    <section className="relative overflow-hidden border-y border-line bg-brand-tint py-16 sm:py-20">
      <CalligraphyMark
        char="心"
        className="absolute -left-8 bottom-0 text-[240px] leading-none sm:text-[340px]"
      />

      <div className="relative mx-auto max-w-3xl px-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          我們的理念
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          陪伴，比行程表更重要
        </h2>

        <div className="mt-6 space-y-5 text-sm leading-loose text-ink">
          {PHILOSOPHY_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

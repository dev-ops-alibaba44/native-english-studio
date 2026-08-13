import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { LEGAL_DOCS, getLegalDoc } from "@/lib/legal-content";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  return { title: doc ? `${doc.title} — Native English Studio` : "Native English Studio" };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {doc.title}
        </h1>
        <p className="mt-2 text-xs text-slate">最後更新：{doc.updated}</p>

        <div className="mt-8 space-y-6">
          {doc.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="font-display text-base font-bold text-ink">
                {s.heading}
              </h2>
              <p className="mt-1.5 text-sm leading-loose text-ink">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-slate">
          如有任何問題，歡迎寄信至{" "}
          <a href="mailto:info@nativeenglish.ca" className="text-brand underline">
            info@nativeenglish.ca
          </a>
          。
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

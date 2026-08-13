import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export const metadata: Metadata = {
  title: "學生與家長候補名單 — Native English Studio",
  description: "個人與家長候補名單，開放個人使用時第一時間通知您。",
};

export default function IndividualSignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          學生 / 家長
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          加入候補名單
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Native English Studio 目前主要透過合作的留學顧問機構提供服務。如果您不透過機構、想直接為自己或孩子使用平台，請先留下聯絡方式——開放個人使用時，我們會第一時間通知您。
        </p>

        <div className="mt-8">
          <WaitlistForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

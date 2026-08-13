import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { AgencyInquiryForm } from "@/components/marketing/AgencyInquiryForm";

export const metadata: Metadata = {
  title: "機構方案洽詢 — Native English Studio",
  description: "為留學顧問機構打造的協作式文書平台，年度授權加人數計費。",
};

export default function AgencySignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          機構 / 顧問中心
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          洽詢機構方案
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          留下您的機構資訊，我們會與您聯繫，說明授權方式、計費方式，並協助安排帳號設定。目前所有機構帳號都由我們協助建置，不需要您自行操作任何技術設定。
        </p>

        <div className="mt-8">
          <AgencyInquiryForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

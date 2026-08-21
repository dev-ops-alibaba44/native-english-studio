import type { Metadata } from "next";
import Link from "next/link";
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
          留下您的機構資訊，我們會與您聯繫，說明授權方式、計費方式，並協助安排帳號設定。
        </p>

        <div className="mt-6 rounded border border-brand/30 bg-brand/5 p-5">
          <p className="text-sm text-ink font-semibold mb-1">想直接開始？</p>
          <p className="text-sm text-slate mb-3">
            也可以直接自行註冊機構帳號並完成付款，帳號會立即啟用，不需等待我們回覆。
          </p>
          <Link
            href="/signup/agency/create"
            className="inline-block rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            立即註冊機構帳號 →
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate">或者，如果您想先聊聊再決定，可以留下聯絡方式：</p>

        <div className="mt-4">
          <AgencyInquiryForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

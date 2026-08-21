import type { Metadata } from "next";
import Link from "next/link";
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
          Native English Studio 目前主要透過合作的留學顧問機構提供服務。
        </p>

        <div className="mt-6 rounded border border-brand/30 bg-brand/5 p-5">
          <p className="text-sm text-ink font-semibold mb-1">想直接開始？</p>
          <p className="text-sm text-slate mb-3">
            也可以直接註冊家長帳號，最多可以新增 3 位子女，7 天試用期或直接付款皆可。
          </p>
          <Link
            href="/signup/individual/create"
            className="inline-block rounded bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            立即註冊家長帳號 →
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate">或者，如果您想先了解更多再決定，可以留下聯絡方式：</p>

        <div className="mt-4">
          <WaitlistForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

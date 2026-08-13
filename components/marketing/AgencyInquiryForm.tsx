"use client";

import { useState } from "react";
import { submitAgencyInquiry } from "@/app/actions/public";
import {
  ESTIMATED_STUDENT_BANDS,
  isValidEmail,
} from "@/lib/public-form-validation";
import { LegalConsentCheckbox } from "./LegalConsentCheckbox";

export function AgencyInquiryForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("contact_email") as string) || "";

    // Client-side check mirrors the server action's own validation —
    // never the only line of defense, just a faster first pass.
    if (
      !(formData.get("org_name") as string)?.trim() ||
      !(formData.get("contact_name") as string)?.trim() ||
      !email.trim()
    ) {
      setError("請填寫機構名稱、聯絡人姓名與電子郵件。");
      return;
    }
    if (!isValidEmail(email)) {
      setError("請確認電子郵件格式是否正確。");
      return;
    }
    if ((formData.get("agreed_to_terms") as string) !== "yes") {
      setError("請先閱讀並勾選同意隱私權保護聲明、使用授權合約與 AI 內容免責聲明。");
      return;
    }

    setLoading(true);
    const result = await submitAgencyInquiry(formData);
    setLoading(false);

    if (!result.success) {
      setError("送出時發生問題，請稍後再試一次，或直接寄信至 info@nativeenglish.ca。");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded border border-line bg-surface p-8 text-center shadow-card">
        <h2 className="font-display text-lg font-bold text-ink">
          感謝您的洽詢
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          我們已收到您的資訊，將於 1–2 個工作天內與您聯繫。若有急件，也歡迎直接寄信至{" "}
          <a href="mailto:info@nativeenglish.ca" className="text-brand underline">
            info@nativeenglish.ca
          </a>
          。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      {/* Honeypot — hidden from real users, bots that autofill every field trip it. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="org_name">
            機構名稱 *
          </label>
          <input
            id="org_name"
            name="org_name"
            type="text"
            required
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            placeholder="例：Sunrise 教育顧問中心"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="contact_name">
            聯絡人姓名 *
          </label>
          <input
            id="contact_name"
            name="contact_name"
            type="text"
            required
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="contact_email">
            電子郵件 *
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            required
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="contact_phone">
            聯絡電話
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="city">
            所在縣市
          </label>
          <input
            id="city"
            name="city"
            type="text"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            className="block text-sm font-medium text-ink mb-1"
            htmlFor="estimated_students"
          >
            預估學生人數
          </label>
          <select
            id="estimated_students"
            name="estimated_students"
            defaultValue=""
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none bg-surface"
          >
            <option value="" disabled>
              請選擇
            </option>
            {ESTIMATED_STUDENT_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="message">
            想告訴我們的其他資訊
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            placeholder="例：目前使用哪些工具、希望什麼時候開始使用等"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5">
        <LegalConsentCheckbox />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded bg-ink py-2.5 text-sm font-semibold text-white hover:bg-brand transition-colors disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {loading ? "送出中…" : "送出洽詢"}
      </button>
    </form>
  );
}
